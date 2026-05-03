package intake

import "testing"

func BenchmarkValidateProblemImport(b *testing.B) {
	pkg := ProblemPackage{
		SourceFilename: "two-sum.zip",
		ProblemJSON: ProblemManifest{
			Title: "Two Sum",
			Type:  ProblemTypeTraditional,
		},
		Statements: map[string]string{
			"zh-CN": "# 两数之和\n",
			"en-US": "# Two Sum\n",
			"ja-JP": "# Two Sum\n",
		},
		Samples: []SampleCase{
			{Name: "sample-1", Input: "1 2\n", Output: "3\n"},
			{Name: "sample-2", Input: "10 -4\n", Output: "6\n"},
		},
		TestFiles: []string{"tests/001.in", "tests/001.out", "tests/002.in", "tests/002.out"},
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		wizard := ValidateProblemImport(pkg)
		if !wizard.Valid() {
			b.Fatalf("expected valid wizard: %#v", wizard.Validations)
		}
	}
}

func BenchmarkStudentDraftSubmission(b *testing.B) {
	service := NewService()
	wizard := ImportWizard{
		ImportID:      "imp_bench",
		DetectedTitle: "Prefix Practice",
		DetectedType:  ProblemTypeTraditional,
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := service.StudentDraftSubmission(StudentDraftSubmissionInput{
			StudentID:       "usr_student",
			ClassID:         "class_1",
			UploadObjectKey: "problem-intake/student-idea.zip",
			NoteToReviewer:  "Please review.",
			Wizard:          wizard,
		})
		if err != nil {
			b.Fatal(err)
		}
	}
}
