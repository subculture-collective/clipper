package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

var (
	// ErrVerificationAlreadyExists is returned when user already has a pending verification
	ErrVerificationAlreadyExists = errors.New("active verification application already exists")
	// ErrNotEligibleForVerification is returned when user doesn't meet criteria
	ErrNotEligibleForVerification = errors.New("user does not meet verification eligibility criteria")
	// ErrInvalidVerificationStatus is returned when trying to perform invalid status transition
	ErrInvalidVerificationStatus = errors.New("invalid verification status transition")
)

// Eligibility criteria constants
const (
	MinFollowerCount         = 100   // Minimum followers required
	MinContentCreationMonths = 3     // Minimum months of content creation
)

// VerificationRepositoryInterface defines the verification repository interface
type VerificationRepositoryInterface interface {
	Create(ctx context.Context, verification *models.CreatorVerification) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.CreatorVerification, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.CreatorVerification, error)
	List(ctx context.Context, status *models.VerificationStatus, limit, offset int) ([]models.VerificationWithUser, int, error)
	Update(ctx context.Context, verification *models.CreatorVerification) error
	CreateAuditLog(ctx context.Context, log *models.VerificationAuditLog) error
	GetAuditLogs(ctx context.Context, verificationID uuid.UUID) ([]models.VerificationAuditLog, error)
}

// UserRepositoryInterface defines the user repository interface
type UserRepositoryInterface interface {
	GetByID(ctx context.Context, id uuid.UUID) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
}

// VerificationService handles verification business logic
type VerificationService struct {
	verificationRepo VerificationRepositoryInterface
	userRepo         UserRepositoryInterface
}

// NewVerificationService creates a new verification service
func NewVerificationService(
	verificationRepo *repository.VerificationRepository,
	userRepo *repository.UserRepository,
) *VerificationService {
	return &VerificationService{
		verificationRepo: verificationRepo,
		userRepo:         userRepo,
	}
}

// SubmitApplication submits a new verification application
func (s *VerificationService) SubmitApplication(ctx context.Context, userID uuid.UUID, req *models.VerificationApplicationRequest) (*models.CreatorVerification, error) {
	// Check if user exists
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check if user is already verified
	if user.IsVerified {
		return nil, errors.New("user is already verified")
	}

	// Check eligibility criteria
	if err := s.checkEligibility(req); err != nil {
		return nil, err
	}

	// Check for existing active application
	existingVerification, err := s.verificationRepo.GetByUserID(ctx, userID)
	if err != nil && !errors.Is(err, repository.ErrVerificationNotFound) {
		return nil, fmt.Errorf("failed to check existing verification: %w", err)
	}

	// If there's an active pending application, reject new submission
	if existingVerification != nil && existingVerification.Status == models.VerificationStatusPending {
		return nil, ErrVerificationAlreadyExists
	}

	// Create new verification application
	verification := &models.CreatorVerification{
		ID:                    uuid.New(),
		UserID:                userID,
		Status:                models.VerificationStatusPending,
		ApplicationReason:     req.ApplicationReason,
		IdentityDocumentType:  req.IdentityDocumentType,
		FollowerCount:         req.FollowerCount,
		ContentCreationMonths: req.ContentCreationMonths,
		PlatformUsername:      req.PlatformUsername,
		PlatformURL:           req.PlatformURL,
	}

	if err := s.verificationRepo.Create(ctx, verification); err != nil {
		return nil, fmt.Errorf("failed to create verification: %w", err)
	}

	// Create audit log
	auditLog := &models.VerificationAuditLog{
		ID:             uuid.New(),
		VerificationID: verification.ID,
		Action:         "submitted",
		PerformedBy:    &userID,
		NewStatus:      &verification.Status,
		Metadata: map[string]interface{}{
			"follower_count":          req.FollowerCount,
			"content_creation_months": req.ContentCreationMonths,
		},
	}

	if err := s.verificationRepo.CreateAuditLog(ctx, auditLog); err != nil {
		// Log error but don't fail the request
		fmt.Printf("WARNING: failed to create audit log: %v\n", err)
	}

	return verification, nil
}

// checkEligibility checks if the applicant meets the eligibility criteria
func (s *VerificationService) checkEligibility(req *models.VerificationApplicationRequest) error {
	// Check follower count
	if req.FollowerCount != nil && *req.FollowerCount < MinFollowerCount {
		return fmt.Errorf("%w: minimum %d followers required", ErrNotEligibleForVerification, MinFollowerCount)
	}

	// Check content creation duration
	if req.ContentCreationMonths != nil && *req.ContentCreationMonths < MinContentCreationMonths {
		return fmt.Errorf("%w: minimum %d months of content creation required", ErrNotEligibleForVerification, MinContentCreationMonths)
	}

	return nil
}

