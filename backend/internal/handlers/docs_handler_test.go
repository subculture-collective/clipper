package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestDocsHandler_GetDocsList(t *testing.T) {
	// Create a temporary docs directory
	tmpDir := t.TempDir()

	// Create some test markdown files
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "test1.md"), []byte("# Test 1"), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "test2.md"), []byte("# Test 2"), 0644))

	// Create a subdirectory with files
	subDir := filepath.Join(tmpDir, "subdir")
	require.NoError(t, os.Mkdir(subDir, 0755))
	require.NoError(t, os.WriteFile(filepath.Join(subDir, "test3.md"), []byte("# Test 3"), 0644))

	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewDocsHandler(tmpDir, "test-owner", "test-repo", "main")
	router.GET("/api/v1/docs", handler.GetDocsList)

	// Test
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/docs", nil)
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "test1")
	assert.Contains(t, w.Body.String(), "test2")
	assert.Contains(t, w.Body.String(), "subdir")
}

func TestDocsHandler_GetDoc(t *testing.T) {
	// Create a temporary docs directory
	tmpDir := t.TempDir()
	testContent := "# Test Document\n\nThis is a test document."
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "test.md"), []byte(testContent), 0644))

	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewDocsHandler(tmpDir, "test-owner", "test-repo", "main")
	router.GET("/api/v1/docs/:path", handler.GetDoc)

	// Test
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/docs/test", nil)
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Test Document")
	assert.Contains(t, w.Body.String(), "github_url")
}

func TestDocsHandler_GetDoc_NotFound(t *testing.T) {
	// Create a temporary docs directory
	tmpDir := t.TempDir()

	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewDocsHandler(tmpDir, "test-owner", "test-repo", "main")
	router.GET("/api/v1/docs/:path", handler.GetDoc)

	// Test
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/docs/nonexistent", nil)
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDocsHandler_SearchDocs(t *testing.T) {
	// Create a temporary docs directory
	tmpDir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "searchable.md"), []byte("# Searchable\n\nThis document contains the word banana."), 0644))
	require.NoError(t, os.WriteFile(filepath.Join(tmpDir, "other.md"), []byte("# Other\n\nThis document is about apples."), 0644))

	// Setup
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := NewDocsHandler(tmpDir, "test-owner", "test-repo", "main")
	router.GET("/api/v1/docs/search", handler.SearchDocs)

	// Test
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/docs/search?q=banana", nil)
	router.ServeHTTP(w, req)

	// Assert
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "searchable")
	assert.NotContains(t, w.Body.String(), "other")
}
