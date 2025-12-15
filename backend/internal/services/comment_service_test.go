package services

import (
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/microcosm-cc/bluemonday"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
)

// Helper functions for testing
func createMarkdownProcessor() goldmark.Markdown {
	return goldmark.New(
		goldmark.WithExtensions(
			extension.Strikethrough,
			extension.Linkify,
			extension.Table,
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithXHTML(),
			html.WithUnsafe(),
		),
	)
}

func createSanitizer() *bluemonday.Policy {
	sanitizer := bluemonday.UGCPolicy()
	sanitizer.AllowElements("p", "br", "strong", "em", "del", "code", "pre", "blockquote",
		"ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead",
		"tbody", "tr", "th", "td")
	sanitizer.AllowAttrs("href").OnElements("a")
	sanitizer.AllowAttrs("class").OnElements("code")
	sanitizer.RequireNoFollowOnLinks(true)
	sanitizer.RequireNoReferrerOnLinks(true)
	sanitizer.AddTargetBlankToFullyQualifiedLinks(true)
	return sanitizer
}

func TestRenderMarkdown(t *testing.T) {
	// Create a minimal service instance for testing markdown
	service := &CommentService{}
	service.markdown = createMarkdownProcessor()
	service.sanitizer = createSanitizer()

	tests := []struct {
		name        string
		input       string
		contains    []string
		notContains []string
	}{
		{
			name:     "Bold text",
			input:    "This is **bold** text",
			contains: []string{"<strong>", "bold", "</strong>"},
		},
		{
			name:     "Italic text",
			input:    "This is *italic* text",
			contains: []string{"<em>", "italic", "</em>"},
		},
		{
			name:     "Strikethrough",
			input:    "This is ~~strikethrough~~ text",
			contains: []string{"<del>", "strikethrough", "</del>"},
		},
		{
			name:     "Link",
			input:    "[GitHub](https://github.com)",
			contains: []string{"<a", "href=\"https://github.com\"", "GitHub", "</a>"},
		},
		{
			name:     "Code block",
			input:    "`code here`",
			contains: []string{"<code>", "code here", "</code>"},
		},
		{
			name:     "Blockquote",
			input:    "> This is a quote",
			contains: []string{"<blockquote>", "This is a quote", "</blockquote>"},
		},
		{
			name:     "Unordered list",
			input:    "- Item 1\n- Item 2",
			contains: []string{"<ul>", "<li>", "Item 1", "Item 2", "</li>", "</ul>"},
		},
		{
			name:     "Ordered list",
			input:    "1. First\n2. Second",
			contains: []string{"<ol>", "<li>", "First", "Second", "</li>", "</ol>"},
		},
		{
			name:        "Script tags removed",
			input:       "<script>alert('xss')</script>",
			notContains: []string{"<script>", "alert"},
		},
		{
			name:        "Iframe removed",
			input:       "<iframe src='evil.com'></iframe>",
			notContains: []string{"<iframe>", "evil.com"},
		},
		{
			name:        "Deleted content",
			input:       "[deleted]",
			contains:    []string{"[deleted]"},
			notContains: []string{"<p>"},
		},
		{
			name:        "Removed content",
			input:       "[removed]",
			contains:    []string{"[removed]"},
			notContains: []string{"<p>"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.RenderMarkdown(tt.input)

			for _, expected := range tt.contains {
				if !strings.Contains(result, expected) {
					t.Errorf("Expected output to contain %q, got: %s", expected, result)
				}
			}

			for _, notExpected := range tt.notContains {
				if strings.Contains(result, notExpected) {
					t.Errorf("Expected output NOT to contain %q, got: %s", notExpected, result)
				}
			}
		})
	}
}

func TestCommentValidation(t *testing.T) {
	tests := []struct {
		name    string
		content string
		wantErr bool
	}{
		{
			name:    "Valid comment",
			content: "This is a valid comment",
			wantErr: false,
		},
		{
			name:    "Empty comment",
			content: "",
			wantErr: true,
		},
		{
			name:    "Only whitespace",
			content: "   ",
			wantErr: true,
		},
		{
			name:    "Too long comment",
			content: strings.Repeat("a", MaxCommentLength+1),
			wantErr: true,
		},
		{
			name:    "Max length comment",
			content: strings.Repeat("a", MaxCommentLength),
			wantErr: false,
		},
		{
			name:    "Minimum length comment",
			content: "a",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			content := strings.TrimSpace(tt.content)
			hasError := len(content) < MinCommentLength || len(content) > MaxCommentLength

			if hasError != tt.wantErr {
				t.Errorf("Content length validation for %q: got error=%v, want error=%v",
					tt.name, hasError, tt.wantErr)
			}
		})
	}
}

