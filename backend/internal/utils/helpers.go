package utils

// StringPtr returns a pointer to a string. If the string is empty, it returns nil.
func StringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// Float64Ptr returns a pointer to a float64. If the value is 0, it returns nil.
func Float64Ptr(f float64) *float64 {
	if f == 0 {
		return nil
	}
	return &f
}

// Min returns the minimum of two integers.
func Min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// StringOrDefault returns the value of s if it's not nil and not empty, otherwise returns the value of def
func StringOrDefault(s *string, def *string) string {
	if s != nil && *s != "" {
		return *s
	}
	if def != nil {
		return *def
	}
	return ""
}
