package intake

import (
	"context"
	"testing"
	"time"
)

func BenchmarkCreatePresignedUpload(b *testing.B) {
	service := NewService(
		WithUploadSigner(benchmarkSigner{}),
		WithIDGenerator(StaticIDGenerator{Value: "bench"}),
	)

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := service.CreatePresignedUpload(context.Background(), CreatePresignedUploadInput{
			ActorID:     "usr_teacher",
			Filename:    "Two Sum.zip",
			ContentType: "application/zip",
			SizeBytes:   32 * 1024 * 1024,
			PartCount:   4,
		})
		if err != nil {
			b.Fatal(err)
		}
	}
}

type benchmarkSigner struct{}

func (s benchmarkSigner) PresignUploadPart(ctx context.Context, objectKey string, partNumber int32, expires time.Duration) (PresignedUploadPart, error) {
	return PresignedUploadPart{
		PartNumber: partNumber,
		UploadURL:  "https://minio.local/" + objectKey,
	}, nil
}
