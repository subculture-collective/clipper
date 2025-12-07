package services

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// MockVerificationRepository is a mock implementation of VerificationRepository
type MockVerificationRepository struct {
	mock.Mock
}

func (m *MockVerificationRepository) Create(ctx context.Context, verification *models.CreatorVerification) error {
	args := m.Called(ctx, verification)
	return args.Error(0)
}

func (m *MockVerificationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.CreatorVerification, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CreatorVerification), args.Error(1)
}

func (m *MockVerificationRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.CreatorVerification, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CreatorVerification), args.Error(1)
}

func (m *MockVerificationRepository) List(ctx context.Context, status *models.VerificationStatus, limit, offset int) ([]models.VerificationWithUser, int, error) {
	args := m.Called(ctx, status, limit, offset)
	return args.Get(0).([]models.VerificationWithUser), args.Int(1), args.Error(2)
}

func (m *MockVerificationRepository) Update(ctx context.Context, verification *models.CreatorVerification) error {
	args := m.Called(ctx, verification)
	return args.Error(0)
}

func (m *MockVerificationRepository) CreateAuditLog(ctx context.Context, log *models.VerificationAuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

func (m *MockVerificationRepository) GetAuditLogs(ctx context.Context, verificationID uuid.UUID) ([]models.VerificationAuditLog, error) {
	args := m.Called(ctx, verificationID)
	return args.Get(0).([]models.VerificationAuditLog), args.Error(1)
}

// MockUserRepository is a mock implementation of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *models.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func TestSubmitApplication_Success(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	userID := uuid.New()
	followerCount := 150
	contentMonths := 6

	user := &models.User{
		ID:         userID,
		IsVerified: false,
	}

	req := &models.VerificationApplicationRequest{
		FollowerCount:         &followerCount,
		ContentCreationMonths: &contentMonths,
	}

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)
	mockVerificationRepo.On("GetByUserID", ctx, userID).Return(nil, repository.ErrVerificationNotFound)
	mockVerificationRepo.On("Create", ctx, mock.AnythingOfType("*models.CreatorVerification")).Return(nil)
	mockVerificationRepo.On("CreateAuditLog", ctx, mock.AnythingOfType("*models.VerificationAuditLog")).Return(nil)

	// Execute
	verification, err := service.SubmitApplication(ctx, userID, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, verification)
	assert.Equal(t, userID, verification.UserID)
	assert.Equal(t, models.VerificationStatusPending, verification.Status)
	mockVerificationRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}

func TestSubmitApplication_AlreadyVerified(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	userID := uuid.New()
	followerCount := 150

	user := &models.User{
		ID:         userID,
		IsVerified: true,
	}

	req := &models.VerificationApplicationRequest{
		FollowerCount: &followerCount,
	}

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)

	// Execute
	verification, err := service.SubmitApplication(ctx, userID, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, verification)
	assert.Contains(t, err.Error(), "already verified")
	mockUserRepo.AssertExpectations(t)
}

func TestSubmitApplication_NotEligible_LowFollowers(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	userID := uuid.New()
	followerCount := 50 // Below minimum

	user := &models.User{
		ID:         userID,
		IsVerified: false,
	}

	req := &models.VerificationApplicationRequest{
		FollowerCount: &followerCount,
	}

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)

	// Execute
	verification, err := service.SubmitApplication(ctx, userID, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, verification)
	assert.True(t, errors.Is(err, ErrNotEligibleForVerification))
	mockUserRepo.AssertExpectations(t)
}

func TestSubmitApplication_PendingExists(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	userID := uuid.New()
	followerCount := 150

	user := &models.User{
		ID:         userID,
		IsVerified: false,
	}

	existingVerification := &models.CreatorVerification{
		ID:     uuid.New(),
		UserID: userID,
		Status: models.VerificationStatusPending,
	}

	req := &models.VerificationApplicationRequest{
		FollowerCount: &followerCount,
	}

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)
	mockVerificationRepo.On("GetByUserID", ctx, userID).Return(existingVerification, nil)

	// Execute
	verification, err := service.SubmitApplication(ctx, userID, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, verification)
	assert.True(t, errors.Is(err, ErrVerificationAlreadyExists))
	mockVerificationRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}

