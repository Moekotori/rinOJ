package app

import (
	"context"
	"errors"
	"testing"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
)

type fixedIDGenerator struct{}

func (fixedIDGenerator) NewID(prefix string) string {
	return prefix + "_test"
}

func TestRegisterReturnsReadableDuplicateEmailError(t *testing.T) {
	service := NewService(NewMemoryRepository(), fixedIDGenerator{})
	req := &userv1.RegisterRequest{
		Email:    "rin@example.com",
		Username: "rin_user",
		Password: "very-secure-password",
		Locale:   "zh-CN",
	}
	if _, err := service.Register(context.Background(), req); err != nil {
		t.Fatalf("first register failed: %v", err)
	}

	_, err := service.Register(context.Background(), &userv1.RegisterRequest{
		Email:    "rin@example.com",
		Username: "rin_user_2",
		Password: "very-secure-password",
		Locale:   "zh-CN",
	})

	if !errors.Is(err, ErrEmailAlreadyRegistered) {
		t.Fatalf("err = %v, want ErrEmailAlreadyRegistered", err)
	}
}

func TestRegisterSessionIncludesDefaultRole(t *testing.T) {
	service := NewService(NewMemoryRepository(), fixedIDGenerator{})
	sess, err := service.Register(context.Background(), &userv1.RegisterRequest{
		Email:    "new@example.com",
		Username: "new_user",
		Password: "very-secure-password",
		Locale:   "zh-CN",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if sess.GetRole() != "student" {
		t.Fatalf("role = %q, want student", sess.GetRole())
	}
}

func TestGetProfileAcceptsUsernameAndReturnsRole(t *testing.T) {
	repo := NewMemoryRepository()
	service := NewService(repo, fixedIDGenerator{})
	sess, err := service.Register(context.Background(), &userv1.RegisterRequest{
		Email:    "moe@example.com",
		Username: "Moekotori",
		Password: "very-secure-password",
		Locale:   "zh-CN",
	})
	if err != nil {
		t.Fatalf("register: %v", err)
	}
	if err := repo.SetUserRole(context.Background(), sess.GetUserId(), "admin"); err != nil {
		t.Fatalf("set role: %v", err)
	}

	profile, err := service.GetProfile(context.Background(), "Moekotori")
	if err != nil {
		t.Fatalf("GetProfile by username returned error: %v", err)
	}
	if profile.GetRole() != "admin" {
		t.Fatalf("role = %q, want admin", profile.GetRole())
	}
	if profile.GetUsername() != "Moekotori" {
		t.Fatalf("username = %q, want Moekotori", profile.GetUsername())
	}
}
