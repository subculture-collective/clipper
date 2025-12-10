package utils

import (
	"fmt"
	"regexp"
	"strings"
)

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

// StringOrDefault returns the value of s if it's not nil and not empty, otherwise returns the value of def
func StringOrDefault(s, def *string) string {
	if s != nil && *s != "" {
		return *s
	}
	if def != nil {
		return *def
	}
	return ""
}

// Float64OrDefault returns the value of the float64 pointer or the default if nil.
// Unlike Float64Ptr which treats zero as falsy, this function only checks for nil,
// allowing zero to be a valid value when explicitly set.
func Float64OrDefault(f *float64, defaultValue float64) float64 {
	if f != nil {
		return *f
	}
	return defaultValue
}

// Min returns the minimum of two integers.
func Min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// SQLPlaceholder returns a PostgreSQL placeholder string for the given argument position.
// For example, SQLPlaceholder(1) returns "$1", SQLPlaceholder(2) returns "$2", etc.
func SQLPlaceholder(position int) string {
	return fmt.Sprintf("$%d", position)
}

// GenerateSlug creates a URL-friendly slug from the given text
func GenerateSlug(text string) string {
	// Convert to lowercase
	slug := strings.ToLower(text)
	
	// Replace spaces and underscores with hyphens
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, "_", "-")
	
	// Remove all non-alphanumeric characters except hyphens
	reg := regexp.MustCompile("[^a-z0-9-]+")
	slug = reg.ReplaceAllString(slug, "")
	
	// Replace multiple consecutive hyphens with a single hyphen
	reg = regexp.MustCompile("-+")
	slug = reg.ReplaceAllString(slug, "-")
	
	// Trim hyphens from start and end
	slug = strings.Trim(slug, "-")
	
	return slug
}
