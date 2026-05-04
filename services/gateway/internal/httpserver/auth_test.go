package httpserver

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeUserClient struct{}

func (fakeUserClient) Register(context.Context, *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	return &userv1.AuthSession{
		UserId:               "usr_test",
		Role:                 "student",
		AccessToken:          "access_test",
		RefreshToken:         "refresh_test",
		AccessExpiresAtUnix:  100,
		RefreshExpiresAtUnix: 200,
	}, nil
}

func (fakeUserClient) Login(context.Context, *userv1.LoginRequest) (*userv1.AuthSession, error) {
	return &userv1.AuthSession{
		UserId:               "usr_login",
		Role:                 "student",
		AccessToken:          "access_login",
		RefreshToken:         "refresh_login",
		AccessExpiresAtUnix:  300,
		RefreshExpiresAtUnix: 400,
	}, nil
}

func (fakeUserClient) GetProfile(context.Context, *userv1.GetProfileRequest) (*userv1.UserProfile, error) {
	return &userv1.UserProfile{
		UserId:      "usr_login",
		Username:    "rin_user",
		DisplayName: "rin_user",
		Locale:      "zh-CN",
		Role:        "admin",
	}, nil
}

type duplicateEmailUserClient struct {
	fakeUserClient
}

func (duplicateEmailUserClient) Register(context.Context, *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	return nil, status.Error(codes.AlreadyExists, "email is already registered")
}

func TestRegisterRoute(t *testing.T) {
	server := New(ServerConfig{UserClient: fakeUserClient{}})
	body := []byte(`{"email":"rin@example.com","username":"rin_user","password":"very-secure-password","locale":"zh-CN"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	server.ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("status = %d body = %s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["userId"] != "usr_test" {
		t.Fatalf("userId = %v", payload["userId"])
	}
}

func TestRegisterRouteMapsDuplicateEmail(t *testing.T) {
	server := New(ServerConfig{UserClient: duplicateEmailUserClient{}})
	body := []byte(`{"email":"rin@example.com","username":"rin_user","password":"very-secure-password","locale":"zh-CN"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	server.ServeHTTP(res, req)

	if res.Code != http.StatusConflict {
		t.Fatalf("status = %d body = %s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["message"] != "email is already registered" {
		t.Fatalf("message = %v", payload["message"])
	}
}

func TestLoginRoute(t *testing.T) {
	server := New(ServerConfig{UserClient: fakeUserClient{}})
	body := []byte(`{"login":"rin@example.com","password":"very-secure-password"}`)
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	server.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["userId"] != "usr_login" {
		t.Fatalf("userId = %v", payload["userId"])
	}
}

func TestGetUserProfileRoute(t *testing.T) {
	server := New(ServerConfig{UserClient: fakeUserClient{}})
	req := httptest.NewRequest(http.MethodGet, "/v1/users/usr_login", nil)
	res := httptest.NewRecorder()

	server.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d body = %s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload["role"] != "admin" {
		t.Fatalf("role = %v", payload["role"])
	}
	if payload["username"] != "rin_user" {
		t.Fatalf("username = %v", payload["username"])
	}
}
