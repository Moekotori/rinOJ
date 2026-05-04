package grpcserver

import (
	"context"
	"errors"
	"maps"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
	"github.com/rin-oj/rin-oj/services/user-service/internal/domain"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	userv1.UnimplementedUserServiceServer
	service *app.Service
	perm    *domain.PermissionService
}

func New(service *app.Service, perm *domain.PermissionService) *Server {
	if perm == nil {
		perm = domain.NewPermissionService()
	}
	return &Server{service: service, perm: perm}
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

func (s *Server) CheckPermission(ctx context.Context, req *userv1.CheckPermissionRequest) (*userv1.CheckPermissionResponse, error) {
	attrs := maps.Clone(req.GetAttributes())
	if attrs == nil {
		attrs = make(map[string]string)
	}
	if role, ok := s.service.ActorRole(ctx, req.GetActorId()); ok {
		attrs["role"] = role
	}
	dec := s.perm.CheckPermission(domain.CheckPermissionInput{
		ActorID:    req.GetActorId(),
		Action:     req.GetAction(),
		Resource:   req.GetResource(),
		Attributes: attrs,
	})
	return &userv1.CheckPermissionResponse{Allowed: dec.Allowed, Reason: dec.Reason}, nil
}
