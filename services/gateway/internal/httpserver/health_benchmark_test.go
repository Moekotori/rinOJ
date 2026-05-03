package httpserver

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func BenchmarkHealthz(b *testing.B) {
	server := New(ServerConfig{
		ServiceName: "gateway",
		Version:     "bench",
	})
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			b.Fatalf("expected 200, got %d", rec.Code)
		}
	}
}
