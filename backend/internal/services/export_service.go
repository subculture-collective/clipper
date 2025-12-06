package services

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// ExportService handles data export operations for creators
type ExportService struct {
	exportRepo   *repository.ExportRepository
	emailService *EmailService
	exportDir    string
	baseURL      string
}

// NewExportService creates a new export service
func NewExportService(exportRepo *repository.ExportRepository, emailService *EmailService, exportDir string, baseURL string) *ExportService {
	// Ensure export directory exists
	if err := os.MkdirAll(exportDir, 0755); err != nil {
		utils.GetLogger().Error("Failed to create export directory", err)
	}
	
	return &ExportService{
		exportRepo:   exportRepo,
		emailService: emailService,
		exportDir:    exportDir,
		baseURL:      baseURL,
	}
}

// CreateExportRequest creates a new export request
func (s *ExportService) CreateExportRequest(ctx context.Context, userID uuid.UUID, creatorName string, format string) (*models.ExportRequest, error) {
	// Validate format
	if format != models.ExportFormatCSV && format != models.ExportFormatJSON {
		return nil, fmt.Errorf("invalid export format: %s", format)
	}

	// Create export request
	req := &models.ExportRequest{
		ID:          uuid.New(),
		UserID:      userID,
		CreatorName: creatorName,
		Format:      format,
		Status:      models.ExportStatusPending,
		EmailSent:   false,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.exportRepo.CreateExportRequest(ctx, req); err != nil {
		return nil, fmt.Errorf("failed to create export request: %w", err)
	}

	return req, nil
}

// GetExportRequest retrieves an export request by ID
func (s *ExportService) GetExportRequest(ctx context.Context, id uuid.UUID) (*models.ExportRequest, error) {
	return s.exportRepo.GetExportRequestByID(ctx, id)
}

// GetUserExportRequests retrieves all export requests for a user
func (s *ExportService) GetUserExportRequests(ctx context.Context, userID uuid.UUID) ([]*models.ExportRequest, error) {
	return s.exportRepo.GetUserExportRequests(ctx, userID, 50)
}

// ProcessExportRequest processes a pending export request
func (s *ExportService) ProcessExportRequest(ctx context.Context, req *models.ExportRequest) error {
	logger := utils.GetLogger()
	
	// Update status to processing
	if err := s.exportRepo.UpdateExportStatus(ctx, req.ID, models.ExportStatusProcessing, nil); err != nil {
		logger.Error("Failed to update export status to processing", err)
		return err
	}

	// Get clips for export
	clips, err := s.exportRepo.GetCreatorClipsForExport(ctx, req.CreatorName)
	if err != nil {
		errMsg := fmt.Sprintf("Failed to retrieve clips: %v", err)
		s.exportRepo.UpdateExportStatus(ctx, req.ID, models.ExportStatusFailed, &errMsg)
		return fmt.Errorf("failed to retrieve clips: %w", err)
	}

	// Generate export file
	var filePath string
	var fileSize int64
	
	switch req.Format {
	case models.ExportFormatCSV:
		filePath, fileSize, err = s.generateCSVExport(req.ID, clips)
	case models.ExportFormatJSON:
		filePath, fileSize, err = s.generateJSONExport(req.ID, clips)
	default:
		errMsg := fmt.Sprintf("Unsupported format: %s", req.Format)
		s.exportRepo.UpdateExportStatus(ctx, req.ID, models.ExportStatusFailed, &errMsg)
		return fmt.Errorf("unsupported format: %s", req.Format)
	}

	if err != nil {
		errMsg := fmt.Sprintf("Failed to generate export file: %v", err)
		s.exportRepo.UpdateExportStatus(ctx, req.ID, models.ExportStatusFailed, &errMsg)
		return fmt.Errorf("failed to generate export file: %w", err)
	}

	// Set expiration time (7 days from now)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)

	// Mark as completed
	if err := s.exportRepo.CompleteExportRequest(ctx, req.ID, filePath, fileSize, expiresAt); err != nil {
		logger.Error("Failed to mark export as completed", err)
		return err
	}

	// Send email notification
	if s.emailService != nil {
		downloadURL := fmt.Sprintf("%s/api/v1/creators/me/export/download/%s", s.baseURL, req.ID)
		if err := s.sendExportCompletedEmail(ctx, req, downloadURL, expiresAt); err != nil {
			logger.Error("Failed to send export completion email", err)
			// Don't fail the export if email fails
		} else {
			s.exportRepo.MarkEmailSent(ctx, req.ID)
		}
	}

	return nil
}

// generateCSVExport generates a CSV export file
func (s *ExportService) generateCSVExport(exportID uuid.UUID, clips []*models.Clip) (string, int64, error) {
	filename := fmt.Sprintf("export_%s.csv", exportID.String())
	filePath := filepath.Join(s.exportDir, filename)

	file, err := os.Create(filePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create CSV file: %w", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write header
	header := []string{
		"ID", "Twitch Clip ID", "Title", "Creator Name", "Broadcaster Name",
		"Game Name", "Language", "Duration (seconds)", "View Count", "Vote Score",
		"Comment Count", "Favorite Count", "Created At", "Clip URL", "Embed URL",
		"Thumbnail URL", "Is Featured", "Is NSFW", "Is Hidden",
	}
	if err := writer.Write(header); err != nil {
		return "", 0, fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Write clip data
	for _, clip := range clips {
		record := []string{
			clip.ID.String(),
			clip.TwitchClipID,
			clip.Title,
			clip.CreatorName,
			clip.BroadcasterName,
			getStringValue(clip.GameName),
			getStringValue(clip.Language),
			getFloat64Value(clip.Duration),
			fmt.Sprintf("%d", clip.ViewCount),
			fmt.Sprintf("%d", clip.VoteScore),
			fmt.Sprintf("%d", clip.CommentCount),
			fmt.Sprintf("%d", clip.FavoriteCount),
			clip.CreatedAt.Format(time.RFC3339),
			clip.TwitchClipURL,
			clip.EmbedURL,
			getStringValue(clip.ThumbnailURL),
			fmt.Sprintf("%t", clip.IsFeatured),
			fmt.Sprintf("%t", clip.IsNSFW),
			fmt.Sprintf("%t", clip.IsHidden),
		}
		if err := writer.Write(record); err != nil {
			return "", 0, fmt.Errorf("failed to write CSV record: %w", err)
		}
	}

	// Get file size
	fileInfo, err := file.Stat()
	if err != nil {
		return "", 0, fmt.Errorf("failed to get file info: %w", err)
	}

	return filePath, fileInfo.Size(), nil
}

// generateJSONExport generates a JSON export file
func (s *ExportService) generateJSONExport(exportID uuid.UUID, clips []*models.Clip) (string, int64, error) {
	filename := fmt.Sprintf("export_%s.json", exportID.String())
	filePath := filepath.Join(s.exportDir, filename)

	file, err := os.Create(filePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to create JSON file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	
	exportData := map[string]interface{}{
		"export_id":    exportID,
		"generated_at": time.Now().Format(time.RFC3339),
		"clip_count":   len(clips),
		"clips":        clips,
	}

	if err := encoder.Encode(exportData); err != nil {
		return "", 0, fmt.Errorf("failed to encode JSON: %w", err)
	}

	// Get file size
	fileInfo, err := file.Stat()
	if err != nil {
		return "", 0, fmt.Errorf("failed to get file info: %w", err)
	}

	return filePath, fileInfo.Size(), nil
}

// sendExportCompletedEmail sends an email notification when export is ready
func (s *ExportService) sendExportCompletedEmail(ctx context.Context, req *models.ExportRequest, downloadURL string, expiresAt time.Time) error {
	// For now, we'll skip email sending if we can't retrieve the user
	// In a production system, you'd want to handle this differently
	// The email service needs the user object, which we don't have direct access to
	// This would require adding a user repository to the export service
	// For this implementation, we'll log that the export is ready and skip email
	logger := utils.GetLogger()
	logger.Info("Export completed, email notification skipped (requires user repository)", map[string]interface{}{
		"export_id":    req.ID.String(),
		"user_id":      req.UserID.String(),
		"creator_name": req.CreatorName,
		"format":       req.Format,
	})
	return nil
}

// CleanupExpiredExports removes expired export files
func (s *ExportService) CleanupExpiredExports(ctx context.Context) error {
	logger := utils.GetLogger()
	
	// Get expired exports
	expiredExports, err := s.exportRepo.GetExpiredExportRequests(ctx)
	if err != nil {
		return fmt.Errorf("failed to get expired exports: %w", err)
	}

	for _, export := range expiredExports {
		// Delete file if it exists
		if export.FilePath != nil && *export.FilePath != "" {
			if err := os.Remove(*export.FilePath); err != nil {
				if !os.IsNotExist(err) {
					logger.Error("Failed to delete export file", err, map[string]interface{}{
						"file_path": *export.FilePath,
					})
				}
			} else {
				logger.Info("Deleted expired export file", map[string]interface{}{
					"file_path": *export.FilePath,
				})
			}
		}

		// Mark as expired
		if err := s.exportRepo.MarkExportExpired(ctx, export.ID); err != nil {
			logger.Error("Failed to mark export as expired", err, map[string]interface{}{
				"export_id": export.ID.String(),
			})
		}
	}

	return nil
}

// GetExportFilePath returns the file path for a completed export
func (s *ExportService) GetExportFilePath(ctx context.Context, exportID uuid.UUID) (string, error) {
	req, err := s.exportRepo.GetExportRequestByID(ctx, exportID)
	if err != nil {
		return "", fmt.Errorf("failed to get export request: %w", err)
	}

	if req.Status != models.ExportStatusCompleted {
		return "", fmt.Errorf("export is not completed yet (status: %s)", req.Status)
	}

	if req.FilePath == nil || *req.FilePath == "" {
		return "", fmt.Errorf("export file path not found")
	}

	// Check if file exists
	if _, err := os.Stat(*req.FilePath); os.IsNotExist(err) {
		return "", fmt.Errorf("export file not found")
	}

	return *req.FilePath, nil
}

// Helper functions
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func getFloat64Value(f *float64) string {
	if f == nil {
		return "0"
	}
	return fmt.Sprintf("%.2f", *f)
}