// GetVerificationStatus gets the current verification status for a user
func (s *VerificationService) GetVerificationStatus(ctx context.Context, userID uuid.UUID) (*models.VerificationResponse, error) {
	verification, err := s.verificationRepo.GetByUserID(ctx, userID)
	if err != nil {
		if errors.Is(err, repository.ErrVerificationNotFound) {
			return nil, nil // No verification application
		}
		return nil, fmt.Errorf("failed to get verification: %w", err)
	}

	return s.toVerificationResponse(verification), nil
}

// ReviewApplication reviews a verification application (admin only)
func (s *VerificationService) ReviewApplication(ctx context.Context, verificationID uuid.UUID, reviewerID uuid.UUID, req *models.VerificationReviewRequest) (*models.CreatorVerification, error) {
	// Get verification
	verification, err := s.verificationRepo.GetByID(ctx, verificationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get verification: %w", err)
	}

	// Check if already reviewed
	if verification.Status != models.VerificationStatusPending {
		return nil, ErrInvalidVerificationStatus
	}

	previousStatus := verification.Status
	now := time.Now()

	// Update verification based on action
	switch req.Action {
	case "approve":
		verification.Status = models.VerificationStatusApproved
		verification.ReviewedBy = &reviewerID
		verification.ReviewedAt = &now
		verification.ReviewNotes = req.ReviewNotes

		// Update user's verified status
		if err := s.updateUserVerificationStatus(ctx, verification.UserID, true, &now); err != nil {
			return nil, fmt.Errorf("failed to update user verification status: %w", err)
		}

	case "reject":
		verification.Status = models.VerificationStatusRejected
		verification.ReviewedBy = &reviewerID
		verification.ReviewedAt = &now
		verification.ReviewNotes = req.ReviewNotes
		verification.RejectionReason = req.RejectionReason

	case "revoke":
		verification.Status = models.VerificationStatusRevoked
		verification.ReviewedBy = &reviewerID
		verification.ReviewedAt = &now
		verification.ReviewNotes = req.ReviewNotes

		// Update user's verified status
		if err := s.updateUserVerificationStatus(ctx, verification.UserID, false, nil); err != nil {
			return nil, fmt.Errorf("failed to update user verification status: %w", err)
		}

	default:
		return nil, errors.New("invalid review action")
	}

	// Update verification
	if err := s.verificationRepo.Update(ctx, verification); err != nil {
		return nil, fmt.Errorf("failed to update verification: %w", err)
	}

	// Create audit log
	auditLog := &models.VerificationAuditLog{
		ID:             uuid.New(),
		VerificationID: verification.ID,
		Action:         req.Action,
		PerformedBy:    &reviewerID,
		PreviousStatus: &previousStatus,
		NewStatus:      &verification.Status,
		Notes:          req.ReviewNotes,
		Metadata: map[string]interface{}{
			"rejection_reason": req.RejectionReason,
		},
	}

	if err := s.verificationRepo.CreateAuditLog(ctx, auditLog); err != nil {
		// Log error but don't fail the request
		fmt.Printf("WARNING: failed to create audit log: %v\n", err)
	}

	return verification, nil
}

// ListApplications lists verification applications (admin only)
func (s *VerificationService) ListApplications(ctx context.Context, status *models.VerificationStatus, page, limit int) ([]models.VerificationWithUser, int, error) {
	offset := (page - 1) * limit
	verifications, total, err := s.verificationRepo.List(ctx, status, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list verifications: %w", err)
	}

	return verifications, total, nil
}

// GetAuditLogs gets the audit trail for a verification
func (s *VerificationService) GetAuditLogs(ctx context.Context, verificationID uuid.UUID) ([]models.VerificationAuditLog, error) {
	logs, err := s.verificationRepo.GetAuditLogs(ctx, verificationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit logs: %w", err)
	}
	return logs, nil
}

// updateUserVerificationStatus updates the user's verified status
func (s *VerificationService) updateUserVerificationStatus(ctx context.Context, userID uuid.UUID, verified bool, verifiedAt *time.Time) error {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return err
	}

	user.IsVerified = verified
	user.VerifiedAt = verifiedAt

	if err := s.userRepo.Update(ctx, user); err != nil {
		return err
	}

	return nil
}

// toVerificationResponse converts a verification to a response
func (s *VerificationService) toVerificationResponse(v *models.CreatorVerification) *models.VerificationResponse {
	return &models.VerificationResponse{
		ID:                    v.ID,
		UserID:                v.UserID,
		Status:                v.Status,
		ApplicationReason:     v.ApplicationReason,
		IdentityDocumentType:  v.IdentityDocumentType,
		IdentityVerified:      v.IdentityVerified,
		IdentityVerifiedAt:    v.IdentityVerifiedAt,
		FollowerCount:         v.FollowerCount,
		ContentCreationMonths: v.ContentCreationMonths,
		PlatformUsername:      v.PlatformUsername,
		PlatformURL:           v.PlatformURL,
		ReviewedAt:            v.ReviewedAt,
		RejectionReason:       v.RejectionReason,
		CreatedAt:             v.CreatedAt,
		UpdatedAt:             v.UpdatedAt,
	}
}
