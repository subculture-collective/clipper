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
    // Try to find button within submission card
    return this.page.locator(`[data-testid="submission-${submissionId}"], [data-submission-id="${submissionId}"]`)
      .getByRole('button', { name: /approve/i }).or(this.page.getByRole('button', { name: /approve/i }).first());
  }

  /**
   * Get reject button for a submission
   */
  private getRejectButton(submissionId: string): Locator {
    return this.page.locator(`[data-testid="submission-${submissionId}"], [data-submission-id="${submissionId}"]`)
      .getByRole('button', { name: /reject/i }).or(this.page.getByRole('button', { name: /reject/i }).first());
  }

  /**
   * Get status badge for a submission
   */
  private getStatusBadge(submissionId: string): Locator {
    return this.page.locator(`[data-testid="submission-${submissionId}"], [data-submission-id="${submissionId}"]`)
      .locator('[data-testid="status-badge"], .status-badge, [class*="badge"]');
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
      // Wait for any transition or modal to appear
      await this.page.waitForLoadState('networkidle');
    }

    // Click approve button
    const approveBtn = this.getApproveButton(submissionId);
    await approveBtn.click();

    // Wait for the approval action to complete by watching for network activity
    await this.page.waitForLoadState('networkidle');
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
      // Wait for any transition or modal to appear
      await this.page.waitForLoadState('networkidle');
    }

    // Click reject button
    const rejectBtn = this.getRejectButton(submissionId);
    await rejectBtn.click();

    // Wait for rejection modal/form to appear
    const reasonTextarea = this.page.getByLabel(/rejection reason/i);
    await reasonTextarea.waitFor({ state: 'visible', timeout: 5000 });

    // Fill rejection reason in modal
    await reasonTextarea.fill(reason);

    // Confirm rejection
    const confirmRejectBtn = this.page.getByRole('button', { name: /confirm|reject/i }).last();
    await confirmRejectBtn.click();

    // Wait for the rejection action to complete
    await this.page.waitForLoadState('networkidle');
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
    const countByTestId = await submissions.count();
    if (countByTestId > 0) return countByTestId;

    // Fallback: moderation cards rendered without test IDs
    const cards = this.page.locator('div.bg-background-secondary');
    return await cards.count();
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
  }

  /**
   * Select multiple submissions by their IDs
   */
  async selectSubmissions(submissionIds: string[]): Promise<void> {
    for (const submissionId of submissionIds) {
      const checkbox = this.page.locator(`[data-testid="submission-${submissionId}"]`)
        .locator('input[type="checkbox"]')
        .or(this.page.locator(`input[type="checkbox"][value="${submissionId}"]`));
      
      await checkbox.check();
    }
  }

  /**
   * Bulk approve selected submissions
   */
  async bulkApproveSubmissions(submissionIds: string[]): Promise<void> {
    // For tests, we can directly make the API call since the UI doesn't expose bulk actions yet
    await this.page.request.post('/api/admin/submissions/bulk-approve', {
      data: {
        submission_ids: submissionIds,
      },
    });
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Bulk reject selected submissions with a reason
   */
  async bulkRejectSubmissions(submissionIds: string[], reason: string): Promise<void> {
    // For tests, we can directly make the API call since the UI doesn't expose bulk actions yet
    await this.page.request.post('/api/admin/submissions/bulk-reject', {
      data: {
        submission_ids: submissionIds,
        reason,
      },
    });
    
    await this.page.waitForLoadState('networkidle');
  }
}
