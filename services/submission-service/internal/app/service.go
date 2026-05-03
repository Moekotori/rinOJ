package app

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

type IDGenerator interface {
	NewID(prefix string) string
}

type StaticIDGenerator struct {
	Prefix string
}

func (g StaticIDGenerator) NewID(prefix string) string {
	base := g.Prefix
	if base == "" {
		base = prefix
	}
	return fmt.Sprintf("%s_%s_%d", base, prefix, time.Now().UnixNano())
}

type Enqueuer interface {
	EnqueueJudgeSubmission(ctx context.Context, task JudgeTask) error
}

type JudgeTask struct {
	SubmissionID string
	ProblemID    string
	ContestID    string
	LanguageID   string
	SourceCode   string
}

type CreateSubmissionCommand struct {
	ActorID    string
	ProblemID  string
	ContestID  string
	LanguageID string
	SourceCode string
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

type ListSubmissionsQuery struct {
	Cursor    string
	PageSize  int32
	ActorID   string
	ProblemID string
	ContestID string
}

type ListSubmissionsResult struct {
	Submissions []*submissionv1.Submission
	NextCursor  string
}

type Service struct {
	repository Repository
	hub        *Hub
	enqueuer   Enqueuer
	ids        IDGenerator
}

type Repository interface {
	Save(ctx context.Context, submission *submissionv1.Submission) error
	Get(ctx context.Context, id string) (*submissionv1.Submission, error)
	UpdateStatus(ctx context.Context, id string, status submissionv1.SubmissionStatus) (*submissionv1.Submission, error)
	ListSubmissions(ctx context.Context, query ListSubmissionsQuery) (ListSubmissionsResult, error)
}

func NewService(repository Repository, hub *Hub, enqueuer Enqueuer, ids IDGenerator) *Service {
	if repository == nil {
		repository = NewMemoryRepository()
	}
	if hub == nil {
		hub = NewHub()
	}
	if ids == nil {
		ids = StaticIDGenerator{}
	}
	return &Service{
		repository: repository,
		hub:        hub,
		enqueuer:   enqueuer,
		ids:        ids,
	}
}

func (s *Service) CreateSubmission(ctx context.Context, command CreateSubmissionCommand) (*submissionv1.Submission, error) {
	if command.ActorID == "" {
		return nil, errors.New("actor id is required")
	}
	if command.ProblemID == "" {
		return nil, errors.New("problem id is required")
	}
	if command.LanguageID == "" {
		return nil, errors.New("language id is required")
	}
	if command.SourceCode == "" {
		return nil, errors.New("source code is required")
	}

	submission := &submissionv1.Submission{
		SubmissionId:  s.ids.NewID("sub"),
		ActorId:       command.ActorID,
		ProblemId:     command.ProblemID,
		ContestId:     command.ContestID,
		LanguageId:    command.LanguageID,
		Status:        submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED,
		CreatedAtUnix: time.Now().Unix(),
	}

	if err := s.repository.Save(ctx, submission); err != nil {
		return nil, err
	}

	// Broadcast before enqueueing so very fast workers cannot finish before a
	// subscriber has a chance to observe the initial queued state.
	s.hub.Publish(submission.SubmissionId, &submissionv1.SubmissionEvent{
		SubmissionId: submission.SubmissionId,
		Status:       submission.Status,
		Message:      "queued",
		Final:        false,
	})

	if s.enqueuer != nil {
		if err := s.enqueuer.EnqueueJudgeSubmission(ctx, JudgeTask{
			SubmissionID: submission.SubmissionId,
			ProblemID:    command.ProblemID,
			ContestID:    command.ContestID,
			LanguageID:   command.LanguageID,
			SourceCode:   command.SourceCode,
		}); err != nil {
			_, _ = s.repository.UpdateStatus(ctx, submission.SubmissionId, submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR)
			return nil, err
		}
	}

	return cloneSubmission(submission), nil
}

func (s *Service) GetSubmission(id string) (*submissionv1.Submission, error) {
	return s.repository.Get(context.Background(), id)
}

func (s *Service) ListSubmissions(ctx context.Context, query ListSubmissionsQuery) (ListSubmissionsResult, error) {
	query.PageSize = normalizePageSize(query.PageSize)
	return s.repository.ListSubmissions(ctx, query)
}

func (s *Service) ReportJudgeResult(ctx context.Context, result JudgeResult) (*submissionv1.Submission, error) {
	if result.SubmissionID == "" {
		return nil, errors.New("submission id is required")
	}
	if result.Status == submissionv1.SubmissionStatus_SUBMISSION_STATUS_UNSPECIFIED {
		return nil, errors.New("judge status is required")
	}

	updated, err := s.repository.UpdateStatus(ctx, result.SubmissionID, result.Status)
	if err != nil {
		return nil, err
	}

	// The hub is in-memory for now, but the boundary is intentionally explicit:
	// PostgreSQL persistence, Redis Pub/Sub, and WebSocket fanout can evolve
	// without changing the domain status transition.
	s.hub.Publish(result.SubmissionID, &submissionv1.SubmissionEvent{
		SubmissionId:  result.SubmissionID,
		Status:        result.Status,
		TestCaseIndex: result.TestCaseIndex,
		Message:       result.Message,
		TimeMs:        result.TimeMs,
		MemoryBytes:   result.MemoryBytes,
		Final:         result.Final,
	})

	return updated, nil
}

func (s *Service) Subscribe(submissionID string) (<-chan *submissionv1.SubmissionEvent, func()) {
	return s.hub.Subscribe(submissionID)
}

type MemoryRepository struct {
	mu          sync.RWMutex
	submissions map[string]*submissionv1.Submission
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{submissions: make(map[string]*submissionv1.Submission)}
}

func (r *MemoryRepository) Save(ctx context.Context, submission *submissionv1.Submission) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.submissions[submission.SubmissionId] = cloneSubmission(submission)
	return nil
}

