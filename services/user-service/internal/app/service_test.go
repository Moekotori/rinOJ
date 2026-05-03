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
