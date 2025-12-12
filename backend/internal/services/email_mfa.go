package services

import (
	"context"
	"fmt"
)

// SendMFAEnabledEmail sends a notification when MFA is enabled
func (s *EmailService) SendMFAEnabledEmail(ctx context.Context, toEmail, username string) error {
	if !s.enabled {
		return nil
	}

	data := map[string]interface{}{
		"username": username,
		"base_url": s.baseURL,
	}

	subject, htmlBody, textBody, err := s.prepareEmailContent("mfa_enabled", data, "")
	if err != nil {
		return fmt.Errorf("failed to prepare MFA enabled email: %w", err)
	}

	_, err = s.sendViaSendGrid(toEmail, subject, htmlBody, textBody)
	return err
}

// SendMFADisabledEmail sends a notification when MFA is disabled
func (s *EmailService) SendMFADisabledEmail(ctx context.Context, toEmail, username string) error {
	if !s.enabled {
		return nil
	}

	data := map[string]interface{}{
		"username": username,
		"base_url": s.baseURL,
	}

	subject, htmlBody, textBody, err := s.prepareEmailContent("mfa_disabled", data, "")
	if err != nil {
		return fmt.Errorf("failed to prepare MFA disabled email: %w", err)
	}

	_, err = s.sendViaSendGrid(toEmail, subject, htmlBody, textBody)
	return err
}

// SendMFABackupCodesRegeneratedEmail sends a notification when backup codes are regenerated
func (s *EmailService) SendMFABackupCodesRegeneratedEmail(ctx context.Context, toEmail, username string) error {
	if !s.enabled {
		return nil
	}

	data := map[string]interface{}{
		"username": username,
		"base_url": s.baseURL,
	}

	subject, htmlBody, textBody, err := s.prepareEmailContent("mfa_backup_codes_regenerated", data, "")
	if err != nil {
		return fmt.Errorf("failed to prepare MFA backup codes regenerated email: %w", err)
	}

	_, err = s.sendViaSendGrid(toEmail, subject, htmlBody, textBody)
	return err
}

