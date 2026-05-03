package intake

import (
	"context"
	"testing"
)

func TestMemoryDraftRepositoryCopiesDrafts(t *testing.T) {
	repo := NewMemoryDraftRepository()
	draft := ProblemDraft{
		DraftID:     "draft_1",
		OwnerUserID: "usr_1",
		Title:       "Two Sum",
		Visibility:  VisibilityReview,
	}

	if err := repo.SaveDraft(context.Background(), draft); err != nil {
		t.Fatalf("SaveDraft returned error: %v", err)
	}

	draft.Title = "Mutated"
	stored, err := repo.GetDraft(context.Background(), "draft_1")
	if err != nil {
		t.Fatalf("GetDraft returned error: %v", err)
	}
	if stored.Title != "Two Sum" {
		t.Fatalf("repository should protect stored draft copy, got %q", stored.Title)
	}
}
