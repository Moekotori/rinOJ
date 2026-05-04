package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
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

func (r *Repository) Close() {
	if r.pool != nil {
		r.pool.Close()
	}
}

func (r *Repository) ApplyMigrations(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, createUsersSQL)
	return err
}

func (r *Repository) CreateUser(ctx context.Context, user app.UserRecord) error {
	role := app.NormalizeUserRole(user.Role)
	_, err := r.pool.Exec(ctx, `
INSERT INTO users (user_id, email, username, password_hash, locale, role, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, now())
`, user.UserID, user.Email, user.Username, user.PasswordHash, user.Locale, role, user.CreatedAt)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			switch pgErr.ConstraintName {
			case "users_email_key":
				return app.ErrEmailAlreadyRegistered
			case "users_username_key":
				return app.ErrUsernameAlreadyRegistered
			}
		}
	}
	return err
}

func (r *Repository) GetUser(ctx context.Context, userID string) (app.UserRecord, error) {
	row := r.pool.QueryRow(ctx, `
SELECT user_id, email, username, password_hash, locale, role, created_at
FROM users
WHERE user_id = $1
`, userID)
	var user app.UserRecord
	err := row.Scan(&user.UserID, &user.Email, &user.Username, &user.PasswordHash, &user.Locale, &user.Role, &user.CreatedAt)
	return user, err
}

func (r *Repository) GetUserByLogin(ctx context.Context, login string) (app.UserRecord, error) {
	row := r.pool.QueryRow(ctx, `
SELECT user_id, email, username, password_hash, locale, role, created_at
FROM users
WHERE email = $1 OR lower(username) = lower($1)
LIMIT 1
`, login)
	var user app.UserRecord
	err := row.Scan(&user.UserID, &user.Email, &user.Username, &user.PasswordHash, &user.Locale, &user.Role, &user.CreatedAt)
	return user, err
}

func (r *Repository) UpdateUserRole(ctx context.Context, userID, role string) error {
	result, err := r.pool.Exec(ctx, `
UPDATE users SET role = $1, updated_at = now()
WHERE user_id = $2 OR lower(username) = lower($2)
`, role, userID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return app.ErrUserNotFound
	}
	return nil
}

const createUsersSQL = `
CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  locale text NOT NULL DEFAULT 'zh-CN',
  role text NOT NULL DEFAULT 'student',
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_created_at_idx ON users (created_at DESC, user_id DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';
`
