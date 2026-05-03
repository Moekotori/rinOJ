package main

import (
	"context"
	"log"
	"net"
	"os"

	"github.com/hibiken/asynq"
	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/app"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/grpcserver"
	"github.com/rin-oj/rin-oj/services/submission-service/internal/postgres"
	judgequeue "github.com/rin-oj/rin-oj/services/submission-service/internal/queue"
	"google.golang.org/grpc"
)

func main() {
	addr := env("RIN_SUBMISSION_GRPC_ADDR", ":50052")
	redisAddr := env("RIN_REDIS_ADDR", "127.0.0.1:6379")

	asynqClient := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})
	defer asynqClient.Close()

	repository := app.Repository(app.NewMemoryRepository())
	if dsn := os.Getenv("RIN_SUBMISSION_POSTGRES_DSN"); dsn != "" {
		pgRepository, err := postgres.Open(context.Background(), dsn)
		if err != nil {
			log.Fatal(err)
		}
		defer pgRepository.Close()
		if os.Getenv("RIN_SUBMISSION_AUTO_MIGRATE") == "true" {
			if err := pgRepository.ApplyMigrations(context.Background()); err != nil {
				log.Fatal(err)
			}
			log.Print("rin submission-service applied PostgreSQL migrations")
		}
		repository = pgRepository
		log.Print("rin submission-service using PostgreSQL repository")
	}

	service := app.NewService(
		repository,
		app.NewHub(),
		judgequeue.NewAsynqEnqueuer(asynqClient),
		app.StaticIDGenerator{Prefix: "rin"},
	)

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal(err)
	}

	server := grpc.NewServer()
	submissionv1.RegisterSubmissionServiceServer(server, grpcserver.New(service))

	log.Printf("rin submission-service listening on %s", addr)
	if err := server.Serve(listener); err != nil {
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
