package grpcserver

import (
	"context"
	"testing"
	"time"

	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/intake"
)

func TestCreatePresignedUpload(t *testing.T) {
	service := intake.NewService(
		intake.WithUploadSigner(&fakeSigner{}),
		intake.WithIDGenerator(intake.StaticIDGenerator{Value: "fixed"}),
	)
	server := New(service)

	resp, err := server.CreatePresignedUpload(context.Background(), &problemv1.CreatePresignedUploadRequest{
		ActorId:     "usr_teacher",
		Filename:    "Two Sum.zip",
		ContentType: "application/zip",
		SizeBytes:   1024,
		PartCount:   1,
	})
	if err != nil {
		t.Fatalf("CreatePresignedUpload returned error: %v", err)
	}
	if resp.GetObjectKey() == "" {
		t.Fatal("expected object key")
	}
	if len(resp.GetParts()) != 1 {
		t.Fatalf("expected one part, got %d", len(resp.GetParts()))
	}
}

func TestTeacherQuickUpload(t *testing.T) {
	server := New(intake.NewService())

	draft, err := server.TeacherQuickUpload(context.Background(), &problemv1.TeacherQuickUploadRequest{
		TeacherId:       "usr_teacher",
		ClassId:         "class_1",
		UploadObjectKey: "problem-intake/usr_teacher/upload.zip",
	})
	if err != nil {
		t.Fatalf("TeacherQuickUpload returned error: %v", err)
	}
	if draft.GetVisibility() != problemv1.ProblemVisibility_PROBLEM_VISIBILITY_REVIEW {
		t.Fatalf("unexpected visibility %s", draft.GetVisibility())
	}
}

func TestValidateProblemImport(t *testing.T) {
	server := New(intake.NewService(intake.WithIDGenerator(intake.StaticIDGenerator{Value: "fixed"})))

	wizard, err := server.ValidateProblemImport(context.Background(), &problemv1.ValidateProblemImportRequest{
		ActorId:         "usr_teacher",
		UploadObjectKey: "problem-intake/usr_teacher/upload.zip",
		SourceFilename:  "Two Sum.zip",
	})
	if err != nil {
		t.Fatalf("ValidateProblemImport returned error: %v", err)
	}
	if wizard.GetImportId() != "imp_fixed" {
		t.Fatalf("unexpected import id %q", wizard.GetImportId())
	}
	if wizard.GetDetectedTitle() != "Two Sum" {
		t.Fatalf("unexpected title %q", wizard.GetDetectedTitle())
	}
	if len(wizard.GetValidations()) == 0 {
		t.Fatal("expected parser-pending validation")
	}
}

type fakeSigner struct{}

func (s *fakeSigner) PresignUploadPart(ctx context.Context, objectKey string, partNumber int32, expires time.Duration) (intake.PresignedUploadPart, error) {
	return intake.PresignedUploadPart{
		PartNumber: partNumber,
		UploadURL:  "https://minio.local/" + objectKey,
		Headers:    map[string]string{"x-test": "true"},
	}, nil
}