// prepareMFAEnabledEmail prepares the MFA enabled email content
func (s *EmailService) prepareMFAEnabledEmail(data map[string]interface{}) (htmlContent, textContent string) {
	username := data["username"].(string)
	baseURL := data["base_url"].(string)

	htmlContent = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MFA Enabled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10b981;">Multi-Factor Authentication Enabled</h1>
        
        <p>Hi %s,</p>
        
        <p>Multi-factor authentication has been successfully enabled on your account. Your account is now more secure!</p>
        
        <p><strong>What this means:</strong></p>
        <ul>
            <li>You'll need to enter a 6-digit code from your authenticator app when logging in</li>
            <li>You can use backup codes if you don't have access to your authenticator app</li>
            <li>You can optionally trust devices to skip MFA for 30 days</li>
        </ul>
        
        <p><strong>Important:</strong> Make sure you've saved your backup codes in a safe place. You'll need them if you lose access to your authenticator app.</p>
        
        <div style="margin: 30px 0;">
            <p><strong>Didn't enable MFA?</strong></p>
            <p>If you didn't enable MFA on your account, please <a href="%s/settings/security" style="color: #3b82f6;">secure your account immediately</a> and contact support.</p>
        </div>
        
        <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px;">
            <a href="%s/settings/security">Manage Security Settings</a>
        </p>
    </div>
</body>
</html>`, username, baseURL, baseURL)

	textContent = fmt.Sprintf(`Multi-Factor Authentication Enabled

Hi %s,

Multi-factor authentication has been successfully enabled on your account. Your account is now more secure!

What this means:
- You'll need to enter a 6-digit code from your authenticator app when logging in
- You can use backup codes if you don't have access to your authenticator app
- You can optionally trust devices to skip MFA for 30 days

Important: Make sure you've saved your backup codes in a safe place. You'll need them if you lose access to your authenticator app.

Didn't enable MFA?
If you didn't enable MFA on your account, please secure your account immediately and contact support:
%s/settings/security

---
Manage Security Settings: %s/settings/security`, username, baseURL, baseURL)

	return htmlContent, textContent
}

// prepareMFADisabledEmail prepares the MFA disabled email content
func (s *EmailService) prepareMFADisabledEmail(data map[string]interface{}) (htmlContent, textContent string) {
	username := data["username"].(string)
	baseURL := data["base_url"].(string)

	htmlContent = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MFA Disabled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444;">Multi-Factor Authentication Disabled</h1>
        
        <p>Hi %s,</p>
        
        <p>Multi-factor authentication has been disabled on your account.</p>
        
        <p><strong>Important:</strong> Your account is now less secure. We strongly recommend keeping MFA enabled to protect your account from unauthorized access.</p>
        
        <div style="margin: 30px 0; padding: 15px; background-color: #fef2f2; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>Didn't disable MFA?</strong></p>
            <p style="margin: 10px 0 0 0;">If you didn't disable MFA on your account, your account may be compromised. Please <a href="%s/settings/security" style="color: #3b82f6;">re-enable MFA immediately</a> and contact support.</p>
        </div>
        
        <p>You can re-enable MFA at any time from your security settings.</p>
        
        <div style="margin: 30px 0;">
            <a href="%s/settings/security" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 4px;">Enable MFA</a>
        </div>
        
        <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px;">
            <a href="%s/settings/security">Manage Security Settings</a>
        </p>
    </div>
</body>
</html>`, username, baseURL, baseURL, baseURL)

	textContent = fmt.Sprintf(`Multi-Factor Authentication Disabled

Hi %s,

Multi-factor authentication has been disabled on your account.

Important: Your account is now less secure. We strongly recommend keeping MFA enabled to protect your account from unauthorized access.

Didn't disable MFA?
If you didn't disable MFA on your account, your account may be compromised. Please re-enable MFA immediately and contact support:
%s/settings/security

You can re-enable MFA at any time from your security settings.

---
Enable MFA: %s/settings/security
Manage Security Settings: %s/settings/security`, username, baseURL, baseURL, baseURL)

	return htmlContent, textContent
}

// prepareMFABackupCodesRegeneratedEmail prepares the backup codes regenerated email content
func (s *EmailService) prepareMFABackupCodesRegeneratedEmail(data map[string]interface{}) (htmlContent, textContent string) {
	username := data["username"].(string)
	baseURL := data["base_url"].(string)

	htmlContent = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>MFA Backup Codes Regenerated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3b82f6;">MFA Backup Codes Regenerated</h1>
        
        <p>Hi %s,</p>
        
        <p>Your multi-factor authentication backup codes have been regenerated.</p>
        
        <p><strong>Important:</strong> Your old backup codes are no longer valid. Make sure you've saved your new backup codes in a safe place.</p>
        
        <div style="margin: 30px 0; padding: 15px; background-color: #eff6ff; border-left: 4px solid #3b82f6;">
            <p style="margin: 0;"><strong>Didn't regenerate backup codes?</strong></p>
            <p style="margin: 10px 0 0 0;">If you didn't request this change, please <a href="%s/settings/security" style="color: #3b82f6;">review your security settings</a> and contact support immediately.</p>
        </div>
        
        <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="color: #6b7280; font-size: 14px;">
            <a href="%s/settings/security">Manage Security Settings</a>
        </p>
    </div>
</body>
</html>`, username, baseURL, baseURL)

	textContent = fmt.Sprintf(`MFA Backup Codes Regenerated

Hi %s,

Your multi-factor authentication backup codes have been regenerated.

Important: Your old backup codes are no longer valid. Make sure you've saved your new backup codes in a safe place.

Didn't regenerate backup codes?
If you didn't request this change, please review your security settings and contact support immediately:
%s/settings/security

---
Manage Security Settings: %s/settings/security`, username, baseURL, baseURL)

	return htmlContent, textContent
}
