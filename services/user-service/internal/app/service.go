package app

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
)

type Repository interface {
	CreateUser(ctx context.Context, user UserRecord) error
	GetUser(ctx context.Context, userID string) (UserRecord, error)
	GetUserByLogin(ctx context.Context, login string) (UserRecord, error)
	UpdateUserRole(ctx context.Context, userID, role string) error
}

var ErrUserNotFound = errors.New("user not found")
var ErrForbidden = errors.New("forbidden")

var (
	ErrEmailAlreadyRegistered    = errors.New("email is already registered")
	ErrUsernameAlreadyRegistered = errors.New("username is already registered")
	ErrInvalidLogin              = errors.New("email/username or password is incorrect")
)

type UserRecord struct {
	UserID       string
	Email        string
	Username     string
	PasswordHash string
	Locale       string
	Role         string
	CreatedAt    time.Time
}

type IDGenerator interface {
	NewID(prefix string) string
}

type RandomIDGenerator struct{}

func (RandomIDGenerator) NewID(prefix string) string {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return prefix + "_" + hex.EncodeToString(bytes[:])
}

type Service struct {
	repository Repository
	ids        IDGenerator
	now        func() time.Time
}

func NewService(repository Repository, ids IDGenerator) *Service {
	if ids == nil {
		ids = RandomIDGenerator{}
	}
	return &Service{
		repository: repository,
		ids:        ids,
		now:        func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) Register(ctx context.Context, req *userv1.RegisterRequest) (*userv1.AuthSession, error) {
	email, err := normalizeEmail(req.GetEmail())
	if err != nil {
		return nil, err
	}
	username, err := normalizeUsername(req.GetUsername())
	if err != nil {
		return nil, err
	}
	if err := validatePassword(req.GetPassword()); err != nil {
		return nil, err
	}

	userID := s.ids.NewID("usr")
	user := UserRecord{
		UserID:       userID,
		Email:        email,
		Username:     username,
		PasswordHash: hashPassword(req.GetPassword()),
		Locale:       normalizeLocale(req.GetLocale()),
		Role:         defaultUserRole(),
		CreatedAt:    s.now(),
	}
	if err := s.repository.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return s.newSession(userID, user.Role), nil
}

func (s *Service) Login(ctx context.Context, req *userv1.LoginRequest) (*userv1.AuthSession, error) {
	login := strings.TrimSpace(strings.ToLower(req.GetLogin()))
	if login == "" {
		return nil, errors.New("login is required")
	}
	user, err := s.repository.GetUserByLogin(ctx, login)
	if err != nil {
		return nil, ErrInvalidLogin
	}
	if user.PasswordHash != hashPassword(req.GetPassword()) {
		return nil, ErrInvalidLogin
	}
	return s.newSession(user.UserID, user.Role), nil
}

func (s *Service) GetProfile(ctx context.Context, identifier string) (*userv1.UserProfile, error) {
	identifier = strings.TrimSpace(identifier)
	if identifier == "" {
		return nil, errors.New("user id or username is required")
	}

	user, err := s.repository.GetUser(ctx, identifier)
	if err != nil {
		user, err = s.repository.GetUserByLogin(ctx, strings.ToLower(identifier))
		if err != nil {
			return nil, err
		}
	}
	return &userv1.UserProfile{
		UserId:      user.UserID,
		Username:    user.Username,
		DisplayName: user.Username,
		Locale:      user.Locale,
		Role:        NormalizeUserRole(user.Role),
	}, nil
}

// UpdateUserRole changes the role of targetUserID. The caller (actorID) must
// already hold the admin role. This is validated here and again at the HTTP
// layer so there are two independent guards.
func (s *Service) UpdateUserRole(ctx context.Context, actorID, targetUserID, role string) error {
	actorID = strings.TrimSpace(actorID)
	targetUserID = strings.TrimSpace(targetUserID)
	if actorID == "" {
		return errors.New("actor id is required")
	}
	if targetUserID == "" {
		return errors.New("target user id is required")
	}
	normalized := NormalizeUserRole(role)
	if normalized == "" {
		return errors.New("role must be one of: admin, teacher, student")
	}
	actorRole, ok := s.ActorRole(ctx, actorID)
	if !ok || actorRole != "admin" {
		return ErrForbidden
	}
	return s.repository.UpdateUserRole(ctx, targetUserID, normalized)
}

// ActorRole returns the canonical role for permission checks, or ("", false) if the user is unknown.
func (s *Service) ActorRole(ctx context.Context, userID string) (string, bool) {
	if strings.TrimSpace(userID) == "" {
		return "", false
	}
	user, err := s.repository.GetUser(ctx, userID)
	if err != nil {
		return "", false
	}
	return NormalizeUserRole(user.Role), true
}

func (s *Service) newSession(userID, role string) *userv1.AuthSession {
	accessExpires := s.now().Add(15 * time.Minute)
	refreshExpires := s.now().Add(30 * 24 * time.Hour)
	return &userv1.AuthSession{
		UserId:               userID,
		AccessToken:          s.ids.NewID("access"),
		RefreshToken:         s.ids.NewID("refresh"),
		AccessExpiresAtUnix:  accessExpires.Unix(),
		RefreshExpiresAtUnix: refreshExpires.Unix(),
		Role:                 NormalizeUserRole(role),
	}
}

func defaultUserRole() string {
	return "student"
}

// NormalizeUserRole maps stored role strings to the canonical set used by auth and permission checks.
func NormalizeUserRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "admin":
		return "admin"
	case "teacher":
		return "teacher"
	case "student":
		return "student"
	default:
		return "student"
	}
}

func normalizeEmail(value string) (string, error) {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return "", errors.New("email is required")
	}
	if _, err := mail.ParseAddress(value); err != nil {
		return "", errors.New("email is invalid")
	}
	return value, nil
}

func normalizeUsername(value string) (string, error) {
	value = strings.TrimSpace(value)
	if len(value) < 3 {
		return "", errors.New("username must be at least 3 characters")
	}
	if len(value) > 32 {
		return "", errors.New("username must be at most 32 characters")
	}
	return value, nil
}

func validatePassword(value string) error {
	if len(value) < 12 {
		return errors.New("password must be at least 12 characters")
	}
	return nil
}

func normalizeLocale(value string) string {
	switch value {
	case "zh-CN", "en-US", "ja-JP":
		return value
	default:
		return "zh-CN"
	}
}

func hashPassword(value string) string {
	// Development placeholder: replace with Argon2id before accepting real users.
	sum := sha256.Sum256([]byte("rin-oj-dev-salt:" + value))
	return hex.EncodeToString(sum[:])
}
