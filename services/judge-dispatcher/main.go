package main

import (
	"log"
	"os"

	"github.com/hibiken/asynq"
	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	"github.com/rin-oj/rin-oj/services/judge-dispatcher/internal/dispatcher"
	judgequeue "github.com/rin-oj/rin-oj/services/judge-dispatcher/internal/queue"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	redisAddr := env("RIN_REDIS_ADDR", "127.0.0.1:6379")
	submissionAddr := env("RIN_SUBMISSION_GRPC_TARGET", "127.0.0.1:50052")
	providerName := env("RIN_JUDGE_PROVIDER", "mock")
	goJudgeEndpoint := env("RIN_GO_JUDGE_ENDPOINT", "http://127.0.0.1:5050")

	conn, err := grpc.NewClient(submissionAddr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	reporter := dispatcher.NewSubmissionReporter(submissionv1.NewSubmissionServiceClient(conn))
	provider := dispatcher.JudgeProvider(dispatcher.MockJudgeProvider{})
	if providerName == "gojudge" {
		provider = dispatcher.NewGoJudgeHTTPProvider(goJudgeEndpoint)
	}
	dispatch := dispatcher.New(provider, reporter)
	handler := judgequeue.NewHandler(dispatch)

	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{Queues: map[string]int{"judge": 10}},
	)

	mux := asynq.NewServeMux()
	mux.Handle(judgequeue.JudgeSubmitTaskType, handler)

	log.Printf("rin judge-dispatcher listening on redis queue judge at %s with provider=%s", redisAddr, providerName)
	if err := server.Run(mux); err != nil {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
