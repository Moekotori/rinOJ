package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/app"
)

type Repository struct {
	pool *pgxpool.Pool
}

func Open(ctx context.Context, dsn string) (*Repository, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Repository{pool: pool}, nil
}

func New(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Close() {
	if r.pool != nil {
		r.pool.Close()
	}
}

func (r *Repository) Save(ctx context.Context, submission *submissionv1.Submission) error {
	status, err := statusToDB(submission.GetStatus())
	if err != nil {
		return err
	}
	createdAt := time.Unix(submission.GetCreatedAtUnix(), 0).UTC()

	_, err = r.pool.Exec(ctx, `
INSERT INTO submissions (
  submission_id, actor_id, problem_id, contest_id, language_id, status, score, created_at, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
ON CONFLICT (submission_id, created_at) DO UPDATE SET
  status = EXCLUDED.status,
  score = EXCLUDED.score,
  updated_at = now()
`,
		submission.GetSubmissionId(),
		submission.GetActorId(),
		submission.GetProblemId(),
		submission.GetContestId(),
		submission.GetLanguageId(),
		status,
		submission.GetScore(),
		createdAt,
	)
	return err
}

func (r *Repository) Get(ctx context.Context, id string) (*submissionv1.Submission, error) {
	row := r.pool.QueryRow(ctx, `
SELECT submission_id, actor_id, problem_id, contest_id, language_id, status, score, extract(epoch from created_at)::bigint
FROM submissions
WHERE submission_id = $1
ORDER BY created_at DESC
LIMIT 1
`, id)

	var submission submissionv1.Submission
	var statusText string
	if err := row.Scan(
		&submission.SubmissionId,
		&submission.ActorId,
		&submission.ProblemId,
		&submission.ContestId,
		&submission.LanguageId,
		&statusText,
		&submission.Score,
		&submission.CreatedAtUnix,
	); err != nil {
		return nil, err
	}
	status, err := statusFromDB(statusText)
	if err != nil {
		return nil, err
	}
	submission.Status = status
	return &submission, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id string, status submissionv1.SubmissionStatus) (*submissionv1.Submission, error) {
	statusText, err := statusToDB(status)
	if err != nil {
		return nil, err
	}

	row := r.pool.QueryRow(ctx, `
UPDATE submissions
SET status = $2::submission_status,
    score = CASE WHEN $2::submission_status = 'accepted'::submission_status THEN 100 ELSE score END,
    updated_at = now()
WHERE submission_id = $1
RETURNING submission_id, actor_id, problem_id, contest_id, language_id, status, score, extract(epoch from created_at)::bigint
`, id, statusText)

	var submission submissionv1.Submission
	var storedStatus string
	if err := row.Scan(
		&submission.SubmissionId,
		&submission.ActorId,
		&submission.ProblemId,
		&submission.ContestId,
		&submission.LanguageId,
		&storedStatus,
		&submission.Score,
		&submission.CreatedAtUnix,
	); err != nil {
		return nil, err
	}
	submission.Status, err = statusFromDB(storedStatus)
	if err != nil {
		return nil, err
	}
	return &submission, nil
}

func (r *Repository) ListSubmissions(ctx context.Context, query app.ListSubmissionsQuery) (app.ListSubmissionsResult, error) {
	cursor, err := app.DecodeSubmissionCursor(query.Cursor)
	if err != nil {
		return app.ListSubmissionsResult{}, err
	}

	pageSize := int(query.PageSize)
	if pageSize <= 0 {
		pageSize = 30
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// Keyset pagination keeps hot submission lists fast as the table grows:
	// PostgreSQL can continue from the last seen (created_at, submission_id)
	// boundary instead of scanning and discarding OFFSET rows.
	rows, err := r.pool.Query(ctx, `
SELECT submission_id, actor_id, problem_id, contest_id, language_id, status, score, extract(epoch from created_at)::bigint
FROM submissions
WHERE ($1 = '' OR actor_id = $1)
  AND ($2 = '' OR problem_id = $2)
  AND ($3 = '' OR contest_id = $3)
  AND (
    $4::bigint = 0
    OR created_at < to_timestamp($4)
    OR (created_at = to_timestamp($4) AND submission_id < $5)
  )
ORDER BY created_at DESC, submission_id DESC
LIMIT $6
`, query.ActorID, query.ProblemID, query.ContestID, cursor.CreatedAtUnix, cursor.SubmissionID, pageSize+1)
	if err != nil {
		return app.ListSubmissionsResult{}, err
	}
	defer rows.Close()

	submissions := make([]*submissionv1.Submission, 0, pageSize+1)
	for rows.Next() {
		var submission submissionv1.Submission
		var statusText string
		if err := rows.Scan(
			&submission.SubmissionId,
			&submission.ActorId,
			&submission.ProblemId,
			&submission.ContestId,
			&submission.LanguageId,
			&statusText,
			&submission.Score,
			&submission.CreatedAtUnix,
		); err != nil {
			return app.ListSubmissionsResult{}, err
		}
		submission.Status, err = statusFromDB(statusText)
		if err != nil {
			return app.ListSubmissionsResult{}, err
		}
		submissions = append(submissions, &submission)
	}
	if err := rows.Err(); err != nil {
		return app.ListSubmissionsResult{}, err
	}

	if len(submissions) <= pageSize {
		return app.ListSubmissionsResult{Submissions: submissions}, nil
	}

	page := submissions[:pageSize]
	last := page[len(page)-1]
	nextCursor, err := app.EncodeSubmissionCursor(app.SubmissionCursor{
		CreatedAtUnix: last.GetCreatedAtUnix(),
		SubmissionID:  last.GetSubmissionId(),
	})
	if err != nil {
		return app.ListSubmissionsResult{}, err
	}
	return app.ListSubmissionsResult{Submissions: page, NextCursor: nextCursor}, nil
}

func statusToDB(status submissionv1.SubmissionStatus) (string, error) {
	switch status {
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED:
		return "queued", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILING:
		return "compiling", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING:
		return "running", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED:
		return "accepted", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_WRONG_ANSWER:
		return "wrong_answer", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_TIME_LIMIT_EXCEEDED:
		return "time_limit_exceeded", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_MEMORY_LIMIT_EXCEEDED:
		return "memory_limit_exceeded", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNTIME_ERROR:
		return "runtime_error", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILE_ERROR:
		return "compile_error", nil
	case submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR:
		return "system_error", nil
	default:
		return "", errors.New("unsupported submission status")
	}
}

func statusFromDB(status string) (submissionv1.SubmissionStatus, error) {
	switch status {
	case "queued":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_QUEUED, nil
	case "compiling":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILING, nil
	case "running":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNNING, nil
	case "accepted":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_ACCEPTED, nil
	case "wrong_answer":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_WRONG_ANSWER, nil
	case "time_limit_exceeded":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_TIME_LIMIT_EXCEEDED, nil
	case "memory_limit_exceeded":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_MEMORY_LIMIT_EXCEEDED, nil
	case "runtime_error":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_RUNTIME_ERROR, nil
	case "compile_error":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_COMPILE_ERROR, nil
	case "system_error":
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_SYSTEM_ERROR, nil
	default:
		return submissionv1.SubmissionStatus_SUBMISSION_STATUS_UNSPECIFIED, errors.New("unsupported submission status")
	}
}
