package dispatcher

import (
	"context"
	"testing"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

func TestDispatchReportsRunningAndAccepted(t *testing.T) {
	reporter := &recordingReporter{}
	dispatcher := New(MockJudgeProvider{}, reporter)

	err := dispatcher.Dispatch(context.Background(), JudgeTask{
		SubmissionID: "sub_1",
		ProblemID:    "prob_1",
		LanguageID:   "cpp17",
		SourceCode:   "int main(){return 0;}",
	})
	if err != nil {
		t.Fatalf("Dispatch returned error: %v", err)
	}
	if len(reporter.results) != 2 {
		t.Fatalf("expected 2 reports, got %d", len(reporter.results))
	}
	if reporter.results[0].Status != submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING {
		t.Fatalf("first report should be running, got %s", reporter.results[0].Status)
	}
	if !reporter.results[1].Final || reporter.results[1].Status != submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED {
		t.Fatalf("final report should be accepted, got %#v", reporter.results[1])
	}
}

type recordingReporter struct {
	results []JudgeResult
}

func (r *recordingReporter) Report(ctx context.Context, result JudgeResult) error {
	r.results = append(r.results, result)
	return nil
}
