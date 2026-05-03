package postgres

import (
	"context"

	"github.com/rin-oj/rin-oj/services/submission-service/migrations"
)

type migrationExecutor struct {
	repository *Repository
}

func (r *Repository) ApplyMigrations(ctx context.Context) error {
	return migrations.Apply(ctx, migrationExecutor{repository: r})
}

func (e migrationExecutor) Exec(ctx context.Context, sql string) error {
	_, err := e.repository.pool.Exec(ctx, sql)
	return err
}
