package domain

type PermissionService struct{}

type CheckPermissionInput struct {
	ActorID    string
	Action     string
	Resource   string
	Attributes map[string]string
}

type PermissionDecision struct {
	Allowed bool
	Reason  string
}

func NewPermissionService() *PermissionService {
	return &PermissionService{}
}

func (s *PermissionService) CheckPermission(input CheckPermissionInput) PermissionDecision {
	if input.Attributes["role"] == "admin" {
		return PermissionDecision{Allowed: true, Reason: "admin role"}
	}
	if input.Attributes["owner_id"] == input.ActorID && input.ActorID != "" {
		return PermissionDecision{Allowed: true, Reason: "resource owner"}
	}
	return PermissionDecision{Allowed: false, Reason: "permission denied"}
}
