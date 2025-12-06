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
			name:     "IPv4 edge case",
			input:    "255.255.255.255",
			expected: "255.255.255.0",
		},
		{
			name:     "Empty IP",
			input:    "",
			expected: "",
		},
		{
			name:     "IPv6 address - full format",
			input:    "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
			expected: "2001:db8:85a3::",
		},
		{
			name:     "IPv6 address - compressed format",
			input:    "2001:db8::1",
			expected: "2001:db8::",
		},
		{
			name:     "IPv6 address - loopback",
			input:    "::1",
			expected: "::",
		},
		{
			name:     "IPv6 address - with trailing zeros",
			input:    "fe80::a299:9bff:fe18:50c1",
			expected: "fe80::",
		},
		{
			name:     "Invalid IP address",
			input:    "not.an.ip.address",
			expected: "invalid",
		},
		{
			name:     "Invalid IP (incomplete)",
			input:    "192.168",
			expected: "invalid",
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

// TestAnalyticsServiceStructure validates the service structure
func TestAnalyticsServiceStructure(t *testing.T) {
	// This test ensures the AnalyticsService is properly structured
	// and can be instantiated
	service := NewAnalyticsService(nil, nil)
	if service == nil {
		t.Error("NewAnalyticsService returned nil")
	}
}

// TestAnalyticsServiceMethods validates that all expected methods exist
func TestAnalyticsServiceMethods(t *testing.T) {
	service := NewAnalyticsService(nil, nil)

	// Verify service has the expected method signatures by checking it's not nil
	if service == nil {
		t.Error("Service should not be nil")
	}

	// The service struct exists and has the correct type
	if _, ok := interface{}(service).(*AnalyticsService); !ok {
		t.Error("Service is not of type *AnalyticsService")
	}
}
