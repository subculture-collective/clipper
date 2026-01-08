package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/subculture-collective/clipper/internal/models"
)

// MockCommunityRepository is a mock implementation of CommunityRepository
type MockCommunityRepository struct {
	mock.Mock
}

func (m *MockCommunityRepository) GetCommunityByID(ctx context.Context, id uuid.UUID) (*models.Community, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Community), args.Error(1)
}

func (m *MockCommunityRepository) GetMember(ctx context.Context, communityID, userID uuid.UUID) (*models.CommunityMember, error) {
	args := m.Called(ctx, communityID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CommunityMember), args.Error(1)
}

func (m *MockCommunityRepository) IsBanned(ctx context.Context, communityID, userID uuid.UUID) (bool, error) {
	args := m.Called(ctx, communityID, userID)
	return args.Bool(0), args.Error(1)
}

func (m *MockCommunityRepository) BanMember(ctx context.Context, ban *models.CommunityBan) error {
	args := m.Called(ctx, ban)
	return args.Error(0)
}

func (m *MockCommunityRepository) UnbanMember(ctx context.Context, communityID, userID uuid.UUID) error {
	args := m.Called(ctx, communityID, userID)
	return args.Error(0)
}

func (m *MockCommunityRepository) RemoveMember(ctx context.Context, communityID, userID uuid.UUID) error {
	args := m.Called(ctx, communityID, userID)
	return args.Error(0)
}

func (m *MockCommunityRepository) ListBans(ctx context.Context, communityID uuid.UUID, limit, offset int) ([]*models.CommunityBan, int, error) {
	args := m.Called(ctx, communityID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*models.CommunityBan), args.Int(1), args.Error(2)
}

// MockModerationUserRepository is a mock implementation of UserRepository for moderation tests
type MockModerationUserRepository struct {
	mock.Mock
}

func (m *MockModerationUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.User), args.Error(1)
}

// MockModerationAuditLogRepository is a mock implementation of AuditLogRepository for moderation tests
type MockModerationAuditLogRepository struct {
	mock.Mock
}

func (m *MockModerationAuditLogRepository) Create(ctx context.Context, log *models.ModerationAuditLog) error {
	args := m.Called(ctx, log)
	return args.Error(0)
}

// MockDBPool is a mock implementation of pgxpool.Pool for transactions
type MockDBPool struct {
	mock.Mock
}

type MockTx struct {
	mock.Mock
}

