package main

// Clipper Moderation API - Go Examples
//
// Usage:
//   export API_TOKEN="your_jwt_token_here"
//   go run moderation-api-examples.go

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"time"
)

const (
	defaultAPIBase = "https://api.clpr.tv/api/v1/moderation"
	defaultChannelID = "123e4567-e89b-12d3-a456-426614174000"
)

// ModerationClient handles API requests
type ModerationClient struct {
	BaseURL string
	Token   string
	Client  *http.Client
}

// NewClient creates a new moderation API client
func NewClient(token string) *ModerationClient {
	baseURL := os.Getenv("API_BASE")
	if baseURL == "" {
		baseURL = defaultAPIBase
	}

	return &ModerationClient{
		BaseURL: baseURL,
		Token:   token,
		Client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// do performs an HTTP request
func (c *ModerationClient) do(method, endpoint string, body interface{}) (*http.Response, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, c.BaseURL+endpoint, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Content-Type", "application/json")

	return c.Client.Do(req)
}

// SyncBansRequest represents the sync bans request
type SyncBansRequest struct {
	ChannelID string `json:"channel_id"`
}

// SyncBansResponse represents the sync bans response
type SyncBansResponse struct {
	Status  string `json:"status"`
	JobID   string `json:"job_id"`
	Message string `json:"message"`
}

// Example1: Sync Bans from Twitch
func (c *ModerationClient) Example1_SyncBans(channelID string) error {
	fmt.Println("=== Example 1: Sync Bans from Twitch ===")
	
	req := SyncBansRequest{ChannelID: channelID}
	resp, err := c.do("POST", "/sync-bans", req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("sync failed (%d): %s", resp.StatusCode, body)
	}

	var result SyncBansResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Sync started: %s\n", result.Message)
	fmt.Printf("Job ID: %s\n\n", result.JobID)
	return nil
}

// Ban represents a ban
type Ban struct {
	ID          string  `json:"id"`
	ChannelID   string  `json:"channelId"`
	UserID      string  `json:"userId"`
	BannedBy    string  `json:"bannedBy"`
	Reason      string  `json:"reason"`
	BannedAt    string  `json:"bannedAt"`
	ExpiresAt   *string `json:"expiresAt"`
	IsPermanent bool    `json:"isPermanent"`
	Username    string  `json:"username,omitempty"`
}

// ListBansResponse represents the list bans response
type ListBansResponse struct {
	Bans   []Ban `json:"bans"`
	Total  int   `json:"total"`
	Limit  int   `json:"limit"`
	Offset int   `json:"offset"`
}

// Example2: List Bans for a Channel
func (c *ModerationClient) Example2_ListBans(channelID string) (*ListBansResponse, error) {
	fmt.Println("=== Example 2: List Bans for a Channel ===")
	
	params := url.Values{}
	params.Add("channelId", channelID)
	params.Add("limit", "10")
	params.Add("offset", "0")

	resp, err := c.do("GET", "/bans?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list failed (%d): %s", resp.StatusCode, body)
	}

	var result ListBansResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Total bans: %d\n", result.Total)
	fmt.Printf("Retrieved: %d bans\n", len(result.Bans))
	for i, ban := range result.Bans {
		if i < 3 {
			fmt.Printf("  %d. User %s banned for: %s\n", i+1, ban.Username, ban.Reason)
		}
	}
	fmt.Println()
	return &result, nil
}

// CreateBanRequest represents the create ban request
type CreateBanRequest struct {
	ChannelID string `json:"channelId"`
	UserID    string `json:"userId"`
	Reason    string `json:"reason,omitempty"`
}

// Example3: Create a Ban
func (c *ModerationClient) Example3_CreateBan(channelID, userID, reason string) (*Ban, error) {
	fmt.Println("=== Example 3: Create a Ban ===")
	
	req := CreateBanRequest{
		ChannelID: channelID,
		UserID:    userID,
		Reason:    reason,
	}

	resp, err := c.do("POST", "/ban", req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("create failed (%d): %s", resp.StatusCode, body)
	}

	var ban Ban
	if err := json.NewDecoder(resp.Body).Decode(&ban); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Ban created: %s\n", ban.ID)
	fmt.Printf("User: %s\n", ban.UserID)
	fmt.Println()
	return &ban, nil
}

// Example4: Get Ban Details
func (c *ModerationClient) Example4_GetBanDetails(banID string) (*Ban, error) {
	fmt.Println("=== Example 4: Get Ban Details ===")
	
	if banID == "" {
		fmt.Println("Skipping: No ban ID provided\n")
		return nil, nil
	}

	resp, err := c.do("GET", "/ban/"+banID, nil)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("get failed (%d): %s", resp.StatusCode, body)
	}

	var ban Ban
	if err := json.NewDecoder(resp.Body).Decode(&ban); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Ban details:\n")
	fmt.Printf("  ID: %s\n", ban.ID)
	fmt.Printf("  Reason: %s\n", ban.Reason)
	fmt.Printf("  Permanent: %v\n", ban.IsPermanent)
	fmt.Println()
	return &ban, nil
}

