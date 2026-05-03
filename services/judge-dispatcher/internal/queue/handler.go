package queue

import (
	"context"

	"github.com/hibiken/asynq"
	"github.com/rin-oj/rin-oj/services/judge-dispatcher/internal/dispatcher"
)

type Handler struct {
	dispatcher *dispatcher.Dispatcher
}

func NewHandler(dispatcher *dispatcher.Dispatcher) *Handler {
	return &Handler{dispatcher: dispatcher}
}

func (h *Handler) ProcessTask(ctx context.Context, task *asynq.Task) error {
	payload, err := DecodeJudgeTask(task.Payload())
	if err != nil {
		return err
	}
	return h.dispatcher.Dispatch(ctx, dispatcher.JudgeTask{
		SubmissionID: payload.SubmissionID,
		ProblemID:    payload.ProblemID,
		ContestID:    payload.ContestID,
		LanguageID:   payload.LanguageID,
		SourceCode:   payload.SourceCode,
	})
}
