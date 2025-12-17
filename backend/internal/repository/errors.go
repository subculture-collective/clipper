package repository

import "errors"

var (
	// ErrMaxPresetsReached is returned when a user tries to create more than 10 presets
	ErrMaxPresetsReached = errors.New("maximum of 10 presets allowed per user")
	// ErrPresetNotFound is returned when a preset is not found
	ErrPresetNotFound = errors.New("preset not found")
	// ErrUnauthorizedPresetAccess is returned when a user tries to access another user's preset
	ErrUnauthorizedPresetAccess = errors.New("unauthorized access to preset")
)
