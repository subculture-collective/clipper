package services

import (
	"context"
	"testing"

	"github.com/subculture-collective/clipper/internal/models"
)

func TestClipExtractionJobService_Initialization(t *testing.T) {
	service := NewClipExtractionJobService(nil)

	if service == nil {
		t.Error("Expected service to be created")
	}

	if service.redis != nil {
		t.Error("Expected redis to be nil in test setup")
	}
}

func TestClipExtractionJobService_EnqueueJob_NilRedis(t *testing.T) {
	service := NewClipExtractionJobService(nil)
	ctx := context.Background()

	job := &models.ClipExtractionJob{
		ClipID:    "test-clip-id",
		VODURL:    "https://vod.twitch.tv/test",
		StartTime: 10.0,
		EndTime:   20.0,
		Quality:   "720p",
	}

	err := service.EnqueueJob(ctx, job)

	if err == nil {
		t.Error("Expected error when redis client is nil")
	}

	expectedError := "redis client not available"
	if err.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, err.Error())
	}
}

func TestClipExtractionJobService_GetJobStatus_NilRedis(t *testing.T) {
	service := NewClipExtractionJobService(nil)
	ctx := context.Background()

	_, err := service.GetJobStatus(ctx, "test-clip-id")

	if err == nil {
		t.Error("Expected error when redis client is nil")
	}

	expectedError := "redis client not available"
	if err.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, err.Error())
	}
}

func TestClipExtractionJobService_GetPendingJobsCount_NilRedis(t *testing.T) {
	service := NewClipExtractionJobService(nil)
	ctx := context.Background()

	_, err := service.GetPendingJobsCount(ctx)

	if err == nil {
		t.Error("Expected error when redis client is nil")
	}

	expectedError := "redis client not available"
	if err.Error() != expectedError {
		t.Errorf("Expected error '%s', got '%s'", expectedError, err.Error())
	}
}
