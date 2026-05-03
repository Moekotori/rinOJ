package queue

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/app"
)

type AsynqEnqueuer struct {
	client *asynq.Client
}

func NewAsynqEnqueuer(client *asynq.Client) *AsynqEnqueuer {
	return &AsynqEnqueuer{client: client}
}

func (e *AsynqEnqueuer) EnqueueJudgeSubmission(ctx context.Context, task app.JudgeTask) error {
	payload, err := EncodeJudgeTask(JudgeTaskPayload{
		SubmissionID: task.SubmissionID,
		ProblemID:    task.ProblemID,
		ContestID:    task.ContestID,
		LanguageID:   task.LanguageID,
		SourceCode:   task.SourceCode,
	})
	if err != nil {
		return err
	}

	// Judge jobs use their own queue so slow compiles cannot starve email,
	// webhook, or future background jobs.
	asynqTask := asynq.NewTask(JudgeSubmitTaskType, payload, asynq.Queue("judge"))
	_, err = e.client.EnqueueContext(ctx, asynqTask)
	return err
}
