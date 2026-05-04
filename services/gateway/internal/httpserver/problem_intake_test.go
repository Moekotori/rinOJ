package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
)

func TestCreateProblemIntakeUploadRoute(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"filename":"Two Sum.zip","contentType":"application/zip","sizeBytes":1048576,"partCount":2}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/uploads", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_teacher")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastUpload.GetActorId() != "usr_teacher" {
		t.Fatalf("actor id should come from request header, got %q", fake.lastUpload.GetActorId())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["objectKey"] != "problem-intake/usr_teacher/upload.zip" {
		t.Fatalf("unexpected response %#v", payload)
	}
}

func TestTeacherQuickUploadRoute(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"classId":"class_1","uploadObjectKey":"problem-intake/usr_teacher/upload.zip","requestAdminReview":true}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/teacher-quick-upload", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_teacher")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastTeacher.GetTeacherId() != "usr_teacher" {
		t.Fatalf("teacher id should come from request header, got %q", fake.lastTeacher.GetTeacherId())
	}
}

func TestStudentDraftSubmissionRoute(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"classId":"class_1","uploadObjectKey":"problem-intake/usr_student/upload.zip","noteToReviewer":"please review"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/student-drafts", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_student")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastStudent.GetStudentId() != "usr_student" {
		t.Fatalf("student id should come from request header, got %q", fake.lastStudent.GetStudentId())
	}
}

func TestValidateProblemImportRoute(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"uploadObjectKey":"problem-intake/usr_teacher/upload.zip","sourceFilename":"Two Sum.zip"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/imports:validate", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_teacher")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastValidate.GetActorId() != "usr_teacher" {
		t.Fatalf("actor id should come from request header, got %q", fake.lastValidate.GetActorId())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["detectedTitle"] != "Two Sum" {
		t.Fatalf("unexpected response %#v", payload)
	}
}

func TestValidateProblemImportRouteForwardsFlatMetadata(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"uploadObjectKey":"problem-intake/usr_teacher/flat.zip","sourceFilename":"flat.zip","flatMetadata":{"title":"A + B","timeLimit":2000,"memoryLimit":512,"judgeType":"special_judge"}}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/imports:validate", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_teacher")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastValidate.GetFlatMetadata().GetTitle() != "A + B" {
		t.Fatalf("flat metadata was not forwarded: %#v", fake.lastValidate.GetFlatMetadata())
	}
	if fake.lastValidate.GetFlatMetadata().GetTimeLimit() != 2000 {
		t.Fatalf("unexpected flat time limit %d", fake.lastValidate.GetFlatMetadata().GetTimeLimit())
	}
}

func TestCreateInlineDraftRoute(t *testing.T) {
	fake := &fakeProblemClient{}
	server := New(ServerConfig{
		ServiceName:   "gateway",
		Version:       "test",
		ProblemClient: fake,
	})

	body := bytes.NewBufferString(`{"title":"A + B","timeLimit":1000,"memoryLimit":256,"judgeType":"traditional","locale":"zh-CN","statement":"# A + B\n","samples":[{"input":"1 2\n","output":"3\n"}],"testCases":[{"inputText":"1 2\n","outputObjectKey":"problem-intake/out"}],"classId":"class_1","noteToReviewer":"please review"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/problem-intake/inline-draft", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_student")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastInline.GetActorId() != "usr_student" {
		t.Fatalf("actor id should come from request header, got %q", fake.lastInline.GetActorId())
	}
	if fake.lastInline.GetTitle() != "A + B" || len(fake.lastInline.GetTestCases()) != 1 {
		t.Fatalf("unexpected inline request %#v", fake.lastInline)
	}
}

type fakeProblemClient struct {
	lastUpload   *problemv1.CreatePresignedUploadRequest
	lastTeacher  *problemv1.TeacherQuickUploadRequest
	lastStudent  *problemv1.StudentDraftSubmissionRequest
	lastValidate *problemv1.ValidateProblemImportRequest
	lastInline   *problemv1.CreateInlineDraftRequest
}

func (f *fakeProblemClient) CreatePresignedUpload(ctx context.Context, req *problemv1.CreatePresignedUploadRequest) (*problemv1.CreatePresignedUploadResponse, error) {
	f.lastUpload = req
	return &problemv1.CreatePresignedUploadResponse{
		ObjectKey: "problem-intake/usr_teacher/upload.zip",
		Parts: []*problemv1.PresignedUploadPart{
			{PartNumber: 1, UploadUrl: "https://minio.local/part-1"},
			{PartNumber: 2, UploadUrl: "https://minio.local/part-2"},
		},
		ExpiresAtUnix: 1893456000,
	}, nil
}

func (f *fakeProblemClient) TeacherQuickUpload(ctx context.Context, req *problemv1.TeacherQuickUploadRequest) (*problemv1.ProblemDraft, error) {
	f.lastTeacher = req
	return &problemv1.ProblemDraft{
		DraftId:     "draft_teacher",
		ProblemId:   "prob_1",
		OwnerUserId: req.GetTeacherId(),
		Visibility:  problemv1.ProblemVisibility_PROBLEM_VISIBILITY_REVIEW,
	}, nil
}

func (f *fakeProblemClient) StudentDraftSubmission(ctx context.Context, req *problemv1.StudentDraftSubmissionRequest) (*problemv1.ProblemDraft, error) {
	f.lastStudent = req
	return &problemv1.ProblemDraft{
		DraftId:     "draft_student",
		OwnerUserId: req.GetStudentId(),
		Visibility:  problemv1.ProblemVisibility_PROBLEM_VISIBILITY_PRIVATE,
	}, nil
}

func (f *fakeProblemClient) ValidateProblemImport(ctx context.Context, req *problemv1.ValidateProblemImportRequest) (*problemv1.ImportWizard, error) {
	f.lastValidate = req
	return &problemv1.ImportWizard{
		ImportId:      "imp_1",
		DetectedTitle: "Two Sum",
		DetectedType:  problemv1.ProblemType_PROBLEM_TYPE_TRADITIONAL,
		Validations: []*problemv1.ImportValidation{
			{Code: "package.parser.pending", Severity: "warning", Message: "parser pending"},
		},
		NextActions: []string{"preview_statement"},
	}, nil
}

func (f *fakeProblemClient) CreateInlineDraft(ctx context.Context, req *problemv1.CreateInlineDraftRequest) (*problemv1.CreateInlineDraftResponse, error) {
	f.lastInline = req
	return &problemv1.CreateInlineDraftResponse{
		DraftId:    "draft_inline",
		ProblemId:  "prob_inline",
		Visibility: "private",
	}, nil
}
