package handlers

import (
    "bufio"
    "errors"
    "fmt"
    "net/http"
    "os"
    "regexp"
    "strings"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

// WaitlistHandler handles simple waitlist email submissions.
// It appends lines to a text file in the backend container. Minimal by design.
type WaitlistHandler struct {
    filePath string
    mu       sync.Mutex
}

// NewWaitlistHandler creates a new handler.
// If WAITLIST_FILE env var is set, it will be used; otherwise defaults to ./waitlist.txt
func NewWaitlistHandler() *WaitlistHandler {
    path := os.Getenv("WAITLIST_FILE")
    if strings.TrimSpace(path) == "" {
        path = "./waitlist.txt"
    }
    return &WaitlistHandler{filePath: path}
}

var emailRegex = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// SubmitEmailRequest represents the incoming JSON body.
type SubmitEmailRequest struct {
    Email string `json:"email"`
}

// SubmitEmail appends the submitted email to the waitlist file.
// POST /api/v1/waitlist
func (h *WaitlistHandler) SubmitEmail(c *gin.Context) {
    var req SubmitEmailRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
        return
    }

    email := strings.TrimSpace(strings.ToLower(req.Email))
    if email == "" || !emailRegex.MatchString(email) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email"})
        return
    }

    // Ensure directory exists if a nested path was provided
    if err := ensureParentDir(h.filePath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to prepare storage"})
        return
    }

    h.mu.Lock()
    defer h.mu.Unlock()

    // Avoid duplicates by checking file contents (best-effort, O(n))
    already, err := h.containsEmail(email)
    if err != nil && !errors.Is(err, os.ErrNotExist) {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check existing entries"})
        return
    }
    if already {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "already on the list"})
        return
    }

    // Append a line: ISO8601 timestamp | email | clientIP | userAgent
    line := fmt.Sprintf("%s | %s | %s | %s\n",
        time.Now().UTC().Format(time.RFC3339),
        email,
        c.ClientIP(),
        strings.ReplaceAll(c.GetHeader("User-Agent"), "\n", " "),
    )

    f, err := os.OpenFile(h.filePath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open storage"})
        return
    }
    defer f.Close()

    if _, err := f.WriteString(line); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to write"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "added to waitlist"})
}

// containsEmail checks if the given email is present in the waitlist file.
func (h *WaitlistHandler) containsEmail(email string) (bool, error) {
    f, err := os.Open(h.filePath)
    if err != nil {
        return false, err
    }
    defer f.Close()

    scanner := bufio.NewScanner(f)
    // Increase buffer in case of long lines
    const maxCapacity = 1024 * 1024 // 1MB
    buf := make([]byte, 0, 64*1024)
    scanner.Buffer(buf, maxCapacity)

    for scanner.Scan() {
        line := scanner.Text()
        if strings.Contains(line, "| "+email+" |") || strings.HasPrefix(strings.TrimSpace(line), email) {
            return true, nil
        }
    }
    if scanErr := scanner.Err(); scanErr != nil {
        return false, scanErr
    }
    return false, nil
}

func ensureParentDir(path string) error {
    dir := strings.TrimSpace(path)
    if dir == "" {
        return nil
    }
    // If file has parent directory, create it
    if idx := strings.LastIndex(dir, "/"); idx > 0 {
        parent := dir[:idx]
        if parent != "" {
            if err := os.MkdirAll(parent, 0o755); err != nil {
                return err
            }
        }
    }
    return nil
}
