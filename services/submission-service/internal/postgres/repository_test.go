package postgres

import (
	"context"
	"os"
	"testing"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

func TestStatusMappingRoundTrip(t *testing.T) {
	statuses := []submissionv1.SubmissionStatus{
		submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED,
		submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING,
		submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED,
		submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR,
	}

	for _, status := range statuses {
		text, err := statusToDB(status)
		if err != nil {
			t.Fatalf("statusToDB(%s): %v", status, err)
		}
		roundTrip, err := statusFromDB(text)
		if err != nil {
			t.Fatalf("statusFromDB(%q): %v", text, err)
		}
		if roundTrip != status {
			t.Fatalf("round trip mismatch: got %s want %s", roundTrip, status)
		}
	}
}

func TestRepositoryIntegration(t *testing.T) {
	dsn := os.Getenv("RIN_TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Skip("set RIN_TEST_POSTGRES_DSN to run PostgreSQL integration test")
	}

	repo, err := Open(context.Background(), dsn)
	if err != nil {
		t.Fatalf("open repository: %v", err)
	}
	defer repo.Close()

	submission := &submissionv1.Submission{
		SubmissionId:  "sub_integration_1",
		ActorId:       "usr_1",
		ProblemId:     "prob_1",
		LanguageId:    "cpp17",
		Status:        submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED,
		CreatedAtUnix: 1893456000,
	}
	if err := repo.Save(context.Background(), submission); err != nil {
		t.Fatalf("save: %v", err)
	}

	updated, err := repo.UpdateStatus(context.Background(), submission.SubmissionId, submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED)
	if err != nil {
		t.Fatalf("update status: %v", err)
	}
	if updated.Status != submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED {
		t.Fatalf("unexpected status %s", updated.Status)
	}
}
