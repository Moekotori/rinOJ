package grpcserver

import (
	"context"
	"errors"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	userv1.UnimplementedUserServiceServer
	service *app.Service
}

func New(service *app.Service) *Server {
	return &Server{service: service}
}

func (s *Server) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	session, err := s.service.Register(ctx, req)
	if err != nil {
		if errors.Is(err, app.ErrEmailAlreadyRegistered) || errors.Is(err, app.ErrUsernameAlreadyRegistered) {
			return nil, status.Error(codes.AlreadyExists, err.Error())
		}
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	return session, nil
}

func (s *Server) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthSession, error) {
	session, err := s.service.Login(ctx, req)
	if err != nil {
		if errors.Is(err, app.ErrInvalidLogin) {
			return nil, status.Error(codes.Unauthenticated, err.Error())
		}
		return nil, status.Error(codes.Unauthenticated, err.Error())
	}
	return session, nil
}

func (s *Server) Refresh(context.Context, *userv1.RefreshRequest) (*userv1.AuthSession, error) {
	return nil, status.Error(codes.Unimplemented, "refresh is not implemented yet")
}

func (s *Server) GetProfile(ctx context.Context, req *userv1.GetProfileRequest) (*userv1.UserProfile, error) {
	profile, err := s.service.GetProfile(ctx, req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.NotFound, err.Error())
	}
	return profile, nil
}

func (s *Server) CheckPermission(context.Context, *userv1.CheckPermissionRequest) (*userv1.CheckPermissionResponse, error) {
	return &userv1.CheckPermissionResponse{Allowed: true, Reason: "development allow"}, nil
}
