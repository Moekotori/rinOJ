package app

import (
	"context"
	"errors"
	"sync"
)

type MemoryRepository struct {
	mu          sync.RWMutex
	usersByID   map[string]UserRecord
	usersByMail map[string]string
	usersByName map[string]string
}

func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		usersByID:   make(map[string]UserRecord),
		usersByMail: make(map[string]string),
		usersByName: make(map[string]string),
	}
}

func (r *MemoryRepository) CreateUser(_ context.Context, user UserRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.usersByMail[user.Email]; exists {
		return ErrEmailAlreadyRegistered
	}
	if _, exists := r.usersByName[user.Username]; exists {
		return ErrUsernameAlreadyRegistered
	}
	r.usersByID[user.UserID] = user
	r.usersByMail[user.Email] = user.UserID
	r.usersByName[user.Username] = user.UserID
	return nil
}

func (r *MemoryRepository) GetUser(_ context.Context, userID string) (UserRecord, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	user, ok := r.usersByID[userID]
	if !ok {
		return UserRecord{}, errors.New("user not found")
	}
	return user, nil
}

func (r *MemoryRepository) GetUserByLogin(_ context.Context, login string) (UserRecord, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	userID, ok := r.usersByMail[login]
	if !ok {
		userID, ok = r.usersByName[login]
	}
	if !ok {
		return UserRecord{}, errors.New("user not found")
	}
	return r.usersByID[userID], nil
}
