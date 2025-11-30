package handlers

import (
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
)

type DocsHandler struct {
	docsPath     string
	githubOwner  string
	githubRepo   string
	githubBranch string
}

type DocEntry struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	Type     string      `json:"type"` // "file" or "directory"
	Children []DocEntry `json:"children,omitempty"`
}

type SearchResult struct {
	Path    string   `json:"path"`
	Name    string   `json:"name"`
	Matches []string `json:"matches"`
	Score   int      `json:"score"`
}

func NewDocsHandler(docsPath, githubOwner, githubRepo, githubBranch string) *DocsHandler {
	return &DocsHandler{
		docsPath:     docsPath,
		githubOwner:  githubOwner,
		githubRepo:   githubRepo,
		githubBranch: githubBranch,
	}
}

// GetDocsList returns the hierarchical tree of all documentation files
func (h *DocsHandler) GetDocsList(c *gin.Context) {
	docs, err := h.buildDocsTree(h.docsPath, "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to load documentation tree",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"docs": docs,
	})
}

// GetDoc returns the content of a specific documentation file
func (h *DocsHandler) GetDoc(c *gin.Context) {
	// Get path from wildcard parameter
	docPath := c.Param("path")
	if docPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Document path is required",
		})
		return
	}

	// Remove leading slash
	docPath = strings.TrimPrefix(docPath, "/")

	// Security: prevent directory traversal
	if strings.Contains(docPath, "..") {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid document path",
		})
		return
	}

	// Add .md extension if not present
	if !strings.HasSuffix(docPath, ".md") {
		docPath += ".md"
	}

	// Construct full file path
	fullPath := filepath.Join(h.docsPath, docPath)

	// Verify file exists and is within docs directory
	if !strings.HasPrefix(fullPath, h.docsPath) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid document path",
		})
		return
	}

	// Read file content
	content, err := os.ReadFile(fullPath)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Document not found",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to read document",
			})
		}
		return
	}

	// Generate GitHub edit URL
	githubURL := h.generateGitHubURL(docPath)

	c.JSON(http.StatusOK, gin.H{
		"path":       docPath,
		"content":    string(content),
		"github_url": githubURL,
	})
}

// SearchDocs searches for documents matching the query
func (h *DocsHandler) SearchDocs(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Query parameter 'q' is required",
		})
		return
	}

	results, err := h.searchDocuments(h.docsPath, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Search failed",
		})
		return
	}

	// Sort by score (highest first)
	sort.Slice(results, func(i, j int) bool {
		return results[i].Score > results[j].Score
	})

	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"count":   len(results),
		"results": results,
	})
}

// searchDocuments recursively searches all markdown files for the query
func (h *DocsHandler) searchDocuments(dir, query string) ([]SearchResult, error) {
	var results []SearchResult
	queryLower := strings.ToLower(query)

	err := filepath.Walk(dir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip directories and non-markdown files
		if info.IsDir() || !strings.HasSuffix(info.Name(), ".md") {
			return nil
		}

		// Skip archive and hidden files
		if strings.Contains(path, "archive") || strings.HasPrefix(info.Name(), ".") {
			return nil
		}

		// Read file content
		content, err := os.ReadFile(path)
		if err != nil {
			return nil // Skip files we can't read
		}

		// Search for query in content (case-insensitive)
		contentLower := strings.ToLower(string(content))
		if !strings.Contains(contentLower, queryLower) {
			// Check if filename matches
			if !strings.Contains(strings.ToLower(info.Name()), queryLower) {
				return nil
			}
		}

		// Get relative path from docs directory
		relPath, _ := filepath.Rel(dir, path)
		relPath = strings.TrimSuffix(relPath, ".md")

		// Extract matching lines (up to 3)
		lines := strings.Split(string(content), "\n")
		matches := []string{}
		score := 0

		// Check filename match (higher score)
		if strings.Contains(strings.ToLower(info.Name()), queryLower) {
			score += 5
		}

		for _, line := range lines {
			if strings.Contains(strings.ToLower(line), queryLower) {
				// Truncate long lines
				if len(line) > 150 {
					// Find query position and show context
					idx := strings.Index(strings.ToLower(line), queryLower)
					start := max(0, idx-50)
					end := min(len(line), idx+100)
					line = "..." + line[start:end] + "..."
				}
				matches = append(matches, strings.TrimSpace(line))
				score++
				if len(matches) >= 3 {
					break
				}
			}
		}

		if len(matches) > 0 || score > 0 {
			results = append(results, SearchResult{
				Path:    relPath,
				Name:    strings.TrimSuffix(info.Name(), ".md"),
				Matches: matches,
				Score:   score,
			})
		}

		return nil
	})

	return results, err
}

// generateGitHubURL creates a GitHub edit URL for the given doc path
func (h *DocsHandler) generateGitHubURL(docPath string) string {
	return fmt.Sprintf(
		"https://github.com/%s/%s/edit/%s/docs/%s",
		h.githubOwner,
		h.githubRepo,
		h.githubBranch,
		docPath,
	)
}

// buildDocsTree recursively builds the documentation tree
func (h *DocsHandler) buildDocsTree(dir string, relativePath string) ([]DocEntry, error) {
	var entries []DocEntry

	files, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	for _, file := range files {
		// Skip hidden files and archive directory
		if strings.HasPrefix(file.Name(), ".") || file.Name() == "archive" {
			continue
		}

		entryPath := filepath.Join(relativePath, file.Name())
		fullPath := filepath.Join(dir, file.Name())

		if file.IsDir() {
			// Recursively process subdirectories
			children, err := h.buildDocsTree(fullPath, entryPath)
			if err != nil {
				continue
			}
			entries = append(entries, DocEntry{
				Name:     file.Name(),
				Path:     entryPath,
				Type:     "directory",
				Children: children,
			})
		} else if strings.HasSuffix(file.Name(), ".md") {
			// Only include markdown files
			name := strings.TrimSuffix(file.Name(), ".md")
			entries = append(entries, DocEntry{
				Name: name,
				Path: strings.TrimSuffix(entryPath, ".md"),
				Type: "file",
			})
		}
	}

	return entries, nil
}

// Helper functions for min/max
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
