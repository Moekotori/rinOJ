package main

import (
	"context"
	"log"
	"net/http"
	"os"

	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"github.com/rin-oj/rin-oj/services/gateway/internal/httpserver"
	"github.com/rin-oj/rin-oj/services/gateway/internal/problemclient"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func main() {
	addr := os.Getenv("RIN_GATEWAY_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	submissionTarget := env("RIN_SUBMISSION_GRPC_TARGET", "127.0.0.1:50052")
	problemTarget := env("RIN_PROBLEM_GRPC_TARGET", "127.0.0.1:50053")
	userTarget := env("RIN_USER_GRPC_TARGET", "127.0.0.1:50051")

	submissionConn, err := grpc.NewClient(submissionTarget, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer submissionConn.Close()

	problemConn, err := grpc.NewClient(problemTarget, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer problemConn.Close()

	userConn, err := grpc.NewClient(userTarget, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatal(err)
	}
	defer userConn.Close()

	server := httpserver.New(httpserver.ServerConfig{
		ServiceName:      "gateway",
		Version:          "dev",
		ProblemClient:    problemclient.NewGRPCClient(problemv1.NewProblemServiceClient(problemConn)),
		SubmissionClient: grpcSubmissionClient{client: submissionv1.NewSubmissionServiceClient(submissionConn)},
		UserClient:       grpcUserClient{client: userv1.NewUserServiceClient(userConn)},
	})

	log.Printf("rin gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatal(err)
	}
}

type grpcUserClient struct {
	client userv1.UserServiceClient
}

func (c grpcUserClient) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	return c.client.Register(ctx, req)
}

func (c grpcUserClient) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthSession, error) {
	return c.client.Login(ctx, req)
}

type grpcSubmissionClient struct {
	client submissionv1.SubmissionServiceClient
}

func (c grpcSubmissionClient) CreateSubmission(ctx context.Context, req *submissionv1.CreateSubmissionRequest) (*submissionv1.Submission, error) {
	return c.client.CreateSubmission(ctx, req)
}

func (c grpcSubmissionClient) GetSubmission(ctx context.Context, req *submissionv1.GetSubmissionRequest) (*submissionv1.Submission, error) {
	return c.client.GetSubmission(ctx, req)
}

func (c grpcSubmissionClient) ListSubmissions(ctx context.Context, req *submissionv1.ListSubmissionsRequest) (*submissionv1.ListSubmissionsResponse, error) {
	return c.client.ListSubmissions(ctx, req)
}

func (c grpcSubmissionClient) StreamSubmission(ctx context.Context, req *submissionv1.StreamSubmissionRequest) (httpserver.SubmissionEventStream, error) {
	return c.client.StreamSubmission(ctx, req)
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
