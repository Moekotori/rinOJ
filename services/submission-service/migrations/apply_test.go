package migrations

import (
	"context"
	"strings"
	"testing"
)

func TestApplyRunsEmbeddedMigrationsInOrder(t *testing.T) {
	exec := &recordingExecutor{}

	if err := Apply(context.Background(), exec); err != nil {
		t.Fatalf("Apply returned error: %v", err)
	}
	if len(exec.statements) == 0 {
		t.Fatal("expected at least one migration statement")
	}
	if !strings.Contains(strings.ToLower(exec.statements[0]), "create type submission_status") {
		t.Fatalf("first migration should create submission_status enum, got %q", exec.statements[0])
	}
}

type recordingExecutor struct {
	statements []string
}

func (e *recordingExecutor) Exec(ctx context.Context, sql string) error {
	e.statements = append(e.statements, sql)
	return nil
}
