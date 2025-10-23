package services

// stringPtr is a helper to create string pointers
func stringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
