package intake

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestValidateProblemImportAcceptsSimpleTeacherPackage(t *testing.T) {
	wizard := ValidateProblemImport(ProblemPackage{
		SourceFilename: "two-sum.zip",
		ProblemJSON: ProblemManifest{
			Title: "Two Sum",
			Type:  ProblemTypeTraditional,
		},
		Statements: map[string]string{
			"zh-CN": "# 两数之和\n",
			"en-US": "# Two Sum\n",
		},
		Samples: []SampleCase{
			{Name: "sample-1", Input: "1 2\n", Output: "3\n"},
		},
		TestFiles: []string{"tests/001.in", "tests/001.out"},
	})

	if !wizard.Valid() {
		t.Fatalf("expected package to be valid, got %#v", wizard.Validations)
	}
	if wizard.DetectedTitle != "Two Sum" {
		t.Fatalf("unexpected title %q", wizard.DetectedTitle)
	}
	if len(wizard.NextActions) == 0 {
		t.Fatal("expected guided next actions")
	}
}

func TestValidateProblemImportReturnsFriendlyErrors(t *testing.T) {
	wizard := ValidateProblemImport(ProblemPackage{
		SourceFilename: "empty.zip",
		ProblemJSON:    ProblemManifest{},
	})

	if wizard.Valid() {
		t.Fatal("empty package should not be valid")
	}

	assertHasValidation(t, wizard, "statement.required")
	assertHasValidation(t, wizard, "sample.required")
	assertHasValidation(t, wizard, "tests.required")
}

func TestTeacherQuickUploadCreatesReviewDraftByDefault(t *testing.T) {
	service := NewService()

	draft, err := service.TeacherQuickUpload(TeacherQuickUploadInput{
		TeacherID:       "usr_teacher",
		ClassID:         "class_1",
		UploadObjectKey: "problem-intake/two-sum.zip",
		Wizard: ImportWizard{
			ImportID:      "imp_1",
			DetectedTitle: "Two Sum",
		},
	})

	if err != nil {
		t.Fatalf("TeacherQuickUpload returned error: %v", err)
	}
	if draft.OwnerUserID != "usr_teacher" {
		t.Fatalf("unexpected owner %q", draft.OwnerUserID)
	}
	if draft.Visibility != VisibilityReview {
		t.Fatalf("teacher quick upload should default to review, got %s", draft.Visibility)
	}
	stored, err := service.GetDraft(context.Background(), draft.DraftID)
	if err != nil {
		t.Fatalf("expected draft to be stored: %v", err)
	}
	if stored.DraftID != draft.DraftID {
		t.Fatalf("stored draft mismatch: %#v", stored)
	}
}

func TestStudentDraftSubmissionCreatesPrivateDraft(t *testing.T) {
	service := NewService()

	draft, err := service.StudentDraftSubmission(StudentDraftSubmissionInput{
		StudentID:       "usr_student",
		ClassID:         "class_1",
		UploadObjectKey: "problem-intake/student-idea.zip",
		NoteToReviewer:  "I wrote this for week 2 practice.",
		Wizard: ImportWizard{
			ImportID:      "imp_2",
			DetectedTitle: "Prefix Practice",
		},
	})

	if err != nil {
		t.Fatalf("StudentDraftSubmission returned error: %v", err)
	}
	if draft.OwnerUserID != "usr_student" {
		t.Fatalf("unexpected owner %q", draft.OwnerUserID)
	}
	if draft.Visibility != VisibilityPrivate {
		t.Fatalf("student drafts should be private before review, got %s", draft.Visibility)
	}
	if draft.ReviewerNote == "" {
		t.Fatal("reviewer note should be preserved")
	}
}

func TestCreatePresignedUploadUsesFriendlyProblemIntakeKey(t *testing.T) {
	signer := &recordingSigner{}
	service := NewService(WithUploadSigner(signer), WithIDGenerator(StaticIDGenerator{Value: "fixed"}))

	upload, err := service.CreatePresignedUpload(context.Background(), CreatePresignedUploadInput{
		ActorID:     "usr_teacher",
		Filename:    "Two Sum.zip",
		ContentType: "application/zip",
		SizeBytes:   32 * 1024 * 1024,
		PartCount:   2,
	})
	if err != nil {
		t.Fatalf("CreatePresignedUpload returned error: %v", err)
	}
	if !strings.HasPrefix(upload.ObjectKey, "problem-intake/usr_teacher/") {
		t.Fatalf("unexpected object key %q", upload.ObjectKey)
	}
	if !strings.Contains(upload.ObjectKey, "two-sum.zip") {
		t.Fatalf("object key should be readable, got %q", upload.ObjectKey)
	}
	if len(upload.Parts) != 2 {
		t.Fatalf("expected 2 upload parts, got %d", len(upload.Parts))
	}
	if signer.calls != 2 {
		t.Fatalf("expected signer to be called for each part, got %d", signer.calls)
	}
}

func TestCreatePresignedUploadRejectsOversizedPackage(t *testing.T) {
	service := NewService(WithUploadSigner(&recordingSigner{}))

	_, err := service.CreatePresignedUpload(context.Background(), CreatePresignedUploadInput{
		ActorID:     "usr_teacher",
		Filename:    "huge.zip",
		ContentType: "application/zip",
		SizeBytes:   MaxProblemPackageBytes + 1,
		PartCount:   1,
	})
	if err == nil {
		t.Fatal("expected oversized package error")
	}
}

