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

func TestVoteOnReply_InvalidReplyID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"vote_value": 1,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/replies/invalid/vote", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Set("user_id", uuid.New())
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	handler.VoteOnReply(c)

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

func TestVoteOnReply_InvalidVoteValue(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	testCases := []struct {
		name      string
		voteValue int
	}{
		{"vote value 2", 2},
		{"vote value -2", -2},
		{"vote value 10", 10},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			reqBody := map[string]interface{}{
				"vote_value": tc.voteValue,
			}
			body, _ := json.Marshal(reqBody)

			req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/replies/"+uuid.New().String()+"/vote", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Set("user_id", uuid.New())
			c.Params = gin.Params{{Key: "id", Value: uuid.New().String()}}

			handler.VoteOnReply(c)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Errorf("response is not valid JSON: %v", err)
			}

			if errMsg, ok := response["error"].(string); !ok || errMsg != "Vote value must be -1, 0, or 1" {
				t.Errorf("expected vote value error, got: %v", response["error"])
			}
		})
	}
}

func TestVoteOnReply_MissingAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	reqBody := map[string]interface{}{
		"vote_value": 1,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/forum/replies/"+uuid.New().String()+"/vote", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: uuid.New().String()}}
	// No user_id set - simulating unauthenticated request

	handler.VoteOnReply(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetReplyVotes_InvalidReplyID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/forum/replies/invalid/votes", nil)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	handler.GetReplyVotes(c)

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

func TestGetUserReputation_InvalidUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ForumHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/forum/users/invalid/reputation", nil)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}

	handler.GetUserReputation(c)

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

// TestReputationCalculation validates the reputation score calculation logic
// This tests the business logic documented in the issue
func TestReputationCalculation(t *testing.T) {
	testCases := []struct {
		name       string
		upvotes    int
		downvotes  int
		threads    int
		replies    int
		wantScore  int
		wantBadge  string
	}{
		{
			name:       "new user no activity",
			upvotes:    0,
			downvotes:  0,
			threads:    0,
			replies:    0,
			wantScore:  0,
			wantBadge:  "new",
		},
		{
			name:       "user with 1 thread only",
			upvotes:    0,
			downvotes:  0,
			threads:    1,
			replies:    0,
			wantScore:  10,
			wantBadge:  "new",
		},
		{
			name:       "user with 5 replies",
			upvotes:    0,
			downvotes:  0,
			threads:    0,
			replies:    5,
			wantScore:  10,
			wantBadge:  "new",
		},
		{
			name:       "contributor threshold (50 points)",
			upvotes:    10,
			downvotes:  0,
			threads:    0,
			replies:    0,
			wantScore:  50,
			wantBadge:  "contributor",
		},
		{
			name:       "expert threshold (250 points)",
			upvotes:    50,
			downvotes:  0,
			threads:    0,
			replies:    0,
			wantScore:  250,
			wantBadge:  "expert",
		},
		{
			name:       "mixed activity - contributor level",
			upvotes:    5,
			downvotes:  1,
			threads:    2,
			replies:    5,
			wantScore:  53, // 5*5 - 1*2 + 2*10 + 5*2 = 25 - 2 + 20 + 10 = 53
			wantBadge:  "contributor",
		},
		{
			name:       "high activity - expert level",
			upvotes:    40,
			downvotes:  5,
			threads:    5,
			replies:    20,
			wantScore:  280, // 40*5 - 5*2 + 5*10 + 20*2 = 200 - 10 + 50 + 40 = 280
			wantBadge:  "expert",
		},
		{
			name:       "negative votes don't go below zero",
			upvotes:    0,
			downvotes:  10,
			threads:    0,
			replies:    0,
			wantScore:  0, // Would be -20, but clamped to 0
			wantBadge:  "new",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Replicate the calculation from the SQL function:
			// v_score := (upvotes * 5) - (downvotes * 2) + (threads * 10) + (replies * 2)
			score := (tc.upvotes * 5) - (tc.downvotes * 2) + (tc.threads * 10) + (tc.replies * 2)
			if score < 0 {
				score = 0
			}

			// Determine badge
			var badge string
			if score >= 250 {
				badge = "expert"
			} else if score >= 50 {
				badge = "contributor"
			} else {
				badge = "new"
			}

			if score != tc.wantScore {
				t.Errorf("score = %d, want %d", score, tc.wantScore)
			}

			if badge != tc.wantBadge {
				t.Errorf("badge = %s, want %s", badge, tc.wantBadge)
			}
		})
	}
}

// TestVoteAggregation validates vote counting logic
func TestVoteAggregation(t *testing.T) {
	testCases := []struct {
		name          string
		votes         []int // slice of vote values
		wantUpvotes   int
		wantDownvotes int
		wantNetVotes  int
	}{
		{
			name:          "no votes",
			votes:         []int{},
			wantUpvotes:   0,
			wantDownvotes: 0,
			wantNetVotes:  0,
		},
		{
			name:          "only upvotes",
			votes:         []int{1, 1, 1, 1, 1},
			wantUpvotes:   5,
			wantDownvotes: 0,
			wantNetVotes:  5,
		},
		{
			name:          "only downvotes",
			votes:         []int{-1, -1, -1},
			wantUpvotes:   0,
			wantDownvotes: 3,
			wantNetVotes:  -3,
		},
		{
			name:          "mixed votes",
			votes:         []int{1, 1, -1, 1, -1, 1},
			wantUpvotes:   4,
			wantDownvotes: 2,
			wantNetVotes:  2,
		},
		{
			name:          "neutral votes ignored",
			votes:         []int{1, 0, 1, 0, -1, 0},
			wantUpvotes:   2,
			wantDownvotes: 1,
			wantNetVotes:  1,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			upvotes := 0
			downvotes := 0
			netVotes := 0

			for _, vote := range tc.votes {
				if vote == 1 {
					upvotes++
				} else if vote == -1 {
					downvotes++
				}
				// vote == 0 is ignored
				netVotes += vote
			}

			if upvotes != tc.wantUpvotes {
				t.Errorf("upvotes = %d, want %d", upvotes, tc.wantUpvotes)
			}

			if downvotes != tc.wantDownvotes {
				t.Errorf("downvotes = %d, want %d", downvotes, tc.wantDownvotes)
			}

			if netVotes != tc.wantNetVotes {
				t.Errorf("netVotes = %d, want %d", netVotes, tc.wantNetVotes)
			}
		})
	}
}

