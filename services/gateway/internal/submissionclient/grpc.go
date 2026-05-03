package submissionclient

import (
	"context"

	submissionv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/submission/v1"
)

type GRPCClient struct {
	client submissionv1.SubmissionServiceClient
}

func NewGRPCClient(client submissionv1.SubmissionServiceClient) *GRPCClient {
	return &GRPCClient{client: client}
}

func (c *GRPCClient) CreateSubmission(ctx context.Context, req *submissionv1.CreateSubmissionRequest) (*submissionv1.Submission, error) {
	return c.client.CreateSubmission(ctx, req)
}

func (c *GRPCClient) GetSubmission(ctx context.Context, req *submissionv1.GetSubmissionRequest) (*submissionv1.Submission, error) {
	return c.client.GetSubmission(ctx, req)
}

func (c *GRPCClient) ListSubmissions(ctx context.Context, req *submissionv1.ListSubmissionsRequest) (*submissionv1.ListSubmissionsResponse, error) {
	return c.client.ListSubmissions(ctx, req)
}

func (c *GRPCClient) StreamSubmission(ctx context.Context, req *submissionv1.StreamSubmissionRequest) (submissionv1.SubmissionService_StreamSubmissionClient, error) {
	return c.client.StreamSubmission(ctx, req)
}
