package models

import (
	"time"

	"github.com/google/uuid"
)

// VerificationStatus represents the status of a verification application
type VerificationStatus string

const (
	VerificationStatusPending  VerificationStatus = "pending"
	VerificationStatusApproved VerificationStatus = "approved"
	VerificationStatusRejected VerificationStatus = "rejected"
	VerificationStatusRevoked  VerificationStatus = "revoked"
)

// IdentityDocumentType represents the type of identity document submitted
type IdentityDocumentType string

const (
	IdentityDocumentGovernmentID IdentityDocumentType = "government_id"
	IdentityDocumentPassport     IdentityDocumentType = "passport"
	IdentityDocumentOther        IdentityDocumentType = "other"
)

// CreatorVerification represents a creator verification application
type CreatorVerification struct {
	ID     uuid.UUID          `json:"id" db:"id"`
	UserID uuid.UUID          `json:"user_id" db:"user_id"`
	Status VerificationStatus `json:"status" db:"status"`

	// Application data
	ApplicationReason    *string               `json:"application_reason,omitempty" db:"application_reason"`
	IdentityDocumentType *IdentityDocumentType `json:"identity_document_type,omitempty" db:"identity_document_type"`
	IdentityVerified     bool                  `json:"identity_verified" db:"identity_verified"`
	IdentityVerifiedAt   *time.Time            `json:"identity_verified_at,omitempty" db:"identity_verified_at"`
	IdentityVerifiedBy   *uuid.UUID            `json:"identity_verified_by,omitempty" db:"identity_verified_by"`

	// Eligibility criteria
	FollowerCount         *int    `json:"follower_count,omitempty" db:"follower_count"`
	ContentCreationMonths *int    `json:"content_creation_months,omitempty" db:"content_creation_months"`
	PlatformUsername      *string `json:"platform_username,omitempty" db:"platform_username"`
	PlatformURL           *string `json:"platform_url,omitempty" db:"platform_url"`

	// Review information
	ReviewedBy       *uuid.UUID `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt       *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	ReviewNotes      *string    `json:"review_notes,omitempty" db:"review_notes"`
	RejectionReason  *string    `json:"rejection_reason,omitempty" db:"rejection_reason"`

	// Timestamps
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// VerificationAuditLog represents an audit log entry for verification actions
type VerificationAuditLog struct {
	ID             uuid.UUID          `json:"id" db:"id"`
	VerificationID uuid.UUID          `json:"verification_id" db:"verification_id"`
	Action         string             `json:"action" db:"action"`
	PerformedBy    *uuid.UUID         `json:"performed_by,omitempty" db:"performed_by"`
	PreviousStatus *VerificationStatus `json:"previous_status,omitempty" db:"previous_status"`
	NewStatus      *VerificationStatus `json:"new_status,omitempty" db:"new_status"`
	Notes          *string            `json:"notes,omitempty" db:"notes"`
	Metadata       map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	CreatedAt      time.Time          `json:"created_at" db:"created_at"`
}

// VerificationApplicationRequest represents a request to apply for verification
type VerificationApplicationRequest struct {
	ApplicationReason     *string               `json:"application_reason,omitempty" binding:"omitempty,max=1000"`
	IdentityDocumentType  *IdentityDocumentType `json:"identity_document_type,omitempty" binding:"omitempty,oneof=government_id passport other"`
	FollowerCount         *int                  `json:"follower_count,omitempty" binding:"omitempty,min=0"`
	ContentCreationMonths *int                  `json:"content_creation_months,omitempty" binding:"omitempty,min=0"`
	PlatformUsername      *string               `json:"platform_username,omitempty" binding:"omitempty,max=255"`
	PlatformURL           *string               `json:"platform_url,omitempty" binding:"omitempty,url,max=500"`
}

// VerificationReviewRequest represents a request to review a verification application
type VerificationReviewRequest struct {
	Action          string  `json:"action" binding:"required,oneof=approve reject revoke"`
	ReviewNotes     *string `json:"review_notes,omitempty" binding:"omitempty,max=1000"`
	RejectionReason *string `json:"rejection_reason,omitempty" binding:"required_if=Action reject,omitempty,max=500"`
}

// VerificationResponse represents the response containing verification details
type VerificationResponse struct {
	ID                    uuid.UUID              `json:"id"`
	UserID                uuid.UUID              `json:"user_id"`
	Status                VerificationStatus     `json:"status"`
	ApplicationReason     *string                `json:"application_reason,omitempty"`
	IdentityDocumentType  *IdentityDocumentType  `json:"identity_document_type,omitempty"`
	IdentityVerified      bool                   `json:"identity_verified"`
	IdentityVerifiedAt    *time.Time             `json:"identity_verified_at,omitempty"`
	FollowerCount         *int                   `json:"follower_count,omitempty"`
	ContentCreationMonths *int                   `json:"content_creation_months,omitempty"`
	PlatformUsername      *string                `json:"platform_username,omitempty"`
	PlatformURL           *string                `json:"platform_url,omitempty"`
	ReviewedAt            *time.Time             `json:"reviewed_at,omitempty"`
	RejectionReason       *string                `json:"rejection_reason,omitempty"`
	CreatedAt             time.Time              `json:"created_at"`
	UpdatedAt             time.Time              `json:"updated_at"`
}

// VerificationWithUser represents a verification application with user details
type VerificationWithUser struct {
	CreatorVerification
	Username    string `json:"username" db:"username"`
	DisplayName string `json:"display_name" db:"display_name"`
	AvatarURL   *string `json:"avatar_url,omitempty" db:"avatar_url"`
}
