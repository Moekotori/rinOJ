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

func TestParseFlatProblemPackageZIPReadsRootStatementAndPairs(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"statement.md": "# A + B\n",
		"2.in":         "2 3\n",
		"2.out":        "5\n",
		"1.in":         "1 2\n",
		"1.out":        "3\n",
	})

	pkg, err := ParseFlatProblemPackageZIP("flat.zip", bytes.NewReader(data), int64(len(data)), FlatZIPMetadata{
		Title:       "A + B",
		TimeLimit:   2000,
		MemoryLimit: 512,
		JudgeType:   ProblemTypeSpecialJudge,
	})
	if err != nil {
		t.Fatalf("ParseFlatProblemPackageZIP returned error: %v", err)
	}
	if pkg.ProblemJSON.Title != "A + B" {
		t.Fatalf("unexpected title %q", pkg.ProblemJSON.Title)
	}
	if pkg.ProblemJSON.TimeLimit != 2000 || pkg.ProblemJSON.MemoryLimit != 512 {
		t.Fatalf("unexpected limits %#v", pkg.ProblemJSON)
	}
	if pkg.ProblemJSON.Type != ProblemTypeSpecialJudge {
		t.Fatalf("unexpected problem type %q", pkg.ProblemJSON.Type)
	}
	if pkg.Statements["zh-CN"] != "# A + B\n" {
		t.Fatalf("unexpected statement %q", pkg.Statements["zh-CN"])
	}
	expected := []string{"1.in", "1.out", "2.in", "2.out"}
	if strings.Join(pkg.TestFiles, ",") != strings.Join(expected, ",") {
		t.Fatalf("unexpected test files %#v", pkg.TestFiles)
	}
}

func TestParseFlatProblemPackageZIPRequiresStatement(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"1.in":  "1 2\n",
		"1.out": "3\n",
	})

	_, err := ParseFlatProblemPackageZIP("flat.zip", bytes.NewReader(data), int64(len(data)), FlatZIPMetadata{Title: "A + B"})
	if err == nil || !strings.Contains(err.Error(), "statement.md") {
		t.Fatalf("expected statement.md error, got %v", err)
	}
}

func TestParseFlatProblemPackageZIPSkipsSubdirectories(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"statement.md": "# A + B\n",
		"1.in":         "1 2\n",
		"1.out":        "3\n",
		"nested/2.in":  "2 3\n",
		"nested/2.out": "5\n",
	})

	pkg, err := ParseFlatProblemPackageZIP("flat.zip", bytes.NewReader(data), int64(len(data)), FlatZIPMetadata{Title: "A + B"})
	if err != nil {
		t.Fatalf("ParseFlatProblemPackageZIP returned error: %v", err)
	}
	expected := []string{"1.in", "1.out"}
	if strings.Join(pkg.TestFiles, ",") != strings.Join(expected, ",") {
		t.Fatalf("unexpected test files %#v", pkg.TestFiles)
	}
}

func TestParseFlatProblemPackageZIPDefersStructuredPackages(t *testing.T) {
	data := buildProblemZip(t, map[string]string{
		"problem.json":        `{"title":"Structured","type":"traditional"}`,
		"statement.md":        "# ignored by structured parser\n",
		"statements/zh-CN.md": "# Structured\n",
		"samples/1.in":        "1 2\n",
		"samples/1.out":       "3\n",
		"tests/001.in":        "1 2\n",
		"tests/001.out":       "3\n",
	})

	pkg, err := ParseFlatProblemPackageZIP("structured.zip", bytes.NewReader(data), int64(len(data)), FlatZIPMetadata{Title: "Flat Title"})
	if err != nil {
		t.Fatalf("ParseFlatProblemPackageZIP returned error: %v", err)
	}
	if pkg.ProblemJSON.Title != "Structured" {
		t.Fatalf("structured problem.json should win, got %q", pkg.ProblemJSON.Title)
	}
	if _, ok := pkg.Statements["zh-CN"]; !ok {
		t.Fatal("expected structured statement")
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