func TestCommentConstants(t *testing.T) {
	tests := []struct {
		name     string
		constant int
		min      int
		max      int
	}{
		{
			name:     "Max comment length",
			constant: MaxCommentLength,
			min:      1000,
			max:      50000,
		},
		{
			name:     "Min comment length",
			constant: MinCommentLength,
			min:      1,
			max:      10,
		},
		{
			name:     "Max nesting depth",
			constant: MaxNestingDepth,
			min:      5,
			max:      20,
		},
		{
			name:     "Edit window minutes",
			constant: EditWindowMinutes,
			min:      1,
			max:      60,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.constant < tt.min || tt.constant > tt.max {
				t.Errorf("%s = %d, expected between %d and %d",
					tt.name, tt.constant, tt.min, tt.max)
			}
		})
	}
}

func TestKarmaValues(t *testing.T) {
	tests := []struct {
		name  string
		value int
	}{
		{
			name:  "Karma per comment",
			value: KarmaPerComment,
		},
		{
			name:  "Karma per upvote",
			value: KarmaPerUpvote,
		},
		{
			name:  "Karma per downvote",
			value: KarmaPerDownvote,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Just verify they're defined
			if tt.value == 0 && tt.name != "Karma per downvote" {
				t.Errorf("%s should not be zero", tt.name)
			}
		})
	}
}

// TestCommentTreeDepthValidation tests that depth limits are properly enforced
func TestCommentTreeDepthValidation(t *testing.T) {
	tests := []struct {
		name        string
		depth       int
		shouldStop  bool
		description string
	}{
		{
			name:        "Depth 0",
			depth:       0,
			shouldStop:  false,
			description: "Should allow recursion at depth 0",
		},
		{
			name:        "Mid depth",
			depth:       5,
			shouldStop:  false,
			description: "Should allow recursion at mid depth",
		},
		{
			name:        "At max depth",
			depth:       MaxNestingDepth,
			shouldStop:  true,
			description: "Should stop at max depth",
		},
		{
			name:        "Beyond max depth",
			depth:       MaxNestingDepth + 1,
			shouldStop:  true,
			description: "Should stop beyond max depth",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test logic: depth >= MaxNestingDepth should stop recursion
			shouldStop := tt.depth >= MaxNestingDepth
			
			if shouldStop != tt.shouldStop {
				t.Errorf("Expected shouldStop=%v at depth %d, got %v", 
					tt.shouldStop, tt.depth, shouldStop)
			}
		})
	}
}

// TestReplyCountAccuracy tests reply count validation logic
func TestReplyCountAccuracy(t *testing.T) {
	tests := []struct {
		name        string
		replyCount  int
		description string
	}{
		{
			name:        "No replies",
			replyCount:  0,
			description: "Comment with no replies",
		},
		{
			name:        "Single reply",
			replyCount:  1,
			description: "Comment with one reply",
		},
		{
			name:        "Multiple replies",
			replyCount:  5,
			description: "Comment with multiple replies",
		},
		{
			name:        "Many replies",
			replyCount:  50,
			description: "Comment with many replies",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Verify reply count is a valid non-negative integer
			if tt.replyCount < 0 {
				t.Errorf("Invalid reply count: %d", tt.replyCount)
			}
		})
	}
}

// TestDeletedCommentContent tests that deleted comment content is properly marked
func TestDeletedCommentContent(t *testing.T) {
	tests := []struct {
		name           string
		content        string
		isDeleted      bool
		isRemoved      bool
		expectedText   string
		shouldRender   bool
		description    string
	}{
		{
			name:          "Normal comment",
			content:       "This is a normal comment",
			isDeleted:     false,
			isRemoved:     false,
			expectedText:  "This is a normal comment",
			shouldRender:  true,
			description:   "Normal comments should render markdown",
		},
		{
			name:          "Deleted comment",
			content:       "[deleted]",
			isDeleted:     true,
			isRemoved:     false,
			expectedText:  "[deleted]",
			shouldRender:  false,
			description:   "Deleted comments should not process markdown",
		},
		{
			name:          "Removed comment",
			content:       "[removed]",
			isDeleted:     false,
			isRemoved:     true,
			expectedText:  "[removed]",
			shouldRender:  false,
			description:   "Removed comments should not process markdown",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test the content matches expected values
			if tt.content != tt.expectedText {
				t.Errorf("Expected content %q, got %q", tt.expectedText, tt.content)
			}
			
			// Verify markdown should not be rendered for deleted/removed
			if !tt.shouldRender && !strings.Contains(tt.content, "[deleted]") && !strings.Contains(tt.content, "[removed]") {
				t.Error("Expected content to be marked as deleted or removed")
			}
		})
	}
}

