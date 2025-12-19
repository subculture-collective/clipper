package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func TestCreateThread_InvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil, // nil is ok since we never get to the DB call
	}

	// Test missing title
	reqBody := map[string]interface{}{
		"content": "This is test content",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user_id", uuid.New())

	handler.CreateThread(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}

func TestCreateThread_TitleTooShort(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"title":   "Hi",
		"content": "This is test content that is long enough",
		"tags":    []string{"test"},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user_id", uuid.New())

	handler.CreateThread(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateThread_ContentTooShort(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"title":   "Valid Title Here",
		"content": "Short",
		"tags":    []string{"test"},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user_id", uuid.New())

	handler.CreateThread(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateThread_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"title":   "Valid Title",
		"content": "Valid content that is long enough for validation",
		"tags":    []string{"test"},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// No user_id set

	handler.CreateThread(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetThread_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/forum/threads/invalid-uuid", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid-uuid"},
	}

	handler.GetThread(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}

func TestCreateReply_InvalidThreadID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"content": "This is a reply",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads/invalid-uuid/replies", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid-uuid"},
	}
	c.Set("user_id", uuid.New())

	handler.CreateReply(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateReply_ContentTooShort(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"content": "",
	}
	body, _ := json.Marshal(reqBody)

	threadID := uuid.New()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads/"+threadID.String()+"/replies", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: threadID.String()},
	}
	c.Set("user_id", uuid.New())

	handler.CreateReply(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateReply_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"content": "Valid reply content",
	}
	body, _ := json.Marshal(reqBody)

	threadID := uuid.New()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads/"+threadID.String()+"/replies", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: threadID.String()},
	}
	// No user_id set

	handler.CreateReply(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestUpdateReply_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"content": "Updated content",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/forum/replies/invalid-uuid", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid-uuid"},
	}
	c.Set("user_id", uuid.New())

	handler.UpdateReply(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUpdateReply_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"content": "Updated content",
	}
	body, _ := json.Marshal(reqBody)

	replyID := uuid.New()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/forum/replies/"+replyID.String(), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: replyID.String()},
	}
	// No user_id set

	handler.UpdateReply(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestDeleteReply_InvalidID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/forum/replies/invalid-uuid", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid-uuid"},
	}
	c.Set("user_id", uuid.New())

	handler.DeleteReply(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestDeleteReply_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	replyID := uuid.New()
	req := httptest.NewRequest(http.MethodDelete, "/api/v1/forum/replies/"+replyID.String(), http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: replyID.String()},
	}
	// No user_id set

	handler.DeleteReply(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestSearchThreads_EmptyQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/forum/search", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.SearchThreads(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}

// TestCreateThread_TooManyTags tests that more than 5 tags are rejected
func TestCreateThread_TooManyTags(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"title":   "Valid Title",
		"content": "Valid content that is long enough for validation",
		"tags":    []string{"tag1", "tag2", "tag3", "tag4", "tag5", "tag6"},
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/threads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user_id", uuid.New())

	handler.CreateThread(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestListThreads_InvalidGameFilter tests invalid game_filter parameter
func TestListThreads_InvalidGameFilter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/forum/threads?game_filter=invalid-uuid", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.ListThreads(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}
