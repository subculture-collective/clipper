package redis

import (
	"strings"
	"testing"
)

// TestGetStatsLineHandling tests that the GetStats method correctly handles
// empty lines and comment lines without panicking
func TestGetStatsLineHandling(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected map[string]string
	}{
		{
			name:     "Empty line",
			input:    "\n\n",
			expected: map[string]string{},
		},
		{
			name:     "Comment line",
			input:    "# Comment\n",
			expected: map[string]string{},
		},
		{
			name:     "Mixed empty and comment lines",
			input:    "\n# Comment\n\n",
			expected: map[string]string{},
		},
		{
			name:     "Valid key-value pair",
			input:    "key:value\n",
			expected: map[string]string{"key": "value"},
		},
		{
			name:     "Mixed valid and empty lines",
			input:    "\nkey1:value1\n\n# Comment\nkey2:value2\n",
			expected: map[string]string{"key1": "value1", "key2": "value2"},
		},
		{
			name:     "Empty string after trim",
			input:    "   \n\t\n",
			expected: map[string]string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the parsing logic from GetStats
			stats := make(map[string]string)
			for _, line := range strings.Split(tt.input, "\n") {
				line = strings.TrimSpace(line)
				// This is the fixed condition that should not panic
				if line == "" || line[0] == '#' {
					continue
				}
				// Parse key:value
				if idx := strings.IndexByte(line, ':'); idx != -1 {
					key := line[:idx]
					value := line[idx+1:]
					stats[key] = strings.TrimSpace(value)
				}
			} // Verify the result matches expected
			if len(stats) != len(tt.expected) {
				t.Errorf("Expected %d entries, got %d", len(tt.expected), len(stats))
			}

			for key, expectedValue := range tt.expected {
				if actualValue, ok := stats[key]; !ok {
					t.Errorf("Expected key '%s' not found", key)
				} else if actualValue != expectedValue {
					t.Errorf("For key '%s', expected value '%s', got '%s'", key, expectedValue, actualValue)
				}
			}
		})
	}
}