// Moderator represents a moderator
type Moderator struct {
	ID          string `json:"id"`
	UserID      string `json:"userId"`
	ChannelID   string `json:"channelId"`
	Role        string `json:"role"`
	AddedAt     string `json:"addedAt"`
	AddedBy     string `json:"addedBy"`
	Username    string `json:"username,omitempty"`
	DisplayName string `json:"displayName,omitempty"`
}

// ListModeratorsResponse represents the list moderators response
type ListModeratorsResponse struct {
	Moderators []Moderator `json:"moderators"`
	Total      int         `json:"total"`
	Limit      int         `json:"limit"`
	Offset     int         `json:"offset"`
}

// Example5: List Moderators
func (c *ModerationClient) Example5_ListModerators(channelID string) (*ListModeratorsResponse, error) {
	fmt.Println("=== Example 5: List Moderators ===")
	
	params := url.Values{}
	params.Add("channelId", channelID)
	params.Add("limit", "10")

	resp, err := c.do("GET", "/moderators?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list failed (%d): %s", resp.StatusCode, body)
	}

	var result ListModeratorsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Total moderators: %d\n", result.Total)
	for i, mod := range result.Moderators {
		fmt.Printf("  %d. %s (%s)\n", i+1, mod.Username, mod.Role)
	}
	fmt.Println()
	return &result, nil
}

// AddModeratorRequest represents the add moderator request
type AddModeratorRequest struct {
	UserID    string `json:"userId"`
	ChannelID string `json:"channelId"`
	Reason    string `json:"reason,omitempty"`
}

// AddModeratorResponse represents the add moderator response
type AddModeratorResponse struct {
	Success   bool      `json:"success"`
	Moderator Moderator `json:"moderator"`
	Message   string    `json:"message"`
}

// Example6: Add a Moderator
func (c *ModerationClient) Example6_AddModerator(channelID, userID, reason string) (*AddModeratorResponse, error) {
	fmt.Println("=== Example 6: Add a Moderator ===")
	
	req := AddModeratorRequest{
		UserID:    userID,
		ChannelID: channelID,
		Reason:    reason,
	}

	resp, err := c.do("POST", "/moderators", req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("add failed (%d): %s", resp.StatusCode, body)
	}

	var result AddModeratorResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Moderator added: %s\n", result.Message)
	fmt.Printf("Moderator ID: %s\n", result.Moderator.ID)
	fmt.Println()
	return &result, nil
}

// AuditLog represents an audit log entry
type AuditLog struct {
	ID                string `json:"id"`
	ModeratorID       string `json:"moderatorId"`
	ModeratorUsername string `json:"moderatorUsername"`
	Action            string `json:"action"`
	ContentType       string `json:"contentType"`
	ContentID         string `json:"contentId"`
	Reason            string `json:"reason"`
	CreatedAt         string `json:"createdAt"`
}

