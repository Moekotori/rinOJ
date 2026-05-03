package dispatcher

import (
	"context"
	"testing"
)

func BenchmarkDispatchMockJudge(b *testing.B) {
	reporter := &benchmarkReporter{}
	dispatcher := New(MockJudgeProvider{}, reporter)
	task := JudgeTask{
		SubmissionID: "sub_1",
		ProblemID:    "prob_1",
		LanguageID:   "cpp17",
		SourceCode:   "int main(){return 0;}",
	}

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		if err := dispatcher.Dispatch(context.Background(), task); err != nil {
			b.Fatal(err)
		}
	}
}

type benchmarkReporter struct{}

func (r *benchmarkReporter) Report(ctx context.Context, result JudgeResult) error {
	return nil
}
