package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
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
	userAdminTarget := env("RIN_USER_ADMIN_HTTP_TARGET", "http://127.0.0.1:50061")

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
		AdminClient:      httpAdminClient{baseURL: userAdminTarget},
	})

	log.Printf("rin gateway listening on %s", addr)
	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatal(err)
	}
}

// grpcUserClient wraps the generated gRPC client so gateway code stays
// independent of the proto-generated interface.
type grpcUserClient struct {
	client userv1.UserServiceClient
}

func (c grpcUserClient) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	return c.client.Register(ctx, req)
}

func (c grpcUserClient) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthSession, error) {
	return c.client.Login(ctx, req)
}

func (c grpcUserClient) GetProfile(ctx context.Context, req *userv1.GetProfileRequest) (*userv1.UserProfile, error) {
	return c.client.GetProfile(ctx, req)
}

// httpAdminClient calls the user-service's internal admin HTTP server.
type httpAdminClient struct {
	baseURL string
}

func (c httpAdminClient) UpdateUserRole(ctx context.Context, actorID, targetUserID, role string) (string, error) {
	body, _ := json.Marshal(map[string]string{"role": role})
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch,
		fmt.Sprintf("%s/users/%s/role", c.baseURL, targetUserID),
		bytes.NewReader(body),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Rin-Actor-ID", actorID)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	raw, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		var errBody struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &errBody)
		if errBody.Message != "" {
			return "", errors.New(errBody.Message)
		}
		return "", fmt.Errorf("admin service returned %d", resp.StatusCode)
	}

	var result struct {
		Role string `json:"role"`
	}
	_ = json.Unmarshal(raw, &result)
	return result.Role, nil
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