// ListAuditLogsResponse represents the list audit logs response
type ListAuditLogsResponse struct {
	Success bool `json:"success"`
	Data    []AuditLog `json:"data"`
	Meta    struct {
		Total  int `json:"total"`
		Limit  int `json:"limit"`
		Offset int `json:"offset"`
	} `json:"meta"`
}

// Example7: List Audit Logs
func (c *ModerationClient) Example7_ListAuditLogs() (*ListAuditLogsResponse, error) {
	fmt.Println("=== Example 7: List Audit Logs ===")
	
	params := url.Values{}
	params.Add("action", "ban_user")
	params.Add("limit", "10")

	resp, err := c.do("GET", "/audit-logs?"+params.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list failed (%d): %s", resp.StatusCode, body)
	}

	var result ListAuditLogsResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	fmt.Printf("Total logs: %d\n", result.Meta.Total)
	for i, log := range result.Data {
		if i < 3 {
			fmt.Printf("  %d. %s by %s at %s\n", i+1, log.Action, log.ModeratorUsername, log.CreatedAt)
		}
	}
	fmt.Println()
	return &result, nil
}

// Example9: Revoke a Ban
func (c *ModerationClient) Example9_RevokeBan(banID string) error {
	fmt.Println("=== Example 9: Revoke a Ban ===")
	
	if banID == "" {
		fmt.Println("Skipping: No ban ID provided\n")
		return nil
	}

	resp, err := c.do("DELETE", "/ban/"+banID, nil)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("revoke failed (%d): %s", resp.StatusCode, body)
	}

	fmt.Println("Ban revoked successfully\n")
	return nil
}

// Example10: Remove a Moderator
func (c *ModerationClient) Example10_RemoveModerator(moderatorID string) error {
	fmt.Println("=== Example 10: Remove a Moderator ===")
	
	if moderatorID == "" {
		fmt.Println("Skipping: No moderator ID provided\n")
		return nil
	}

	resp, err := c.do("DELETE", "/moderators/"+moderatorID, nil)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remove failed (%d): %s", resp.StatusCode, body)
	}

	fmt.Println("Moderator removed successfully\n")
	return nil
}

func main() {
	token := os.Getenv("API_TOKEN")
	if token == "" {
		fmt.Println("Error: API_TOKEN environment variable is required")
		fmt.Println("Usage: export API_TOKEN='your_token' && go run moderation-api-examples.go")
		os.Exit(1)
	}

	channelID := os.Getenv("CHANNEL_ID")
	if channelID == "" {
		channelID = defaultChannelID
	}

	userToBan := os.Getenv("USER_TO_BAN")
	if userToBan == "" {
		userToBan = "user-uuid-to-ban"
	}

	userToModerate := os.Getenv("USER_TO_MODERATE")
	if userToModerate == "" {
		userToModerate = "user-uuid-to-moderate"
	}

	client := NewClient(token)

	fmt.Println("Starting Moderation API Examples...\n")

	// Run examples
	if err := client.Example1_SyncBans(channelID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	if _, err := client.Example2_ListBans(channelID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	var banID string
	if ban, err := client.Example3_CreateBan(channelID, userToBan, "Violation of community guidelines"); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	} else if ban != nil {
		banID = ban.ID
	}

	if _, err := client.Example4_GetBanDetails(banID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	if _, err := client.Example5_ListModerators(channelID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	var moderatorID string
	if result, err := client.Example6_AddModerator(channelID, userToModerate, "Trusted community member"); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	} else if result != nil {
		moderatorID = result.Moderator.ID
	}

	if _, err := client.Example7_ListAuditLogs(); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	if err := client.Example9_RevokeBan(banID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	if err := client.Example10_RemoveModerator(moderatorID); err != nil {
		fmt.Printf("Error: %v\n\n", err)
	}

	fmt.Println("=== All examples completed ===\n")
	fmt.Println("Note: Some examples may fail if resources don't exist or you lack permissions.")
	fmt.Println("Update CHANNEL_ID, USER_TO_BAN, and USER_TO_MODERATE environment variables as needed.")
}