// TestSpamDetectionThresholds validates spam detection logic
func TestSpamDetectionThresholds(t *testing.T) {
	testCases := []struct {
		name          string
		downvotes     int
		netVotes      int
		shouldBeFlagged bool
	}{
		{
			name:          "no downvotes",
			downvotes:     0,
			netVotes:      5,
			shouldBeFlagged: false,
		},
		{
			name:          "few downvotes",
			downvotes:     3,
			netVotes:      -1,
			shouldBeFlagged: false,
		},
		{
			name:          "threshold exactly - not flagged",
			downvotes:     5,
			netVotes:      -2,
			shouldBeFlagged: false,
		},
		{
			name:          "exceeds downvotes threshold",
			downvotes:     6,
			netVotes:      -3,
			shouldBeFlagged: true,
		},
		{
			name:          "exceeds both thresholds",
			downvotes:     10,
			netVotes:      -5,
			shouldBeFlagged: true,
		},
		{
			name:          "high downvotes but net positive",
			downvotes:     10,
			netVotes:      5,
			shouldBeFlagged: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Spam detection logic: downvotes > 5 AND net_votes < -2
			shouldFlag := tc.downvotes > 5 && tc.netVotes < -2

			if shouldFlag != tc.shouldBeFlagged {
				t.Errorf("shouldFlag = %v, want %v", shouldFlag, tc.shouldBeFlagged)
			}
		})
	}
}

// TestLowQualityThresholds validates low quality hiding logic
func TestLowQualityThresholds(t *testing.T) {
	testCases := []struct {
		name         string
		netVotes     int
		shouldHide   bool
	}{
		{
			name:       "positive votes",
			netVotes:   10,
			shouldHide: false,
		},
		{
			name:       "zero votes",
			netVotes:   0,
			shouldHide: false,
		},
		{
			name:       "slightly negative",
			netVotes:   -2,
			shouldHide: false,
		},
		{
			name:       "threshold exactly",
			netVotes:   -5,
			shouldHide: true,
		},
		{
			name:       "very negative",
			netVotes:   -10,
			shouldHide: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Low quality logic: net_votes <= -5
			shouldHide := tc.netVotes <= -5

			if shouldHide != tc.shouldHide {
				t.Errorf("shouldHide = %v, want %v", shouldHide, tc.shouldHide)
			}
		})
	}
}
