package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

func TestCreateSubmissionRoute(t *testing.T) {
	fake := &fakeSubmissionClient{}
	server := New(ServerConfig{
		ServiceName:      "gateway",
		Version:          "test",
		SubmissionClient: fake,
	})

	body := bytes.NewBufferString(`{"problemId":"prob_1","languageId":"cpp17","sourceCode":"int main(){return 0;}"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/submissions", body)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", "usr_1")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Fatalf("expected 202, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastCreate.GetActorId() != "usr_1" {
		t.Fatalf("actor id should come from request context, got %q", fake.lastCreate.GetActorId())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["submissionId"] != "sub_1" {
		t.Fatalf("unexpected response payload %#v", payload)
	}
}

func TestGetSubmissionRoute(t *testing.T) {
	server := New(ServerConfig{
		ServiceName: "gateway",
		Version:     "test",
		SubmissionClient: &fakeSubmissionClient{
			submission: &submissionv1.Submission{
				SubmissionId: "sub_1",
				ProblemId:    "prob_1",
				LanguageId:   "cpp17",
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED,
			},
		},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/submissions/sub_1", nil)
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestListSubmissionsRoute(t *testing.T) {
	fake := &fakeSubmissionClient{}
	server := New(ServerConfig{
		ServiceName:      "gateway",
		Version:          "test",
		SubmissionClient: fake,
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/submissions?actorId=usr_1&pageSize=2", nil)
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if fake.lastList.GetActorId() != "usr_1" {
		t.Fatalf("expected actor filter usr_1, got %q", fake.lastList.GetActorId())
	}
	if fake.lastList.GetPageSize() != 2 {
		t.Fatalf("expected page size 2, got %d", fake.lastList.GetPageSize())
	}

	var payload map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if payload["nextCursor"] != "next" {
		t.Fatalf("unexpected list payload %#v", payload)
	}
}

type fakeSubmissionClient struct {
	lastCreate *submissionv1.CreateSubmissionRequest
	lastList   *submissionv1.ListSubmissionsRequest
	submission *submissionv1.Submission
}

func (f *fakeSubmissionClient) CreateSubmission(ctx context.Context, req *submissionv1.CreateSubmissionRequest) (*submissionv1.Submission, error) {
	f.lastCreate = req
	return &submissionv1.Submission{
		SubmissionId: "sub_1",
		ActorId:      req.GetActorId(),
		ProblemId:    req.GetProblemId(),
		LanguageId:   req.GetLanguageId(),
		Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED,
	}, nil
}

func (f *fakeSubmissionClient) GetSubmission(ctx context.Context, req *submissionv1.GetSubmissionRequest) (*submissionv1.Submission, error) {
	if f.submission != nil {
		return f.submission, nil
	}
	return &submissionv1.Submission{SubmissionId: req.GetSubmissionId()}, nil
}

func (f *fakeSubmissionClient) ListSubmissions(ctx context.Context, req *submissionv1.ListSubmissionsRequest) (*submissionv1.ListSubmissionsResponse, error) {
	f.lastList = req
	return &submissionv1.ListSubmissionsResponse{
		Submissions: []*submissionv1.Submission{
			{
				SubmissionId: "sub_1",
				ActorId:      req.GetActorId(),
				ProblemId:    "prob_1",
				LanguageId:   "cpp17",
				Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED,
			},
		},
		NextCursor: "next",
	}, nil
}

func (f *fakeSubmissionClient) StreamSubmission(ctx context.Context, req *submissionv1.StreamSubmissionRequest) (SubmissionEventStream, error) {
	return &sliceEventStream{}, nil
}

type sliceEventStream struct{}

func (s *sliceEventStream) Recv() (*submissionv1.SubmissionEvent, error) {
	return nil, context.Canceled
}