func TestReviewApplication_Approve(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	verificationID := uuid.New()
	userID := uuid.New()
	reviewerID := uuid.New()

	verification := &models.CreatorVerification{
		ID:     verificationID,
		UserID: userID,
		Status: models.VerificationStatusPending,
	}

	user := &models.User{
		ID:         userID,
		IsVerified: false,
	}

	req := &models.VerificationReviewRequest{
		Action: "approve",
	}

	// Mock expectations
	mockVerificationRepo.On("GetByID", ctx, verificationID).Return(verification, nil)
	mockUserRepo.On("GetByID", ctx, userID).Return(user, nil)
	mockUserRepo.On("Update", ctx, mock.MatchedBy(func(u *models.User) bool {
		return u.IsVerified == true && u.VerifiedAt != nil
	})).Return(nil)
	mockVerificationRepo.On("Update", ctx, mock.MatchedBy(func(v *models.CreatorVerification) bool {
		return v.Status == models.VerificationStatusApproved
	})).Return(nil)
	mockVerificationRepo.On("CreateAuditLog", ctx, mock.AnythingOfType("*models.VerificationAuditLog")).Return(nil)

	// Execute
	result, err := service.ReviewApplication(ctx, verificationID, reviewerID, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.VerificationStatusApproved, result.Status)
	mockVerificationRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}

func TestReviewApplication_Reject(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	verificationID := uuid.New()
	userID := uuid.New()
	reviewerID := uuid.New()
	rejectionReason := "Insufficient evidence"

	verification := &models.CreatorVerification{
		ID:     verificationID,
		UserID: userID,
		Status: models.VerificationStatusPending,
	}

	req := &models.VerificationReviewRequest{
		Action:          "reject",
		RejectionReason: &rejectionReason,
	}

	// Mock expectations
	mockVerificationRepo.On("GetByID", ctx, verificationID).Return(verification, nil)
	mockVerificationRepo.On("Update", ctx, mock.MatchedBy(func(v *models.CreatorVerification) bool {
		return v.Status == models.VerificationStatusRejected && v.RejectionReason != nil
	})).Return(nil)
	mockVerificationRepo.On("CreateAuditLog", ctx, mock.AnythingOfType("*models.VerificationAuditLog")).Return(nil)

	// Execute
	result, err := service.ReviewApplication(ctx, verificationID, reviewerID, req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, models.VerificationStatusRejected, result.Status)
	assert.Equal(t, rejectionReason, *result.RejectionReason)
	mockVerificationRepo.AssertExpectations(t)
}

func TestReviewApplication_AlreadyReviewed(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	verificationID := uuid.New()
	reviewerID := uuid.New()

	verification := &models.CreatorVerification{
		ID:     verificationID,
		Status: models.VerificationStatusApproved, // Already reviewed
	}

	req := &models.VerificationReviewRequest{
		Action: "approve",
	}

	// Mock expectations
	mockVerificationRepo.On("GetByID", ctx, verificationID).Return(verification, nil)

	// Execute
	result, err := service.ReviewApplication(ctx, verificationID, reviewerID, req)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, ErrInvalidVerificationStatus))
	mockVerificationRepo.AssertExpectations(t)
}

func TestGetVerificationStatus(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	userID := uuid.New()

	verification := &models.CreatorVerification{
		ID:     uuid.New(),
		UserID: userID,
		Status: models.VerificationStatusPending,
	}

	// Mock expectations
	mockVerificationRepo.On("GetByUserID", ctx, userID).Return(verification, nil)

	// Execute
	result, err := service.GetVerificationStatus(ctx, userID)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, userID, result.UserID)
	assert.Equal(t, models.VerificationStatusPending, result.Status)
	mockVerificationRepo.AssertExpectations(t)
}

func TestListApplications(t *testing.T) {
	mockVerificationRepo := new(MockVerificationRepository)
	mockUserRepo := new(MockUserRepository)
	service := &VerificationService{
		verificationRepo: mockVerificationRepo,
		userRepo:         mockUserRepo,
	}

	ctx := context.Background()
	status := models.VerificationStatusPending
	page := 1
	limit := 20

	verifications := []models.VerificationWithUser{
		{
			CreatorVerification: models.CreatorVerification{
				ID:     uuid.New(),
				Status: models.VerificationStatusPending,
			},
			Username: "user1",
		},
	}

	// Mock expectations
	mockVerificationRepo.On("List", ctx, &status, limit, 0).Return(verifications, 1, nil)

	// Execute
	result, total, err := service.ListApplications(ctx, &status, page, limit)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, 1, len(result))
	assert.Equal(t, 1, total)
	mockVerificationRepo.AssertExpectations(t)
}
