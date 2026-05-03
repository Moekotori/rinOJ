package domain

import (
	"strings"
	"testing"
)

func TestRegisterCreatesVerifiedShapeButUnverifiedEmail(t *testing.T) {
	service := NewAuthService(StaticTokenGenerator{Prefix: "test"})

	session, err := service.Register(RegisterInput{
		Email:    "Rin.Student@Example.COM",
		Username: "rin_student",
		Password: "correct horse battery staple",
		Locale:   "zh-CN",
	})

	if err != nil {
		t.Fatalf("Register returned error: %v", err)
	}
	if session.User.ID == "" {
		t.Fatal("expected generated user id")
	}
	if session.User.Email != "rin.student@example.com" {
		t.Fatalf("email should be normalized, got %q", session.User.Email)
	}
	if session.User.EmailVerified {
		t.Fatal("newly registered email should not be verified")
	}
	if session.AccessToken == "" || session.RefreshToken == "" {
		t.Fatal("expected access and refresh tokens")
	}
}

func TestRegisterRejectsWeakPassword(t *testing.T) {
	service := NewAuthService(StaticTokenGenerator{Prefix: "test"})

	_, err := service.Register(RegisterInput{
		Email:    "rin@example.com",
		Username: "rin",
		Password: "short",
		Locale:   "en-US",
	})

	if err == nil {
		t.Fatal("expected weak password error")
	}
	if !strings.Contains(err.Error(), "password") {
		t.Fatalf("expected password error, got %v", err)
	}
}

func TestLoginRejectsUnknownUser(t *testing.T) {
	service := NewAuthService(StaticTokenGenerator{Prefix: "test"})

	_, err := service.Login(LoginInput{
		Login:    "missing@example.com",
		Password: "correct horse battery staple",
	})

	if err == nil {
		t.Fatal("expected login error")
	}
}

func TestCheckPermissionSupportsOwnerAndAdmin(t *testing.T) {
	service := NewPermissionService()

	ownerDecision := service.CheckPermission(CheckPermissionInput{
		ActorID:  "usr_owner",
		Action:   "problem.draft.update",
		Resource: "problem:draft_1",
		Attributes: map[string]string{
			"owner_id": "usr_owner",
			"role":     "student",
		},
	})
	if !ownerDecision.Allowed {
		t.Fatalf("owner should be allowed: %s", ownerDecision.Reason)
	}

	adminDecision := service.CheckPermission(CheckPermissionInput{
		ActorID:  "usr_admin",
		Action:   "admin.problem.publish",
		Resource: "problem:draft_1",
		Attributes: map[string]string{
			"role": "admin",
		},
	})
	if !adminDecision.Allowed {
		t.Fatalf("admin should be allowed: %s", adminDecision.Reason)
	}
}
