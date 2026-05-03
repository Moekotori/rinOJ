package intake

import (
	"archive/zip"
	"bytes"
	"strings"
	"testing"
)

func TestParseProblemPackageZIPReadsCommonLayout(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"problem.json":        `{"title":"Two Sum","type":"traditional"}`,
		"statements/zh-CN.md": "# Two Sum\n",
		"samples/1.in":        "1 2\n",
		"samples/1.out":       "3\n",
		"tests/001.in":        "1 2\n",
		"tests/001.out":       "3\n",
	})

	pkg, err := ParseProblemPackageZIP("two-sum.zip", bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatalf("ParseProblemPackageZIP returned error: %v", err)
	}
	if pkg.ProblemJSON.Title != "Two Sum" {
		t.Fatalf("unexpected title %q", pkg.ProblemJSON.Title)
	}
	if pkg.Statements["zh-CN"] == "" {
		t.Fatal("expected zh-CN statement")
	}
	if len(pkg.Samples) != 1 {
		t.Fatalf("expected one sample, got %d", len(pkg.Samples))
	}
	if !ValidateProblemImport(pkg).Valid() {
		t.Fatalf("parsed package should pass wizard validation")
	}
}

func TestParseProblemPackageZIPRejectsUnsafePaths(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"../problem.json": `{"title":"Bad"}`,
	})

	_, err := ParseProblemPackageZIP("bad.zip", bytes.NewReader(data), int64(len(data)))
	if err == nil || !strings.Contains(err.Error(), "unsafe path") {
		t.Fatalf("expected unsafe path error, got %v", err)
	}
}

func buildProblemZip(t *testing.T, files map[string]string) []byte {
	t.Helper()

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for name, content := range files {
		file, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create zip entry: %v", err)
		}
		if _, err := file.Write([]byte(content)); err != nil {
			t.Fatalf("write zip entry: %v", err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip: %v", err)
	}
	return buffer.Bytes()
}
