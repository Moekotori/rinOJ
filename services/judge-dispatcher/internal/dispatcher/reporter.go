package dispatcher

import (
	"context"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

type SubmissionReporter struct {
	client submissionv1.SubmissionServiceClient
}

func NewSubmissionReporter(client submissionv1.SubmissionServiceClient) *SubmissionReporter {
	return &SubmissionReporter{client: client}
}

func (r *SubmissionReporter) Report(ctx context.Context, result JudgeResult) error {
	_, err := r.client.ReportJudgeResult(ctx, &submissionv1.ReportJudgeResultRequest{
		SubmissionId:  result.SubmissionID,
		Status:        result.Status,
		TestCaseIndex: result.TestCaseIndex,
		Message:       result.Message,
		TimeMs:        result.TimeMs,
		MemoryBytes:   result.MemoryBytes,
		Final:         result.Final,
	})
	return err
}
