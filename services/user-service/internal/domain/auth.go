package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"
)

type TokenGenerator interface {
	Generate(kind string) string
}

// StaticTokenGenerator is only for tests and the early skeleton.
// AuthService depends on the TokenGenerator interface so production can swap in
// signed JWTs without rewriting registration/login domain rules.
type StaticTokenGenerator struct {
	Prefix string
}

func (g StaticTokenGenerator) Generate(kind string) string {
	prefix := g.Prefix
	if prefix == "" {
		prefix = "static"
	}
	return fmt.Sprintf("%s_%s_%d", prefix, kind, time.Now().UnixNano())
}

type AuthService struct {
	tokenGenerator TokenGenerator
	usersByEmail   map[string]storedUser
}

// storedUser keeps credential details away from the public User shape.
// This mirrors the future database split: profile fields are safe to project,
// while password hashes and auth factors stay in private auth tables.
type storedUser struct {
	user         User
	passwordHash string
}

type User struct {
	ID            string
	Email         string
	Username      string
	Locale        string
	EmailVerified bool
}

type RegisterInput struct {
	Email    string
	Username string
	Password string
	Locale   string
}

type LoginInput struct {
	Login    string
	Password string
	TOTPCode string
}

type AuthSession struct {
	User         User
	AccessToken  string
	RefreshToken string
}

func NewAuthService(generator TokenGenerator) *AuthService {
	if generator == nil {
		generator = StaticTokenGenerator{}
	}
	return &AuthService{
		tokenGenerator: generator,
		usersByEmail:   make(map[string]storedUser),
	}
}

func (s *AuthService) Register(input RegisterInput) (AuthSession, error) {
	// Normalize before validation and storage. This prevents duplicate accounts
	// such as "Rin@Example.com" and "rin@example.com".
	email, err := normalizeEmail(input.Email)
	if err != nil {
		return AuthSession{}, err
	}
	if err := validateUsername(input.Username); err != nil {
		return AuthSession{}, err
	}
	if err := validatePassword(input.Password); err != nil {
		return AuthSession{}, err
	}
	if _, exists := s.usersByEmail[email]; exists {
		return AuthSession{}, errors.New("email already registered")
	}

	// New users start with an unverified email. Features that need trust should
	// check this flag instead of assuming registration is enough.
	user := User{
		ID:            s.tokenGenerator.Generate("usr"),
		Email:         email,
		Username:      strings.TrimSpace(input.Username),
		Locale:        normalizeLocale(input.Locale),
		EmailVerified: false,
	}
	s.usersByEmail[email] = storedUser{
		user:         user,
		passwordHash: hashPassword(input.Password),
	}

	return s.newSession(user), nil
}

func (s *AuthService) Login(input LoginInput) (AuthSession, error) {
	// Return one generic login error so attackers cannot learn whether an email
	// exists by comparing error messages.
	login, err := normalizeEmail(input.Login)
	if err != nil {
		return AuthSession{}, errors.New("invalid login")
	}
	stored, exists := s.usersByEmail[login]
	if !exists {
		return AuthSession{}, errors.New("invalid login")
	}
	if stored.passwordHash != hashPassword(input.Password) {
		return AuthSession{}, errors.New("invalid login")
	}
	return s.newSession(stored.user), nil
}

func (s *AuthService) newSession(user User) AuthSession {
	return AuthSession{
		User:         user,
		AccessToken:  s.tokenGenerator.Generate("access"),
		RefreshToken: s.tokenGenerator.Generate("refresh"),
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

func validateUsername(value string) error {
	value = strings.TrimSpace(value)
	if len(value) < 3 {
		return errors.New("username must be at least 3 characters")
	}
	if len(value) > 32 {
		return errors.New("username must be at most 32 characters")
	}
	return nil
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
	// Development placeholder: production auth must replace this with a slow,
	// memory-hard password hash before real user data is accepted.
	sum := sha256.Sum256([]byte("rin-oj-dev-salt:" + value))
	return hex.EncodeToString(sum[:])
}
