//go:build integration

package mocks

import (
	"fmt"
	"io"
	"strings"
	"sync"
	"time"
)

// StorageServiceInterface defines the interface for storage operations
type StorageServiceInterface interface {
	UploadFile(key string, content io.Reader, contentType string) (string, error)
	DeleteFile(key string) error
	GetFileURL(key string) (string, error)
	FileExists(key string) (bool, error)
}

// MockStorageService implements StorageServiceInterface for testing
type MockStorageService struct {
	mu sync.RWMutex

	// Mock file storage (key -> file content)
	Files map[string]*MockFile

	// Call tracking
	UploadFileCalls  int
	DeleteFileCalls  int
	GetFileURLCalls  int
	FileExistsCalls  int

	// Error injection
	UploadFileError  error
	DeleteFileError  error
	GetFileURLError  error
	FileExistsError  error

	// Latency simulation
	SimulateLatency time.Duration

	// Base URL for mock file URLs
	BaseURL string
}

// MockFile represents a file in mock storage
type MockFile struct {
	Key         string
	Content     []byte
	ContentType string
	Size        int64
	UploadedAt  time.Time
	URL         string
}

// NewMockStorageService creates a new mock storage service
func NewMockStorageService() *MockStorageService {
	return &MockStorageService{
		Files:   make(map[string]*MockFile),
		BaseURL: "https://mock-cdn.example.com",
	}
}

// UploadFile simulates uploading a file to storage
func (m *MockStorageService) UploadFile(key string, content io.Reader, contentType string) (string, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.UploadFileCalls++

	if m.UploadFileError != nil {
		return "", m.UploadFileError
	}

	// Read content
	data, err := io.ReadAll(content)
	if err != nil {
		return "", fmt.Errorf("failed to read content: %w", err)
	}

	url := fmt.Sprintf("%s/%s", m.BaseURL, key)
	file := &MockFile{
		Key:         key,
		Content:     data,
		ContentType: contentType,
		Size:        int64(len(data)),
		UploadedAt:  time.Now(),
		URL:         url,
	}

	m.Files[key] = file
	return url, nil
}

// DeleteFile simulates deleting a file from storage
func (m *MockStorageService) DeleteFile(key string) error {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.DeleteFileCalls++

	if m.DeleteFileError != nil {
		return m.DeleteFileError
	}

	if _, exists := m.Files[key]; !exists {
		return fmt.Errorf("file not found: %s", key)
	}

	delete(m.Files, key)
	return nil
}

// GetFileURL returns the URL for a file
func (m *MockStorageService) GetFileURL(key string) (string, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	m.GetFileURLCalls++

	if m.GetFileURLError != nil {
		return "", m.GetFileURLError
	}

	file, exists := m.Files[key]
	if !exists {
		return "", fmt.Errorf("file not found: %s", key)
	}

	return file.URL, nil
}

// FileExists checks if a file exists in storage
func (m *MockStorageService) FileExists(key string) (bool, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	m.FileExistsCalls++

	if m.FileExistsError != nil {
		return false, m.FileExistsError
	}

	_, exists := m.Files[key]
	return exists, nil
}

// GetFile retrieves a file from mock storage
func (m *MockStorageService) GetFile(key string) (*MockFile, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	file, exists := m.Files[key]
	if !exists {
		return nil, fmt.Errorf("file not found: %s", key)
	}

	// Return a copy to avoid race conditions
	fileCopy := &MockFile{
		Key:         file.Key,
		Content:     make([]byte, len(file.Content)),
		ContentType: file.ContentType,
		Size:        file.Size,
		UploadedAt:  file.UploadedAt,
		URL:         file.URL,
	}
	copy(fileCopy.Content, file.Content)

	return fileCopy, nil
}

// ListFiles returns all files in mock storage
func (m *MockStorageService) ListFiles() []*MockFile {
	m.mu.RLock()
	defer m.mu.RUnlock()

	files := make([]*MockFile, 0, len(m.Files))
	for _, file := range m.Files {
		// Create a copy to avoid race conditions
		fileCopy := &MockFile{
			Key:         file.Key,
			Content:     make([]byte, len(file.Content)),
			ContentType: file.ContentType,
			Size:        file.Size,
			UploadedAt:  file.UploadedAt,
			URL:         file.URL,
		}
		copy(fileCopy.Content, file.Content)
		files = append(files, fileCopy)
	}

	return files
}

// GetFilesByPrefix returns files with keys matching a prefix
func (m *MockStorageService) GetFilesByPrefix(prefix string) []*MockFile {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var files []*MockFile
	for key, file := range m.Files {
		if strings.HasPrefix(key, prefix) {
			fileCopy := &MockFile{
				Key:         file.Key,
				Content:     make([]byte, len(file.Content)),
				ContentType: file.ContentType,
				Size:        file.Size,
				UploadedAt:  file.UploadedAt,
				URL:         file.URL,
			}
			copy(fileCopy.Content, file.Content)
			files = append(files, fileCopy)
		}
	}

	return files
}

// Reset clears all files and call counts
func (m *MockStorageService) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Files = make(map[string]*MockFile)
	m.UploadFileCalls = 0
	m.DeleteFileCalls = 0
	m.GetFileURLCalls = 0
	m.FileExistsCalls = 0

	m.UploadFileError = nil
	m.DeleteFileError = nil
	m.GetFileURLError = nil
	m.FileExistsError = nil
}

// GetTotalSize returns the total size of all files in storage
func (m *MockStorageService) GetTotalSize() int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var total int64
	for _, file := range m.Files {
		total += file.Size
	}
	return total
}

// GetFileCount returns the number of files in storage
func (m *MockStorageService) GetFileCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.Files)
}
