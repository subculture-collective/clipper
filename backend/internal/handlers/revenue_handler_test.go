package handlers

import (
	"testing"
)

func TestNewRevenueHandler(t *testing.T) {
	handler := NewRevenueHandler(nil)

	if handler == nil {
		t.Error("Expected handler to be created")
	}
}
