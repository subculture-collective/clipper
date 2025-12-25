import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AdminModerationPage - Page Object for Admin Moderation Queue
 * 
 * Provides methods for admin/moderator actions on pending submissions.
 * 
 * @example
 * ```typescript
 * const moderationPage = new AdminModerationPage(page);
 * await moderationPage.goto();
 * await moderationPage.approveSubmission('submission-123');
 * await moderationPage.expectSubmissionApproved('submission-123');
 * ```
 */
export class AdminModerationPage extends BasePage {
  constructor(page: Page) {
    super(page, '/admin/moderation');
  }

  /**
   * Get submission card by submission ID
   */
  private getSubmissionCard(submissionId: string): Locator {
    return this.page.locator(`[data-testid="submission-${submissionId}"]`);
  }

  /**
   * Get approve button for a submission
   */
  private getApproveButton(submissionId: string): Locator {
    // First try with data-testid
    const cardWithTestId = this.page.locator(`[data-testid="submission-${submissionId}"]`);
    if (cardWithTestId) {
      return cardWithTestId.getByRole('button', { name: /approve/i });
    }
    
    // Fallback: find by submission ID in the card and then the button
    return this.page.locator(`[data-submission-id="${submissionId}"]`)
      .getByRole('button', { name: /approve/i });
  }

  /**
   * Get reject button for a submission
   */
  private getRejectButton(submissionId: string): Locator {
    const cardWithTestId = this.page.locator(`[data-testid="submission-${submissionId}"]`);
    if (cardWithTestId) {
      return cardWithTestId.getByRole('button', { name: /reject/i });
    }
    
    return this.page.locator(`[data-submission-id="${submissionId}"]`)
      .getByRole('button', { name: /reject/i });
  }

  /**
   * Get status badge for a submission
   */
  private getStatusBadge(submissionId: string): Locator {
    const cardWithTestId = this.page.locator(`[data-testid="submission-${submissionId}"]`);
    if (cardWithTestId) {
      return cardWithTestId.locator('[data-testid="status-badge"]');
    }
    
    return this.page.locator(`[data-submission-id="${submissionId}"]`)
      .locator('.status-badge, [class*="badge"]');
  }

  /**
   * Approve a submission
   */
  async approveSubmission(submissionId: string): Promise<void> {
    // Click on the submission card first (might open details)
    const submissionCard = this.getSubmissionCard(submissionId);
    const cardExists = await submissionCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (cardExists) {
      await submissionCard.click();
      await this.page.waitForTimeout(500);
    }
    
    // Click approve button
    const approveBtn = this.getApproveButton(submissionId);
    await approveBtn.click();
    
    // Wait for action to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Reject a submission with a reason
   */
  async rejectSubmission(submissionId: string, reason: string): Promise<void> {
    // Click on the submission card first
    const submissionCard = this.getSubmissionCard(submissionId);
    const cardExists = await submissionCard.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (cardExists) {
      await submissionCard.click();
      await this.page.waitForTimeout(500);
    }
    
    // Click reject button
    const rejectBtn = this.getRejectButton(submissionId);
    await rejectBtn.click();
    
    // Fill rejection reason in modal
    const reasonTextarea = this.page.getByLabel(/rejection reason/i);
    await reasonTextarea.fill(reason);
    
    // Confirm rejection
    const confirmRejectBtn = this.page.getByRole('button', { name: /confirm|reject/i }).last();
    await confirmRejectBtn.click();
    
    // Wait for action to complete
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if a submission is visible in the queue
   */
  async isSubmissionVisible(submissionId: string): Promise<boolean> {
    const submissionCard = this.getSubmissionCard(submissionId);
    return await submissionCard.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Verify submission has been approved
   */
  async expectSubmissionApproved(submissionId: string): Promise<void> {
    const statusBadge = this.getStatusBadge(submissionId);
    await expect(statusBadge).toContainText(/approved/i, { timeout: 5000 });
  }

  /**
   * Verify submission has been rejected
   */
  async expectSubmissionRejected(submissionId: string): Promise<void> {
    const statusBadge = this.getStatusBadge(submissionId);
    await expect(statusBadge).toContainText(/rejected/i, { timeout: 5000 });
  }

  /**
   * Verify submission is pending
   */
  async expectSubmissionPending(submissionId: string): Promise<void> {
    const statusBadge = this.getStatusBadge(submissionId);
    await expect(statusBadge).toContainText(/pending/i, { timeout: 5000 });
  }

  /**
   * Get total count of pending submissions
   */
  async getPendingSubmissionsCount(): Promise<number> {
    const submissions = this.page.locator('[data-testid^="submission-"]');
    return await submissions.count();
  }

  /**
   * Verify success message appears after action
   */
  async expectSuccessMessage(message?: string): Promise<void> {
    const successAlert = this.page.locator('[role="alert"]').filter({ hasText: /success/i });
    await expect(successAlert).toBeVisible({ timeout: 5000 });
    
    if (message) {
      await expect(successAlert).toContainText(message);
    }
  }

  /**
   * Verify error message appears
   */
  async expectErrorMessage(message?: string): Promise<void> {
    const errorAlert = this.page.locator('[role="alert"]').filter({ hasText: /error|failed/i });
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
    
    if (message) {
      await expect(errorAlert).toContainText(message);
    }
  }

  /**
   * Wait for moderation queue to load
   */
  async waitForQueueLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }
}
