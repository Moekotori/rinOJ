package main

import (
	"context"
	"log"
	"net"
	"net/http"
	"os"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"github.com/rin-oj/rin-oj/services/user-service/internal/adminserver"
	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
	"github.com/rin-oj/rin-oj/services/user-service/internal/domain"
	"github.com/rin-oj/rin-oj/services/user-service/internal/grpcserver"
	"github.com/rin-oj/rin-oj/services/user-service/internal/postgres"
	"google.golang.org/grpc"
)

func main() {
	addr := env("RIN_USER_GRPC_ADDR", ":50051")
	adminAddr := env("RIN_USER_ADMIN_HTTP_ADDR", ":50061")
	repository := app.Repository(app.NewMemoryRepository())

	if dsn := os.Getenv("RIN_USER_POSTGRES_DSN"); dsn != "" {
		pgRepository, err := postgres.Open(context.Background(), dsn)
		if err != nil {
			log.Fatal(err)
		}
		defer pgRepository.Close()
		if os.Getenv("RIN_USER_AUTO_MIGRATE") == "true" {
			if err := pgRepository.ApplyMigrations(context.Background()); err != nil {
				log.Fatal(err)
			}
			log.Print("rin user-service applied PostgreSQL migrations")
		}
		repository = pgRepository
		log.Print("rin user-service using PostgreSQL repository")
	}

	service := app.NewService(repository, app.RandomIDGenerator{})

	// Admin HTTP server — internal only, never expose to the public internet.
	go func() {
		log.Printf("rin user-service admin HTTP listening on %s", adminAddr)
		if err := http.ListenAndServe(adminAddr, adminserver.New(service)); err != nil {
			log.Printf("rin user-service admin HTTP error: %v", err)
		}
	}()

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal(err)
	}

	server := grpc.NewServer()
	userv1.RegisterUserServiceServer(server, grpcserver.New(service, domain.NewPermissionService()))

	log.Printf("rin user-service listening on %s", addr)
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
