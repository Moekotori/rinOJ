package migrations_test

import (
	"os"
	"strings"
	"testing"
)

func TestInitialMigrationDefinesPartitionedSubmissions(t *testing.T) {
	content, err := os.ReadFile("001_create_submissions.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
	}
	sql := strings.ToLower(string(content))

	required := []string{
		"create table if not exists submissions",
		"partition by range (created_at)",
		"submission_status",
		"create table if not exists submission_events",
		"create index if not exists idx_submissions_actor_created",
		"create index if not exists idx_submissions_problem_created",
		"create index if not exists idx_submission_events_submission_created",
	}
	for _, token := range required {
		if !strings.Contains(sql, token) {
			t.Fatalf("migration should contain %q", token)
		}
	}
}
