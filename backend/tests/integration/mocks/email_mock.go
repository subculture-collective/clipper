//go:build integration

package mocks

import (
	"fmt"
	"sync"
	"time"
)

// EmailServiceInterface defines the interface for email operations
type EmailServiceInterface interface {
	SendEmail(to []string, subject string, htmlContent string, textContent string) error
	SendTemplateEmail(to []string, templateID string, data map[string]interface{}) error
}

// MockEmailService implements EmailServiceInterface for testing
type MockEmailService struct {
	mu sync.RWMutex

	// Email storage for verification
	SentEmails []MockEmail

	// Call tracking
	SendEmailCalls         int
	SendTemplateEmailCalls int

	// Error injection
	SendEmailError         error
	SendTemplateEmailError error

	// Latency simulation
	SimulateLatency time.Duration

	// Failure simulation
	FailOnRecipient string // Fail when sending to this recipient
}

// MockEmail represents an email that was "sent" by the mock service
type MockEmail struct {
	To          []string
	Subject     string
	HTMLContent string
	TextContent string
	TemplateID  string
	TemplateData map[string]interface{}
	SentAt      time.Time
}

// NewMockEmailService creates a new mock email service
func NewMockEmailService() *MockEmailService {
	return &MockEmailService{
		SentEmails: make([]MockEmail, 0),
	}
}

// SendEmail simulates sending an email
func (m *MockEmailService) SendEmail(to []string, subject string, htmlContent string, textContent string) error {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.SendEmailCalls++

	// Check for recipient-specific failure
	if m.FailOnRecipient != "" {
		for _, recipient := range to {
			if recipient == m.FailOnRecipient {
				return fmt.Errorf("failed to send email to %s", recipient)
			}
		}
	}

	if m.SendEmailError != nil {
		return m.SendEmailError
	}

	// Store the email
	m.SentEmails = append(m.SentEmails, MockEmail{
		To:          to,
		Subject:     subject,
		HTMLContent: htmlContent,
		TextContent: textContent,
		SentAt:      time.Now(),
	})

	return nil
}

// SendTemplateEmail simulates sending a template-based email
func (m *MockEmailService) SendTemplateEmail(to []string, templateID string, data map[string]interface{}) error {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.SendTemplateEmailCalls++

	// Check for recipient-specific failure
	if m.FailOnRecipient != "" {
		for _, recipient := range to {
			if recipient == m.FailOnRecipient {
				return fmt.Errorf("failed to send template email to %s", recipient)
			}
		}
	}

	if m.SendTemplateEmailError != nil {
		return m.SendTemplateEmailError
	}

	// Store the template email
	m.SentEmails = append(m.SentEmails, MockEmail{
		To:           to,
		TemplateID:   templateID,
		TemplateData: data,
		SentAt:       time.Now(),
	})

	return nil
}

// GetSentEmails returns all sent emails (thread-safe)
func (m *MockEmailService) GetSentEmails() []MockEmail {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy to avoid race conditions
	emails := make([]MockEmail, len(m.SentEmails))
	copy(emails, m.SentEmails)
	return emails
}

// GetEmailsSentTo returns emails sent to a specific recipient
func (m *MockEmailService) GetEmailsSentTo(recipient string) []MockEmail {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var filtered []MockEmail
	for _, email := range m.SentEmails {
		for _, to := range email.To {
			if to == recipient {
				filtered = append(filtered, email)
				break
			}
		}
	}
	return filtered
}

// GetEmailsWithSubject returns emails with a specific subject
func (m *MockEmailService) GetEmailsWithSubject(subject string) []MockEmail {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var filtered []MockEmail
	for _, email := range m.SentEmails {
		if email.Subject == subject {
			filtered = append(filtered, email)
		}
	}
	return filtered
}

// GetEmailsWithTemplate returns emails using a specific template
func (m *MockEmailService) GetEmailsWithTemplate(templateID string) []MockEmail {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var filtered []MockEmail
	for _, email := range m.SentEmails {
		if email.TemplateID == templateID {
			filtered = append(filtered, email)
		}
	}
	return filtered
}

// Reset clears all sent emails and call counts
func (m *MockEmailService) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.SentEmails = make([]MockEmail, 0)
	m.SendEmailCalls = 0
	m.SendTemplateEmailCalls = 0
	m.SendEmailError = nil
	m.SendTemplateEmailError = nil
	m.FailOnRecipient = ""
}

// GetCallCount returns the total number of send calls
func (m *MockEmailService) GetCallCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.SendEmailCalls + m.SendTemplateEmailCalls
}
