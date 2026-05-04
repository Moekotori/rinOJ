package main

import (
	"log"
	"net"
	"os"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	problemv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/problem/v1"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/grpcserver"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/intake"
	"github.com/rin-oj/rin-oj/services/problem-service/internal/objectstore"
	"google.golang.org/grpc"
)

func main() {
	addr := env("RIN_PROBLEM_GRPC_ADDR", ":50053")

	options := []intake.Option{}
	if endpoint := os.Getenv("RIN_MINIO_ENDPOINT"); endpoint != "" {
		client, err := minio.New(endpoint, &minio.Options{
			Creds:  credentials.NewStaticV4(env("RIN_MINIO_ACCESS_KEY", "rin"), env("RIN_MINIO_SECRET_KEY", "rin_dev_minio_password"), ""),
			Secure: os.Getenv("RIN_MINIO_SECURE") == "true",
		})
		if err != nil {
			log.Fatal(err)
		}
		store := objectstore.NewMinIOUploadSigner(client, env("RIN_MINIO_PROBLEM_BUCKET", "rin-problems"))
		options = append(options, intake.WithUploadSigner(store), intake.WithTextObjectWriter(store))
		log.Print("rin problem-service using MinIO upload signer")
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal(err)
	}

	server := grpc.NewServer()
	problemv1.RegisterProblemServiceServer(server, grpcserver.New(intake.NewService(options...)))

	log.Printf("rin problem-service listening on %s", addr)
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
