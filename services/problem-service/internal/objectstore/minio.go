package objectstore

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/intake"
)

const (
	minUploadExpiry = time.Minute
	maxUploadExpiry = time.Hour
)

type MinIOUploadSigner struct {
	client *minio.Client
	bucket string
}

func NewMinIOUploadSigner(client *minio.Client, bucket string) *MinIOUploadSigner {
	return &MinIOUploadSigner{client: client, bucket: bucket}
}

func (s *MinIOUploadSigner) PresignUploadPart(ctx context.Context, objectKey string, partNumber int32, expires time.Duration) (intake.PresignedUploadPart, error) {
	if s.client == nil {
		return intake.PresignedUploadPart{}, errors.New("minio client is required")
	}
	if s.bucket == "" {
		return intake.PresignedUploadPart{}, errors.New("minio bucket is required")
	}
	if err := ValidateUploadExpiry(expires); err != nil {
		return intake.PresignedUploadPart{}, err
	}

	// This keeps the intake service independent from MinIO. The domain asks for
	// a signed upload URL; this adapter decides how that URL is produced.
	partObjectKey := fmt.Sprintf("%s.part-%04d", objectKey, partNumber)
	uploadURL, err := s.client.PresignedPutObject(ctx, s.bucket, partObjectKey, expires)
	if err != nil {
		return intake.PresignedUploadPart{}, err
	}

	return intake.PresignedUploadPart{
		PartNumber: partNumber,
		UploadURL:  uploadURL.String(),
		Headers: map[string]string{
			"x-rin-object-key": objectKey,
			"x-rin-part-key":   partObjectKey,
		},
	}, nil
}

func (s *MinIOUploadSigner) PutText(ctx context.Context, objectKey string, content string) error {
	if s.client == nil {
		return errors.New("minio client is required")
	}
	if s.bucket == "" {
		return errors.New("minio bucket is required")
	}
	reader := bytes.NewReader([]byte(content))
	_, err := s.client.PutObject(ctx, s.bucket, objectKey, reader, int64(reader.Len()), minio.PutObjectOptions{
		ContentType: "text/plain; charset=utf-8",
	})
	if err != nil {
		return fmt.Errorf("put inline test object: %w", err)
	}
	return nil
}

func ValidateUploadExpiry(expires time.Duration) error {
	if expires < minUploadExpiry {
		return errors.New("upload expiry is too short")
	}
	if expires > maxUploadExpiry {
		return errors.New("upload expiry is too long")
	}
	return nil
}