func TestValidateProblemImportBuildsFriendlyWizardFromUpload(t *testing.T) {
	service := NewService(WithIDGenerator(StaticIDGenerator{Value: "fixed"}))

	wizard, err := service.ValidateProblemImport(ValidateProblemImportInput{
		ActorID:         "usr_teacher",
		UploadObjectKey: "problem-intake/usr_teacher/upload.zip",
		SourceFilename:  "Two Sum.zip",
	})
	if err != nil {
		t.Fatalf("ValidateProblemImport returned error: %v", err)
	}
	if wizard.ImportID != "imp_fixed" {
		t.Fatalf("unexpected import id %q", wizard.ImportID)
	}
	if wizard.DetectedTitle != "Two Sum" {
		t.Fatalf("unexpected title %q", wizard.DetectedTitle)
	}
	if !wizard.Valid() {
		t.Fatalf("metadata validation should not block editing: %#v", wizard.Validations)
	}
	assertHasValidation(t, wizard, "package.parser.pending")
}

func TestCreateInlineDraftRequiresTitleAndStatement(t *testing.T) {
	service := NewService()

	_, err := service.CreateInlineDraft(InlineDraftInput{
		ActorID:   "usr_student",
		Statement: "# Missing title\n",
	})
	if err == nil || !strings.Contains(err.Error(), "title") {
		t.Fatalf("expected title error, got %v", err)
	}

	_, err = service.CreateInlineDraft(InlineDraftInput{
		ActorID: "usr_student",
		Title:   "Missing statement",
	})
	if err == nil || !strings.Contains(err.Error(), "statement") {
		t.Fatalf("expected statement error, got %v", err)
	}
}

func TestCreateInlineDraftFillsDefaultsAndWritesTextTests(t *testing.T) {
	writer := &recordingTextWriter{}
	service := NewService(WithTextObjectWriter(writer), WithIDGenerator(StaticIDGenerator{Value: "fixed"}))

	draft, err := service.CreateInlineDraft(InlineDraftInput{
		ActorID:   "usr_student",
		Title:     "A + B",
		Statement: "# A + B\n",
		Samples: []SampleCase{
			{Name: "sample-1", Input: "1 2\n", Output: "3\n"},
		},
		TestCases: []InlineTestCase{
			{InputText: "1 2\n", OutputText: "3\n"},
		},
	})
	if err != nil {
		t.Fatalf("CreateInlineDraft returned error: %v", err)
	}
	if draft.DraftID != "draft_fixed" || draft.ProblemID != "prob_fixed" {
		t.Fatalf("unexpected ids %#v", draft)
	}
	if draft.Visibility != VisibilityPrivate {
		t.Fatalf("inline drafts should be private, got %s", draft.Visibility)
	}
	if !draft.Wizard.Valid() {
		t.Fatalf("inline draft should validate, got %#v", draft.Wizard.Validations)
	}
	if draft.Wizard.Statements["zh-CN"] != "# A + B\n" {
		t.Fatalf("expected default zh-CN statement, got %#v", draft.Wizard.Statements)
	}
	if len(writer.objects) != 2 {
		t.Fatalf("expected two text objects, got %#v", writer.objects)
	}
}

func TestCreateInlineDraftAcceptsObjectStorageTests(t *testing.T) {
	service := NewService(WithIDGenerator(StaticIDGenerator{Value: "fixed"}))

	draft, err := service.CreateInlineDraft(InlineDraftInput{
		ActorID:     "usr_teacher",
		Title:       "Large Data",
		TimeLimit:   2000,
		MemoryLimit: 512,
		JudgeType:   ProblemTypeInteractive,
		Locale:      "en-US",
		Statement:   "# Large Data\n",
		Samples: []SampleCase{
			{Name: "sample-1", Input: "1\n", Output: "1\n"},
		},
		TestCases: []InlineTestCase{
			{InputObjectKey: "problem-intake/usr_teacher/001.in", OutputObjectKey: "problem-intake/usr_teacher/001.out"},
		},
	})
	if err != nil {
		t.Fatalf("CreateInlineDraft returned error: %v", err)
	}
	if draft.Wizard.DetectedType != ProblemTypeInteractive {
		t.Fatalf("unexpected type %s", draft.Wizard.DetectedType)
	}
	if _, ok := draft.Wizard.Statements["en-US"]; !ok {
		t.Fatalf("expected en-US statement, got %#v", draft.Wizard.Statements)
	}
	if !draft.Wizard.Valid() {
		t.Fatalf("object-storage test draft should validate, got %#v", draft.Wizard.Validations)
	}
}

type recordingSigner struct {
	calls int
}

func (s *recordingSigner) PresignUploadPart(ctx context.Context, objectKey string, partNumber int32, expires time.Duration) (PresignedUploadPart, error) {
	s.calls++
	return PresignedUploadPart{
		PartNumber: partNumber,
		UploadURL:  "https://minio.local/" + objectKey,
		Headers: map[string]string{
			"x-rin-part": string(rune('0' + partNumber)),
		},
	}, nil
}

type recordingTextWriter struct {
	objects map[string]string
}

func (w *recordingTextWriter) PutText(ctx context.Context, objectKey string, content string) error {
	if w.objects == nil {
		w.objects = make(map[string]string)
	}
	w.objects[objectKey] = content
	return nil
}

func assertHasValidation(t *testing.T, wizard ImportWizard, code string) {
	t.Helper()
	for _, validation := range wizard.Validations {
		if validation.Code == code {
			return
		}
	}
	t.Fatalf("expected validation %q in %#v", code, wizard.Validations)
}