func (r *MemoryRepository) Get(ctx context.Context, id string) (*submissionv1.Submission, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	submission, ok := r.submissions[id]
	if !ok {
		return nil, errors.New("submission not found")
	}
	return cloneSubmission(submission), nil
}

func (r *MemoryRepository) UpdateStatus(ctx context.Context, id string, status submissionv1.SubmissionStatus) (*submissionv1.Submission, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	submission, ok := r.submissions[id]
	if !ok {
		return nil, errors.New("submission not found")
	}
	submission.Status = status
	if status == submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED {
		submission.Score = 100
	}
	return cloneSubmission(submission), nil
}

func (r *MemoryRepository) ListSubmissions(ctx context.Context, query ListSubmissionsQuery) (ListSubmissionsResult, error) {
	cursor, err := DecodeSubmissionCursor(query.Cursor)
	if err != nil {
		return ListSubmissionsResult{}, err
	}

	r.mu.RLock()
	candidates := make([]*submissionv1.Submission, 0, len(r.submissions))
	for _, submission := range r.submissions {
		if query.ActorID != "" && submission.GetActorId() != query.ActorID {
			continue
		}
		if query.ProblemID != "" && submission.GetProblemId() != query.ProblemID {
			continue
		}
		if query.ContestID != "" && submission.GetContestId() != query.ContestID {
			continue
		}
		if !submissionAfterCursor(submission, cursor) {
			continue
		}
		candidates = append(candidates, cloneSubmission(submission))
	}
	r.mu.RUnlock()

	sort.Slice(candidates, func(i, j int) bool {
		left := candidates[i]
		right := candidates[j]
		if left.GetCreatedAtUnix() == right.GetCreatedAtUnix() {
			return left.GetSubmissionId() > right.GetSubmissionId()
		}
		return left.GetCreatedAtUnix() > right.GetCreatedAtUnix()
	})

	limit := int(normalizePageSize(query.PageSize))
	if len(candidates) <= limit {
		return ListSubmissionsResult{Submissions: candidates}, nil
	}

	page := candidates[:limit]
	nextCursor, err := cursorFromSubmission(page[len(page)-1])
	if err != nil {
		return ListSubmissionsResult{}, err
	}

	return ListSubmissionsResult{
		Submissions: page,
		NextCursor:  nextCursor,
	}, nil
}

type Hub struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan *submissionv1.SubmissionEvent]struct{}
	latest      map[string]*submissionv1.SubmissionEvent
}

func NewHub() *Hub {
	return &Hub{
		subscribers: make(map[string]map[chan *submissionv1.SubmissionEvent]struct{}),
		latest:      make(map[string]*submissionv1.SubmissionEvent),
	}
}

func (h *Hub) Subscribe(submissionID string) (<-chan *submissionv1.SubmissionEvent, func()) {
	ch := make(chan *submissionv1.SubmissionEvent, 8)

	h.mu.Lock()
	if h.subscribers[submissionID] == nil {
		h.subscribers[submissionID] = make(map[chan *submissionv1.SubmissionEvent]struct{})
	}
	h.subscribers[submissionID][ch] = struct{}{}
	latest := cloneSubmissionEvent(h.latest[submissionID])
	h.mu.Unlock()

	if latest != nil {
		ch <- latest
	}

	unsubscribe := func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		delete(h.subscribers[submissionID], ch)
		close(ch)
	}

	return ch, unsubscribe
}

func (h *Hub) Publish(submissionID string, event *submissionv1.SubmissionEvent) {
	h.mu.Lock()
	h.latest[submissionID] = cloneSubmissionEvent(event)
	for ch := range h.subscribers[submissionID] {
		select {
		case ch <- cloneSubmissionEvent(event):
		default:
			// A slow browser should not block judge result processing. Later, the
			// WebSocket layer can detect dropped events and ask clients to reload.
		}
	}
	h.mu.Unlock()
}

func cloneSubmission(submission *submissionv1.Submission) *submissionv1.Submission {
	if submission == nil {
		return nil
	}
	copy := *submission
	return &copy
}

func cloneSubmissionEvent(event *submissionv1.SubmissionEvent) *submissionv1.SubmissionEvent {
	if event == nil {
		return nil
	}
	copy := *event
	return &copy
}

func normalizePageSize(pageSize int32) int32 {
	const (
		defaultPageSize = 30
		maxPageSize     = 100
	)

	if pageSize <= 0 {
		return defaultPageSize
	}
	if pageSize > maxPageSize {
		return maxPageSize
	}
	return pageSize
}

func submissionAfterCursor(submission *submissionv1.Submission, cursor SubmissionCursor) bool {
	if cursor.CreatedAtUnix == 0 {
		return true
	}
	if submission.GetCreatedAtUnix() < cursor.CreatedAtUnix {
		return true
	}
	return submission.GetCreatedAtUnix() == cursor.CreatedAtUnix && submission.GetSubmissionId() < cursor.SubmissionID
}

func cursorFromSubmission(submission *submissionv1.Submission) (string, error) {
	return EncodeSubmissionCursor(SubmissionCursor{
		CreatedAtUnix: submission.GetCreatedAtUnix(),
		SubmissionID:  submission.GetSubmissionId(),
	})
}
