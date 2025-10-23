package utils

import "testing"

func TestStringPtr(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected *string
	}{
		{
			name:     "Non-empty string",
			input:    "test",
			expected: StringPtr("test"),
		},
		{
			name:     "Empty string",
			input:    "",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StringPtr(tt.input)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("Expected nil, got %v", result)
				}
			} else {
				if result == nil || *result != *tt.expected {
					t.Errorf("Expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestFloat64Ptr(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected *float64
	}{
		{
			name:     "Non-zero value",
			input:    30.5,
			expected: Float64Ptr(30.5),
		},
		{
			name:     "Zero value",
			input:    0,
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Float64Ptr(tt.input)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("Expected nil, got %v", result)
				}
			} else {
				if result == nil || *result != *tt.expected {
					t.Errorf("Expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestMin(t *testing.T) {
	tests := []struct {
		name     string
		a        int
		b        int
		expected int
	}{
		{
			name:     "a is smaller",
			a:        5,
			b:        10,
			expected: 5,
		},
		{
			name:     "b is smaller",
			a:        10,
			b:        5,
			expected: 5,
		},
		{
			name:     "equal values",
			a:        5,
			b:        5,
			expected: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := Min(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("Expected %d, got %d", tt.expected, result)
			}
		})
	}
}
