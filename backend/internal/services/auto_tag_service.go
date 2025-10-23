package services

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// AutoTagService handles automatic tag generation for clips
type AutoTagService struct {
	tagRepo *repository.TagRepository
}

// NewAutoTagService creates a new AutoTagService
func NewAutoTagService(tagRepo *repository.TagRepository) *AutoTagService {
	return &AutoTagService{
		tagRepo: tagRepo,
	}
}

// TagPattern represents a pattern to match for auto-tagging
type TagPattern struct {
	Pattern *regexp.Regexp
	TagName string
	TagSlug string
	Color   *string
}

var (
	// Common gaming action patterns
	tagPatterns = []TagPattern{
		{
			Pattern: regexp.MustCompile(`(?i)\b(ace|5k|team wipe|team kill)\b`),
			TagName: "Ace",
			TagSlug: "ace",
			Color:   stringPtr("#FF6B6B"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(clutch|1v[2-5])\b`),
			TagName: "Clutch",
			TagSlug: "clutch",
			Color:   stringPtr("#FFA500"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(fail|fails|failed|epic fail)\b`),
			TagName: "Fail",
			TagSlug: "fail",
			Color:   stringPtr("#8B4513"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(rage|raging|angry|mad)\b`),
			TagName: "Rage",
			TagSlug: "rage",
			Color:   stringPtr("#DC143C"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(funny|lol|lmao|hilarious|comedy)\b`),
			TagName: "Funny",
			TagSlug: "funny",
			Color:   stringPtr("#FFD700"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(insane|crazy|amazing|incredible)\b`),
			TagName: "Insane",
			TagSlug: "insane",
			Color:   stringPtr("#9370DB"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(lucky|luck|rng)\b`),
			TagName: "Lucky",
			TagSlug: "lucky",
			Color:   stringPtr("#32CD32"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(bug|glitch|broken)\b`),
			TagName: "Bug",
			TagSlug: "bug",
			Color:   stringPtr("#696969"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(toxic|salt|salty)\b`),
			TagName: "Toxic",
			TagSlug: "toxic",
			Color:   stringPtr("#8B008B"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(epic|legendary|godlike)\b`),
			TagName: "Epic",
			TagSlug: "epic",
			Color:   stringPtr("#FF1493"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(noob|newbie|beginner)\b`),
			TagName: "Noob",
			TagSlug: "noob",
			Color:   stringPtr("#A9A9A9"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(pro|professional|skilled)\b`),
			TagName: "Pro",
			TagSlug: "pro",
			Color:   stringPtr("#4169E1"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(highlight|best|top)\b`),
			TagName: "Highlight",
			TagSlug: "highlight",
			Color:   stringPtr("#00CED1"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(speedrun|speed run|wr|world record)\b`),
			TagName: "Speedrun",
			TagSlug: "speedrun",
			Color:   stringPtr("#FF4500"),
		},
		{
			Pattern: regexp.MustCompile(`(?i)\b(tutorial|guide|how to)\b`),
			TagName: "Tutorial",
			TagSlug: "tutorial",
			Color:   stringPtr("#4682B4"),
		},
	}
)

// GenerateTagsForClip automatically generates tags for a clip
func (s *AutoTagService) GenerateTagsForClip(ctx context.Context, clip *models.Clip) ([]string, error) {
	var tagSlugs []string
	seenTags := make(map[string]bool)

	// Pattern-based tagging from title
	title := clip.Title
	for _, pattern := range tagPatterns {
		if pattern.Pattern.MatchString(title) {
			if !seenTags[pattern.TagSlug] {
				tagSlugs = append(tagSlugs, pattern.TagSlug)
				seenTags[pattern.TagSlug] = true

				// Ensure tag exists in database
				_, err := s.tagRepo.GetOrCreateTag(ctx, pattern.TagName, pattern.TagSlug, pattern.Color)
				if err != nil {
					// Log error but continue with other tags
					continue
				}
			}
		}
	}

	// Add game name as tag
	if clip.GameName != nil && *clip.GameName != "" {
		gameSlug := slugify(*clip.GameName)
		if !seenTags[gameSlug] && len(gameSlug) > 0 {
			tagSlugs = append(tagSlugs, gameSlug)
			seenTags[gameSlug] = true

			// Create game tag
			color := stringPtr("#4169E1")
			_, err := s.tagRepo.GetOrCreateTag(ctx, *clip.GameName, gameSlug, color)
			if err != nil {
				// Log error but continue
			}
		}
	}

	// Add broadcaster name as tag
	if clip.BroadcasterName != "" {
		broadcasterSlug := slugify(clip.BroadcasterName)
		if !seenTags[broadcasterSlug] && len(broadcasterSlug) > 0 {
			tagSlugs = append(tagSlugs, broadcasterSlug)
			seenTags[broadcasterSlug] = true

			// Create broadcaster tag
			color := stringPtr("#9146FF")
			_, err := s.tagRepo.GetOrCreateTag(ctx, clip.BroadcasterName, broadcasterSlug, color)
			if err != nil {
				// Log error but continue
			}
		}
	}

	// Duration-based tagging
	if clip.Duration != nil {
		if *clip.Duration < 15 {
			if !seenTags["short"] {
				tagSlugs = append(tagSlugs, "short")
				seenTags["short"] = true
				color := stringPtr("#20B2AA")
				_, _ = s.tagRepo.GetOrCreateTag(ctx, "Short", "short", color)
			}
		} else if *clip.Duration > 120 {
			if !seenTags["long"] {
				tagSlugs = append(tagSlugs, "long")
				seenTags["long"] = true
				color := stringPtr("#8B4513")
				_, _ = s.tagRepo.GetOrCreateTag(ctx, "Long", "long", color)
			}
		}
	}

	// Language tagging
	if clip.Language != nil && *clip.Language != "" {
		langTag := getLanguageTag(*clip.Language)
		if langTag != "" && !seenTags[langTag] {
			tagSlugs = append(tagSlugs, langTag)
			seenTags[langTag] = true

			langName := getLanguageName(*clip.Language)
			color := stringPtr("#708090")
			_, _ = s.tagRepo.GetOrCreateTag(ctx, langName, langTag, color)
		}
	}

	return tagSlugs, nil
}

// ApplyAutoTags generates and applies tags to a clip
func (s *AutoTagService) ApplyAutoTags(ctx context.Context, clip *models.Clip) error {
	// Generate tag slugs
	tagSlugs, err := s.GenerateTagsForClip(ctx, clip)
	if err != nil {
		return fmt.Errorf("failed to generate tags: %w", err)
	}

	// Apply each tag to the clip
	for _, slug := range tagSlugs {
		tag, err := s.tagRepo.GetBySlug(ctx, slug)
		if err != nil {
			continue // Skip if tag doesn't exist
		}

		// Add tag to clip
		err = s.tagRepo.AddTagToClip(ctx, clip.ID, tag.ID)
		if err != nil {
			// Log error but continue with other tags
			continue
		}
	}

	return nil
}

// slugify converts a string to a URL-friendly slug
func slugify(s string) string {
	// Convert to lowercase
	s = strings.ToLower(s)

	// Remove special characters, keep alphanumeric and spaces
	reg := regexp.MustCompile(`[^a-z0-9\s-]`)
	s = reg.ReplaceAllString(s, "")

	// Replace spaces with hyphens
	s = strings.TrimSpace(s)
	s = regexp.MustCompile(`\s+`).ReplaceAllString(s, "-")

	// Remove multiple consecutive hyphens
	s = regexp.MustCompile(`-+`).ReplaceAllString(s, "-")

	// Trim hyphens from start and end
	s = strings.Trim(s, "-")

	// Limit length
	if len(s) > 50 {
		s = s[:50]
		s = strings.TrimRight(s, "-")
	}

	return s
}

// getLanguageTag converts language code to tag slug
func getLanguageTag(langCode string) string {
	langMap := map[string]string{
		"en": "english",
		"es": "spanish",
		"fr": "french",
		"de": "german",
		"it": "italian",
		"pt": "portuguese",
		"ru": "russian",
		"ja": "japanese",
		"ko": "korean",
		"zh": "chinese",
		"ar": "arabic",
		"hi": "hindi",
		"tr": "turkish",
		"pl": "polish",
		"nl": "dutch",
		"sv": "swedish",
		"no": "norwegian",
		"fi": "finnish",
		"da": "danish",
	}

	if tag, ok := langMap[langCode]; ok {
		return tag
	}
	return ""
}

// getLanguageName converts language code to full name
func getLanguageName(langCode string) string {
	nameMap := map[string]string{
		"en": "English",
		"es": "Spanish",
		"fr": "French",
		"de": "German",
		"it": "Italian",
		"pt": "Portuguese",
		"ru": "Russian",
		"ja": "Japanese",
		"ko": "Korean",
		"zh": "Chinese",
		"ar": "Arabic",
		"hi": "Hindi",
		"tr": "Turkish",
		"pl": "Polish",
		"nl": "Dutch",
		"sv": "Swedish",
		"no": "Norwegian",
		"fi": "Finnish",
		"da": "Danish",
	}

	if name, ok := nameMap[langCode]; ok {
		return name
	}
	return langCode
}
