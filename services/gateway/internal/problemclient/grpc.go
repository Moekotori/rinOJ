package problemclient

import (
	"context"

	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
)

type GRPCClient struct {
	client problemv1.ProblemServiceClient
}

func NewGRPCClient(client problemv1.ProblemServiceClient) *GRPCClient {
	return &GRPCClient{client: client}
}

func (c *GRPCClient) CreatePresignedUpload(ctx context.Context, req *problemv1.CreatePresignedUploadRequest) (*problemv1.CreatePresignedUploadResponse, error) {
	return c.client.CreatePresignedUpload(ctx, req)
}

func (c *GRPCClient) ValidateProblemImport(ctx context.Context, req *problemv1.ValidateProblemImportRequest) (*problemv1.ImportWizard, error) {
	return c.client.ValidateProblemImport(ctx, req)
}

func (c *GRPCClient) CreateInlineDraft(ctx context.Context, req *problemv1.CreateInlineDraftRequest) (*problemv1.CreateInlineDraftResponse, error) {
	return c.client.CreateInlineDraft(ctx, req)
}

func (c *GRPCClient) TeacherQuickUpload(ctx context.Context, req *problemv1.TeacherQuickUploadRequest) (*problemv1.ProblemDraft, error) {
	return c.client.TeacherQuickUpload(ctx, req)
}

func (c *GRPCClient) StudentDraftSubmission(ctx context.Context, req *problemv1.StudentDraftSubmissionRequest) (*problemv1.ProblemDraft, error) {
	return c.client.StudentDraftSubmission(ctx, req)
}
