package dispatcher

import (
	"context"
	"errors"
	"time"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

type JudgeTask struct {
	SubmissionID string
	ProblemID    string
	ContestID    string
	LanguageID   string
	SourceCode   string
}

type JudgeResult struct {
	SubmissionID  string
	Status        submissionv1.SubmissionStatus
	TestCaseIndex int32
	Message       string
	TimeMs        int64
	MemoryBytes   int64
	Final         bool
}

type JudgeProvider interface {
	Judge(ctx context.Context, task JudgeTask) (<-chan JudgeResult, error)
}

type Reporter interface {
	Report(ctx context.Context, result JudgeResult) error
}

type Dispatcher struct {
	provider JudgeProvider
	reporter Reporter
}

func New(provider JudgeProvider, reporter Reporter) *Dispatcher {
	return &Dispatcher{provider: provider, reporter: reporter}
}

func (d *Dispatcher) Dispatch(ctx context.Context, task JudgeTask) error {
	if task.SubmissionID == "" {
		return errors.New("submission id is required")
	}
	if d.provider == nil {
		return errors.New("judge provider is required")
	}
	if d.reporter == nil {
		return errors.New("submission reporter is required")
	}

	results, err := d.provider.Judge(ctx, task)
	if err != nil {
		return err
	}

	for result := range results {
		if err := d.reporter.Report(ctx, result); err != nil {
			return err
		}
		if result.Final {
			return nil
		}
	}

	return nil
}

type MockJudgeProvider struct{}

func (MockJudgeProvider) Judge(ctx context.Context, task JudgeTask) (<-chan JudgeResult, error) {
	results := make(chan JudgeResult, 2)

	go func() {
		defer close(results)
		// The mock provider behaves like a tiny deterministic judge. It lets us
		// verify queueing and streaming now, while the real go-judge adapter can
		// later replace only this boundary.
		send(ctx, results, JudgeResult{
			SubmissionID: task.SubmissionID,
			Status:       submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING,
			Message:      "mock judge running",
		})
		time.Sleep(5 * time.Millisecond)
		send(ctx, results, JudgeResult{
			SubmissionID:  task.SubmissionID,
			Status:        submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED,
			TestCaseIndex: 1,
			Message:       "mock accepted",
			TimeMs:        5,
			MemoryBytes:   1024,
			Final:         true,
		})
	}()

	return results, nil
}

func send(ctx context.Context, results chan<- JudgeResult, result JudgeResult) {
	select {
	case <-ctx.Done():
	case results <- result:
	}
}
