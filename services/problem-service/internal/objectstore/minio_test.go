package objectstore

import (
	"testing"
	"time"
)

func TestUploadExpiryBounds(t *testing.T) {
	if err := ValidateUploadExpiry(30 * time.Second); err == nil {
		t.Fatal("expected too-short expiry error")
	}
	if err := ValidateUploadExpiry(2 * time.Hour); err == nil {
		t.Fatal("expected too-long expiry error")
	}
	if err := ValidateUploadExpiry(15 * time.Minute); err != nil {
		t.Fatalf("expected valid expiry: %v", err)
	}
}
