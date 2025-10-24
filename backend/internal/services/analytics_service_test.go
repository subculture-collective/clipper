package services

import (
	"testing"
)

// Test anonymizeIP function
func TestAnonymizeIP(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "IPv4 address",
			input:    "192.168.1.100",
			expected: "192.168.1.0",
		},
		{
			name:     "Another IPv4 address",
			input:    "10.0.0.1",
			expected: "10.0.0.0",
		},
		{
			name:     "Empty IP",
			input:    "",
			expected: "",
		},
		{
			name:     "IPv6 address (truncated)",
			input:    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
			expected: "2001:0db8:...",
		},
		{
			name:     "Invalid IP (short)",
			input:    "192.168",
			expected: "192.0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := anonymizeIP(tt.input)
			if result != tt.expected {
				t.Errorf("anonymizeIP(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
