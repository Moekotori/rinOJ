package grpcserver

import (
	"context"
	"fmt"
	"testing"

	userv1 "github.com/rin-oj/rin-oj/packages/sdk-go/rin/user/v1"
	"github.com/rin-oj/rin-oj/services/user-service/internal/app"
	"github.com/rin-oj/rin-oj/services/user-service/internal/domain"
)

type seqIDGen int

func (s *seqIDGen) NewID(prefix string) string {
	*s++
	return fmt.Sprintf("%s_%d", prefix, *s)
}

func TestCheckPermissionInjectsRoleAndEvaluatesPolicy(t *testing.T) {
	mem := app.NewMemoryRepository()
	var ids seqIDGen
	svc := app.NewService(mem, &ids)

	sess, err := svc.Register(context.Background(), &userv1.RegisterRequest{
		Email:    "student@example.com",
		Username: "student_u",
		Password: "very-secure-password",
		Locale:   "zh-CN",
	})
	if err != nil {
		t.Fatal(err)
	}
	grpcS := New(svc, domain.NewPermissionService())

	res, err := grpcS.CheckPermission(context.Background(), &userv1.CheckPermissionRequest{
		ActorId:  sess.GetUserId(),
		Action:   "problem.delete",
		Resource: "problem:p1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if res.GetAllowed() {
		t.Fatalf("student should be denied, got reason %q", res.GetReason())
	}

	if err := mem.SetUserRole(context.Background(), sess.GetUserId(), "admin"); err != nil {
		t.Fatal(err)
	}
	res, err = grpcS.CheckPermission(context.Background(), &userv1.CheckPermissionRequest{
		ActorId:  sess.GetUserId(),
		Action:   "problem.delete",
		Resource: "problem:p1",
	})
	if err != nil {
		t.Fatal(err)
	}
	if !res.GetAllowed() {
		t.Fatalf("admin should be allowed, got reason %q", res.GetReason())
	}
}
