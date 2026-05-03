package app

import (
	"context"
	"testing"
	"time"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

func TestCreateSubmissionQueuesAndPublishesQueuedEvent(t *testing.T) {
	enqueuer := &recordingEnqueuer{}
	service := NewService(NewMemoryRepository(), NewHub(), enqueuer, StaticIDGenerator{Prefix: "test"})

	submission, err := service.CreateSubmission(context.Background(), CreateSubmissionCommand{
		ActorID:    "usr_1",
		ProblemID:  "prob_1",
		LanguageID: "cpp17",
		SourceCode: "#include <iostream>\nint main(){std::cout<<42;}\n",
	})

	if err != nil {
		t.Fatalf("CreateSubmission returned error: %v", err)
	}
	if submission.Status != submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED {
		t.Fatalf("expected queued status, got %s", submission.Status)
	}
	if len(enqueuer.tasks) != 1 {
		t.Fatalf("expected one judge task, got %d", len(enqueuer.tasks))
	}
	if enqueuer.tasks[0].SubmissionID != submission.SubmissionId {
		t.Fatalf("queued task should reference submission %q, got %q", submission.SubmissionId, enqueuer.tasks[0].SubmissionID)
	}
}

func TestReportJudgeResultUpdatesAndBroadcastsFinalStatus(t *testing.T) {
	service := NewService(NewMemoryRepository(), NewHub(), &recordingEnqueuer{}, StaticIDGenerator{Prefix: "test"})
	submission, err := service.CreateSubmission(context.Background(), CreateSubmissionCommand{
		ActorID:    "usr_1",
		ProblemID:  "prob_1",
		LanguageID: "cpp17",
		SourceCode: "int main(){return 0;}",
	})
	if err != nil {
		t.Fatal(err)
	}

	events, unsubscribe := service.Subscribe(submission.SubmissionId)
	defer unsubscribe()
	expectEventStatus(t, events, submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED)

	updated, err := service.ReportJudgeResult(context.Background(), JudgeResult{
		SubmissionID:  submission.SubmissionId,
		Status:        submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED,
		TestCaseIndex: 1,
		Message:       "accepted",
		TimeMs:        8,
		MemoryBytes:   1024,
		Final:         true,
	})
	if err != nil {
		t.Fatalf("ReportJudgeResult returned error: %v", err)
	}
	if updated.Status != submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED {
		t.Fatalf("expected accepted status, got %s", updated.Status)
	}

	event := expectEventStatus(t, events, submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED)
	if !event.Final {
		t.Fatalf("expected final event, got %#v", event)
	}
}

func TestSubscribeReplaysLatestEventToLateSubscriber(t *testing.T) {
	service := NewService(NewMemoryRepository(), NewHub(), &recordingEnqueuer{}, StaticIDGenerator{Prefix: "test"})
	submission, err := service.CreateSubmission(context.Background(), CreateSubmissionCommand{
		ActorID:    "usr_1",
		ProblemID:  "prob_1",
		LanguageID: "cpp17",
		SourceCode: "int main(){return 0;}",
	})
	if err != nil {
		t.Fatal(err)
	}

	events, unsubscribe := service.Subscribe(submission.SubmissionId)
	defer unsubscribe()

	expectEventStatus(t, events, submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED)
}

func TestListSubmissionsUsesCursorPagination(t *testing.T) {
	repo := NewMemoryRepository()
	service := NewService(repo, NewHub(), nil, StaticIDGenerator{Prefix: "test"})
	ctx := context.Background()

	for _, submission := range []*submissionv1.Submission{
		{SubmissionId: "sub_old", ActorId: "usr_1", ProblemId: "prob_1", LanguageId: "cpp17", Status: submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED, CreatedAtUnix: 10},
		{SubmissionId: "sub_middle", ActorId: "usr_1", ProblemId: "prob_1", LanguageId: "go", Status: submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING, CreatedAtUnix: 20},
		{SubmissionId: "sub_new", ActorId: "usr_1", ProblemId: "prob_2", LanguageId: "rust", Status: submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED, CreatedAtUnix: 30},
	} {
		if err := repo.Save(ctx, submission); err != nil {
			t.Fatalf("save fixture: %v", err)
		}
	}

	firstPage, err := service.ListSubmissions(ctx, ListSubmissionsQuery{
		ActorID:  "usr_1",
		PageSize: 2,
	})
	if err != nil {
		t.Fatalf("list first page: %v", err)
	}
	if got := submissionIDs(firstPage.Submissions); got != "sub_new,sub_middle" {
		t.Fatalf("unexpected first page: %s", got)
	}
	if firstPage.NextCursor == "" {
		t.Fatal("expected next cursor")
	}

	secondPage, err := service.ListSubmissions(ctx, ListSubmissionsQuery{
		ActorID:  "usr_1",
		PageSize: 2,
		Cursor:   firstPage.NextCursor,
	})
	if err != nil {
		t.Fatalf("list second page: %v", err)
	}
	if got := submissionIDs(secondPage.Submissions); got != "sub_old" {
		t.Fatalf("unexpected second page: %s", got)
	}
	if secondPage.NextCursor != "" {
		t.Fatalf("did not expect next cursor, got %q", secondPage.NextCursor)
	}
}

func expectEventStatus(t *testing.T, events <-chan *submissionv1.SubmissionEvent, status submissionv1.SubmissionStatus) *submissionv1.SubmissionEvent {
	t.Helper()

	select {
	case event := <-events:
		if event.Status != status {
			t.Fatalf("expected %s event, got %s", status, event.Status)
		}
		return event
	case <-time.After(time.Second):
		t.Fatalf("timed out waiting for %s event", status)
		return nil
	}
}

func submissionIDs(submissions []*submissionv1.Submission) string {
	ids := ""
	for index, submission := range submissions {
		if index > 0 {
			ids += ","
		}
		ids += submission.GetSubmissionId()
	}
	return ids
}

type recordingEnqueuer struct {
	tasks []JudgeTask
}

func (e *recordingEnqueuer) EnqueueJudgeSubmission(ctx context.Context, task JudgeTask) error {
	e.tasks = append(e.tasks, task)
	return nil
}
