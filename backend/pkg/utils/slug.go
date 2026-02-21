package utils

import (
	"regexp"
	"strings"
)

var (
	slugNonAlphanumeric = regexp.MustCompile(`[^a-z0-9\s-]`)
	slugMultipleSpaces  = regexp.MustCompile(`\s+`)
	slugMultipleHyphens = regexp.MustCompile(`-+`)
)

// Slugify converts a string to a URL-friendly slug.
// Lowercases, strips non-alphanumeric characters, replaces spaces/underscores
// with hyphens, and collapses consecutive hyphens.
func Slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, "_", "-")
	s = slugNonAlphanumeric.ReplaceAllString(s, "")
	s = strings.TrimSpace(s)
	s = slugMultipleSpaces.ReplaceAllString(s, "-")
	s = slugMultipleHyphens.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}
