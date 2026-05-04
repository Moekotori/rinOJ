// Package adminserver exposes a minimal internal HTTP API for admin-only
// mutations that don't fit the public gRPC surface, such as role changes.
// This server must NOT be exposed to the public internet; it is intended only
// for internal calls from the gateway after it has verified the actor is admin.
package adminserver

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
)

type Service interface {
	UpdateUserRole(ctx context.Context, actorID, targetUserID, role string) error
}

type Server struct {
	service Service
}

func New(service Service) *Server {
	return &Server{service: service}
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// PATCH /users/:userId/role
	path := strings.TrimPrefix(r.URL.Path, "/")
	parts := strings.Split(path, "/")
	if r.Method == http.MethodPatch && len(parts) == 3 && parts[0] == "users" && parts[2] == "role" {
		s.handleUpdateRole(w, r, parts[1])
		return
	}
	writeJSON(w, http.StatusNotFound, map[string]string{"message": "not found"})
}

type updateRoleRequest struct {
	Role string `json:"role"`
}

type updateRoleResponse struct {
	UserID string `json:"userId"`
	Role   string `json:"role"`
}

func (s *Server) handleUpdateRole(w http.ResponseWriter, r *http.Request, targetUserID string) {
	actorID := strings.TrimSpace(r.Header.Get("X-Rin-Actor-ID"))
	if actorID == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"message": "missing actor identity"})
		return
	}

	var req updateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": "invalid request body"})
		return
	}

	if err := s.service.UpdateUserRole(r.Context(), actorID, targetUserID, req.Role); err != nil {
		if errors.Is(err, app.ErrForbidden) {
			writeJSON(w, http.StatusForbidden, map[string]string{"message": "admin role required"})
			return
		}
		if errors.Is(err, app.ErrUserNotFound) {
			writeJSON(w, http.StatusNotFound, map[string]string{"message": "user not found"})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{"message": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, updateRoleResponse{
		UserID: targetUserID,
		Role:   req.Role,
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
