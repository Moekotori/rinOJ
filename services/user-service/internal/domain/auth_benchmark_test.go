package domain

import (
	"fmt"
	"testing"
)

func BenchmarkRegister(b *testing.B) {
	service := NewAuthService(StaticTokenGenerator{Prefix: "bench"})

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_, err := service.Register(RegisterInput{
			Email:    fmt.Sprintf("student-%d@example.com", i),
			Username: fmt.Sprintf("rin_%d", i),
			Password: "correct horse battery staple",
			Locale:   "zh-CN",
		})
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkLogin(b *testing.B) {
	service := NewAuthService(StaticTokenGenerator{Prefix: "bench"})
	_, err := service.Register(RegisterInput{
		Email:    "student@example.com",
		Username: "rin_student",
		Password: "correct horse battery staple",
		Locale:   "zh-CN",
	})
	if err != nil {
		b.Fatal(err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.Login(LoginInput{
			Login:    "student@example.com",
			Password: "correct horse battery staple",
		})
		if err != nil {
			b.Fatal(err)
		}
	}
}
