package app

import (
	"context"
	"fmt"
	"testing"
)

func BenchmarkCreateSubmission(b *testing.B) {
	service := NewService(NewMemoryRepository(), NewHub(), &benchmarkEnqueuer{}, StaticIDGenerator{Prefix: "bench"})

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := service.CreateSubmission(context.Background(), CreateSubmissionCommand{
			ActorID:    "usr_1",
			ProblemID:  fmt.Sprintf("prob_%d", i%16),
			LanguageID: "cpp17",
			SourceCode: "int main(){return 0;}",
		})
		if err != nil {
			b.Fatal(err)
		}
	}
}

type benchmarkEnqueuer struct{}

func (e *benchmarkEnqueuer) EnqueueJudgeSubmission(ctx context.Context, task JudgeTask) error {
	return nil
}