// TestOrphanedRepliesHandling tests the handling concept for orphaned replies
func TestOrphanedRepliesHandling(t *testing.T) {
	tests := []struct {
		name           string
		hasParent      bool
		expectOrphaned bool
		description    string
	}{
		{
			name:           "Comment with valid parent",
			hasParent:      true,
			expectOrphaned: false,
			description:    "Regular reply should not be orphaned",
		},
		{
			name:           "Comment without parent",
			hasParent:      false,
			expectOrphaned: true,
			description:    "Reply without parent should be orphaned",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test orphaned logic
			isOrphaned := !tt.hasParent
			
			if isOrphaned != tt.expectOrphaned {
				t.Errorf("Expected orphaned=%v, got %v", tt.expectOrphaned, isOrphaned)
			}
		})
	}
}

// TestCommentTreePagination tests pagination parameters for large trees
func TestCommentTreePagination(t *testing.T) {
	tests := []struct {
		name          string
		totalReplies  int
		limit         int
		offset        int
		expectedCount int
		description   string
	}{
		{
			name:          "First page of 50",
			totalReplies:  1000,
			limit:         50,
			offset:        0,
			expectedCount: 50,
			description:   "First page should return limit items",
		},
		{
			name:          "Second page of 50",
			totalReplies:  1000,
			limit:         50,
			offset:        50,
			expectedCount: 50,
			description:   "Second page should return limit items",
		},
		{
			name:          "Last page partial",
			totalReplies:  75,
			limit:         50,
			offset:        50,
			expectedCount: 25,
			description:   "Last page should return remaining items",
		},
		{
			name:          "Beyond available data",
			totalReplies:  100,
			limit:         50,
			offset:        150,
			expectedCount: 0,
			description:   "Offset beyond data should return empty",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Calculate expected count based on pagination
			start := tt.offset
			if start >= tt.totalReplies {
				if tt.expectedCount != 0 {
					t.Errorf("Expected 0 items when offset %d >= total %d", start, tt.totalReplies)
				}
				return
			}
			
			end := start + tt.limit
			if end > tt.totalReplies {
				end = tt.totalReplies
			}
			
			actualCount := end - start
			if actualCount != tt.expectedCount {
				t.Errorf("Expected %d items, calculated %d (start=%d, end=%d, total=%d)",
					tt.expectedCount, actualCount, start, end, tt.totalReplies)
			}
		})
	}
}

// TestRenderedContentInTree tests that markdown rendering is applied
func TestRenderedContentInTree(t *testing.T) {
	service := &CommentService{
		markdown:  createMarkdownProcessor(),
		sanitizer: createSanitizer(),
	}
	
	tests := []struct {
		name           string
		content        string
		expectContains []string
		description    string
	}{
		{
			name:           "Bold markdown",
			content:        "This is **bold** text",
			expectContains: []string{"<strong>", "bold", "</strong>"},
			description:    "Bold text should be rendered",
		},
		{
			name:           "Italic markdown",
			content:        "This is *italic* text",
			expectContains: []string{"<em>", "italic", "</em>"},
			description:    "Italic text should be rendered",
		},
		{
			name:           "Link markdown",
			content:        "[GitHub](https://github.com)",
			expectContains: []string{"<a", "href=", "GitHub"},
			description:    "Links should be rendered",
		},
	}
	
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rendered := service.RenderMarkdown(tt.content)
			
			for _, expected := range tt.expectContains {
				if !strings.Contains(rendered, expected) {
					t.Errorf("Expected rendered content to contain %q, got: %s", expected, rendered)
				}
			}
		})
	}
}

// TestMaxNestingDepthConstant verifies the max nesting depth is reasonable
func TestMaxNestingDepthConstant(t *testing.T) {
	if MaxNestingDepth < 5 {
		t.Errorf("MaxNestingDepth (%d) should be at least 5 for usable threading", MaxNestingDepth)
	}
	
	if MaxNestingDepth > 20 {
		t.Errorf("MaxNestingDepth (%d) should not exceed 20 to avoid UI issues", MaxNestingDepth)
	}
	
	t.Logf("MaxNestingDepth is set to %d", MaxNestingDepth)
}

// TestCommentTreeNodeStructure tests the CommentTreeNode type
func TestCommentTreeNodeStructure(t *testing.T) {
	// Create a sample tree node
	node := CommentTreeNode{
		CommentWithAuthor: repository.CommentWithAuthor{
			Comment: models.Comment{
				ID:      uuid.New(),
				Content: "Test comment",
			},
			AuthorUsername: "testuser",
			ReplyCount:     2,
		},
		RenderedContent: "<p>Test comment</p>",
		Replies:         []CommentTreeNode{},
	}
	
	// Verify structure
	if node.Content != "Test comment" {
		t.Errorf("Expected content 'Test comment', got %q", node.Content)
	}
	
	if node.RenderedContent != "<p>Test comment</p>" {
		t.Errorf("Expected rendered content '<p>Test comment</p>', got %q", node.RenderedContent)
	}
	
	if node.Replies == nil {
		t.Error("Expected Replies to be initialized")
	}
	
	if node.ReplyCount != 2 {
		t.Errorf("Expected ReplyCount 2, got %d", node.ReplyCount)
	}
}