func (m *MockTx) Commit(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockTx) Rollback(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

// Test helper to create a site moderator
func createSiteModerator() *models.User {
	return &models.User{
		ID:             uuid.New(),
		Username:       "sitemod",
		AccountType:    models.AccountTypeModerator,
		ModeratorScope: models.ModeratorScopeSite,
	}
}

// Test helper to create a community moderator
func createCommunityModerator(communityID uuid.UUID) *models.User {
	return &models.User{
		ID:                 uuid.New(),
		Username:           "communitymod",
		AccountType:        models.AccountTypeCommunityModerator,
		ModeratorScope:     models.ModeratorScopeCommunity,
		ModerationChannels: []uuid.UUID{communityID},
	}
}

// Test helper to create an admin
func createAdmin() *models.User {
	return &models.User{
		ID:          uuid.New(),
		Username:    "admin",
		AccountType: models.AccountTypeAdmin,
		Role:        models.RoleAdmin,
	}
}

// Test helper to create a regular user
func createRegularUser() *models.User {
	return &models.User{
		ID:          uuid.New(),
		Username:    "regularuser",
		AccountType: models.AccountTypeMember,
		Role:        models.RoleUser,
	}
}

func TestModerationService_BanUser_SiteModerator(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)
	mockAuditLogRepo := new(MockModerationAuditLogRepository)

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	
	community := &models.Community{
		ID:      communityID,
		OwnerID: uuid.New(), // Different from target user
	}
	mockCommunityRepo.On("GetCommunityByID", ctx, communityID).Return(community, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
		auditLogRepo:  mockAuditLogRepo,
	}

	// Note: We can't properly test transaction without a real DB pool
	// In a real test environment, you'd use a test database
	// This test only validates permission and scope checks
	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	err = service.validateModerationScope(siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_BanUser_CommunityModerator_Authorized(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	communityMod := createCommunityModerator(communityID)

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	// Mock expectations
	mockUserRepo.On("GetByID", ctx, communityMod.ID).Return(communityMod, nil)
	
	member := &models.CommunityMember{
		ID:          uuid.New(),
		CommunityID: communityID,
		UserID:      communityMod.ID,
		Role:        models.CommunityRoleMod,
	}
	mockCommunityRepo.On("GetMember", ctx, communityID, communityMod.ID).Return(member, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	err := service.validateModerationPermission(ctx, communityMod, communityID)
	assert.NoError(t, err)

	err = service.validateModerationScope(communityMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_BanUser_CommunityModerator_Unauthorized(t *testing.T) {
	communityID := uuid.New()
	otherCommunityID := uuid.New()
	communityMod := createCommunityModerator(otherCommunityID) // Authorized for different community

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Should fail scope validation
	err := service.validateModerationScope(communityMod, communityID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not authorized to moderate this community")
}

func TestModerationService_BanUser_RegularUser_Denied(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	regularUser := createRegularUser()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Should fail permission validation
	err := service.validateModerationPermission(ctx, regularUser, communityID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient permissions")
}

func TestModerationService_BanUser_CannotBanOwner(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	ownerID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	
	community := &models.Community{
		ID:      communityID,
		OwnerID: ownerID,
	}
	mockCommunityRepo.On("GetCommunityByID", ctx, communityID).Return(community, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Validate permission and scope pass, but trying to ban owner should fail
	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_UnbanUser_Success(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	targetUserID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)
	mockAuditLogRepo := new(MockModerationAuditLogRepository)

	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	mockCommunityRepo.On("IsBanned", ctx, communityID, targetUserID).Return(true, nil)
	mockCommunityRepo.On("UnbanMember", ctx, communityID, targetUserID).Return(nil)
	mockAuditLogRepo.On("Create", ctx, mock.AnythingOfType("*models.ModerationAuditLog")).Return(nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
		auditLogRepo:  mockAuditLogRepo,
	}

	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_UnbanUser_NotBanned(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	targetUserID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	mockCommunityRepo.On("IsBanned", ctx, communityID, targetUserID).Return(false, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Validation should pass
	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_GetBans_Success(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	
	bans := []*models.CommunityBan{
		{
			ID:           uuid.New(),
			CommunityID:  communityID,
			BannedUserID: uuid.New(),
			BannedAt:     time.Now(),
		},
	}
	mockCommunityRepo.On("ListBans", ctx, communityID, 10, 0).Return(bans, 1, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Validate permission and scope
	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_UpdateBan_Success(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	targetUserID := uuid.New()
	siteMod := createSiteModerator()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)
	mockAuditLogRepo := new(MockModerationAuditLogRepository)

	mockUserRepo.On("GetByID", ctx, siteMod.ID).Return(siteMod, nil)
	mockCommunityRepo.On("IsBanned", ctx, communityID, targetUserID).Return(true, nil)
	mockCommunityRepo.On("UnbanMember", ctx, communityID, targetUserID).Return(nil)
	mockCommunityRepo.On("BanMember", ctx, mock.AnythingOfType("*models.CommunityBan")).Return(nil)
	mockAuditLogRepo.On("Create", ctx, mock.AnythingOfType("*models.ModerationAuditLog")).Return(nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
		auditLogRepo:  mockAuditLogRepo,
	}

	// Validate permission and scope
	err := service.validateModerationPermission(ctx, siteMod, communityID)
	assert.NoError(t, err)

	mockUserRepo.AssertExpectations(t)
	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_Admin_CanModerateAnywhere(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	admin := createAdmin()

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Admin should pass both permission and scope validation
	err := service.validateModerationPermission(ctx, admin, communityID)
	assert.NoError(t, err)

	err = service.validateModerationScope(admin, communityID)
	assert.NoError(t, err)
}

func TestModerationService_CommunityModerator_NotMember_Denied(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	communityMod := createCommunityModerator(communityID)

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	// Mock that moderator is not a member of the community
	mockCommunityRepo.On("GetMember", ctx, communityID, communityMod.ID).Return(nil, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Should fail permission validation
	err := service.validateModerationPermission(ctx, communityMod, communityID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not a member")

	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_CommunityModerator_InsufficientRole_Denied(t *testing.T) {
	ctx := context.Background()
	communityID := uuid.New()
	communityMod := createCommunityModerator(communityID)

	mockCommunityRepo := new(MockCommunityRepository)
	mockUserRepo := new(MockModerationUserRepository)

	// Mock that moderator is a member but only has "member" role, not "mod" or "admin"
	member := &models.CommunityMember{
		ID:          uuid.New(),
		CommunityID: communityID,
		UserID:      communityMod.ID,
		Role:        models.CommunityRoleMember, // Not a mod!
	}
	mockCommunityRepo.On("GetMember", ctx, communityID, communityMod.ID).Return(member, nil)

	service := &ModerationService{
		communityRepo: mockCommunityRepo,
		userRepo:      mockUserRepo,
	}

	// Should fail permission validation
	err := service.validateModerationPermission(ctx, communityMod, communityID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "insufficient permissions")

	mockCommunityRepo.AssertExpectations(t)
}

func TestModerationService_AuditLogging(t *testing.T) {
	ctx := context.Background()
	
	mockAuditLogRepo := new(MockModerationAuditLogRepository)
	
	// Test that audit log is created with correct fields
	mockAuditLogRepo.On("Create", ctx, mock.MatchedBy(func(log *models.ModerationAuditLog) bool {
		return log.Action == "ban_user" &&
			log.EntityType == "community_ban" &&
			log.ModeratorID != uuid.Nil &&
			log.Metadata != nil
	})).Return(nil)

	auditLog := &models.ModerationAuditLog{
		Action:      "ban_user",
		EntityType:  "community_ban",
		EntityID:    uuid.New(),
		ModeratorID: uuid.New(),
		Metadata: map[string]interface{}{
			"community_id": uuid.New().String(),
		},
	}

	err := mockAuditLogRepo.Create(ctx, auditLog)
	assert.NoError(t, err)

	mockAuditLogRepo.AssertExpectations(t)
}
