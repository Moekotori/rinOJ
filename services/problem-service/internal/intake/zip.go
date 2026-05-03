package intake

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path"
	"sort"
	"strings"
)

const maxImportPreviewFileBytes uint64 = 4 * 1024 * 1024

func ParseProblemPackageZIP(sourceFilename string, reader io.ReaderAt, size int64) (ProblemPackage, error) {
	if size <= 0 {
		return ProblemPackage{}, errors.New("zip package is empty")
	}

	archive, err := zip.NewReader(reader, size)
	if err != nil {
		return ProblemPackage{}, err
	}

	pkg := ProblemPackage{
		SourceFilename: sourceFilename,
		Statements:     make(map[string]string),
	}
	samples := make(map[string]*sampleParts)

	for _, file := range archive.File {
		name, err := safeZipPath(file.Name)
		if err != nil {
			return ProblemPackage{}, err
		}
		if file.FileInfo().IsDir() {
			continue
		}

		switch {
		case name == "problem.json":
			content, err := readZipText(file)
			if err != nil {
				return ProblemPackage{}, err
			}
			if err := json.Unmarshal([]byte(content), &pkg.ProblemJSON); err != nil {
				return ProblemPackage{}, fmt.Errorf("parse problem.json: %w", err)
			}
		case strings.HasPrefix(name, "statements/") && strings.HasSuffix(name, ".md"):
			locale := strings.TrimSuffix(strings.TrimPrefix(name, "statements/"), ".md")
			content, err := readZipText(file)
			if err != nil {
				return ProblemPackage{}, err
			}
			pkg.Statements[locale] = content
		case strings.HasPrefix(name, "samples/"):
			sampleName, kind := splitDataFile(strings.TrimPrefix(name, "samples/"))
			if kind == "" {
				continue
			}
			content, err := readZipText(file)
			if err != nil {
				return ProblemPackage{}, err
			}
			part := samples[sampleName]
			if part == nil {
				part = &sampleParts{name: sampleName}
				samples[sampleName] = part
			}
			if kind == "input" {
				part.input = content
			} else {
				part.output = content
			}
		case strings.HasPrefix(name, "tests/"):
			if _, kind := splitDataFile(strings.TrimPrefix(name, "tests/")); kind != "" {
				pkg.TestFiles = append(pkg.TestFiles, name)
			}
		}
	}

	pkg.Samples = sampleCases(samples)
	sort.Strings(pkg.TestFiles)
	return pkg, nil
}

type sampleParts struct {
	name   string
	input  string
	output string
}

func safeZipPath(name string) (string, error) {
	normalized := strings.ReplaceAll(name, "\\", "/")
	cleaned := path.Clean(normalized)
	if cleaned == "." || cleaned == ".." || path.IsAbs(cleaned) || strings.HasPrefix(cleaned, "../") {
		return "", fmt.Errorf("unsafe path in problem package: %s", name)
	}
	return cleaned, nil
}

func readZipText(file *zip.File) (string, error) {
	if file.UncompressedSize64 > maxImportPreviewFileBytes {
		return "", fmt.Errorf("zip entry too large for preview: %s", file.Name)
	}

	reader, err := file.Open()
	if err != nil {
		return "", err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}
	return string(content), nil
}

func splitDataFile(name string) (string, string) {
	lower := strings.ToLower(name)
	switch {
	case strings.HasSuffix(lower, ".in"):
		return strings.TrimSuffix(name, path.Ext(name)), "input"
	case strings.HasSuffix(lower, ".out"), strings.HasSuffix(lower, ".ans"):
		return strings.TrimSuffix(name, path.Ext(name)), "output"
	default:
		return "", ""
	}
}

func sampleCases(samples map[string]*sampleParts) []SampleCase {
	names := make([]string, 0, len(samples))
	for name, sample := range samples {
		if sample.input != "" && sample.output != "" {
			names = append(names, name)
		}
	}
	sort.Strings(names)

	result := make([]SampleCase, 0, len(names))
	for _, name := range names {
		sample := samples[name]
		result = append(result, SampleCase{
			Name:   name,
			Input:  sample.input,
			Output: sample.output,
		})
	}
	return result
}
