import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SubmitClipPage - Page Object for Submit Clip Page
 * 
 * Provides methods for interacting with the clip submission form.
 * 
 * @example
 * ```typescript
 * const submitPage = new SubmitClipPage(page);
 * await submitPage.goto();
 * await submitPage.submitClip({
 *   url: 'https://clips.twitch.tv/TestClip123',
 *   title: 'Amazing Play',
 *   description: 'Epic moment from stream',
 *   tags: ['valorant', 'clutch']
 * });
 * ```
 */
export class SubmitClipPage extends BasePage {
  // Selectors
  private readonly clipUrlInput = () => this.page.locator('#clip_url');
  private readonly customTitleInput = () => this.page.locator('#custom_title');
  private readonly submissionReasonTextarea = () => this.page.locator('#submission_reason');
  private readonly nsfwCheckbox = () => this.page.locator('#is_nsfw');
  private readonly tagInput = () => this.page.getByPlaceholder('Search or add tags...');
  private readonly submitButton = () => this.page.getByRole('button', { name: /Submit Clip/i });
  private readonly submitAnotherButton = () => this.page.getByText('Submit Another Clip');
  private readonly mySubmissionsButton = () => this.page.getByRole('button', { name: 'My Submissions' });
  
  // Error/Success message selectors
  private readonly errorAlert = () => this.page.locator('[role="alert"]').filter({ hasText: /error|failed|exceeded|invalid|required/i });
  private readonly successMessage = () => this.page.getByText('Submission Successful!');
  private readonly warningAlert = () => this.page.locator('[role="alert"]').filter({ hasText: /warning|karma/i });

  constructor(page: Page) {
    super(page, '/submit');
  }

  /**
   * Submit a clip with all details
   */
  async submitClip(clipData: {
    url: string;
    title?: string;
    description?: string;
    tags?: string[];
    isNsfw?: boolean;
  }): Promise<void> {
    // Fill clip URL
    await this.clipUrlInput().fill(clipData.url);
    
    // Wait a bit for any async validation or metadata fetching
    await this.page.waitForTimeout(500);
    
    // Fill optional title
    if (clipData.title) {
      await this.customTitleInput().fill(clipData.title);
    }
    
    // Add tags if provided
    if (clipData.tags && clipData.tags.length > 0) {
      for (const tag of clipData.tags) {
        await this.addTag(tag);
      }
    }
    
    // Mark as NSFW if specified
    if (clipData.isNsfw) {
      await this.nsfwCheckbox().check();
    }
    
    // Fill submission reason/description
    if (clipData.description) {
      await this.submissionReasonTextarea().fill(clipData.description);
    }
    
    // Click submit
    await this.submitButton().click();
  }

  /**
   * Add a tag to the submission
   */
  async addTag(tagName: string): Promise<void> {
    await this.tagInput().fill(tagName);
    await this.tagInput().press('Enter');
    
    // Wait for tag to be added
    await this.page.waitForTimeout(200);
  }

  /**
   * Remove a tag from the submission
   */
  async removeTag(tagName: string): Promise<void> {
    const removeButton = this.page.getByLabel(`Remove ${tagName} tag`);
    await removeButton.click();
  }

  /**
   * Check if submit button is enabled
   */
  async isSubmitButtonEnabled(): Promise<boolean> {
    return await this.submitButton().isEnabled();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton().isDisabled();
  }

  /**
   * Verify that a rate limit error is shown
   */
  async expectRateLimitError(): Promise<void> {
    await expect(this.errorAlert()).toBeVisible();
    await expect(this.errorAlert()).toContainText(/rate limit exceeded|10 submissions per hour/i);
  }

  /**
   * Verify that a duplicate error is shown
   */
  async expectDuplicateError(): Promise<void> {
    await expect(this.errorAlert()).toBeVisible();
    await expect(this.errorAlert()).toContainText(/already been submitted|already exists/i);
  }

  /**
   * Verify that an invalid URL error is shown
   */
  async expectInvalidUrlError(): Promise<void> {
    await expect(this.errorAlert()).toBeVisible();
    await expect(this.errorAlert()).toContainText(/invalid|valid twitch clip url/i);
  }

  /**
   * Verify that a required field error is shown
   */
  async expectRequiredFieldError(): Promise<void> {
    await expect(this.errorAlert()).toBeVisible();
    await expect(this.errorAlert()).toContainText(/required/i);
  }

  /**
   * Verify submission was successful
   */
  async expectSubmissionSuccess(): Promise<void> {
    await expect(this.successMessage()).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify karma warning is shown
   */
  async expectKarmaWarning(karmaNeeded: number): Promise<void> {
    await expect(this.warningAlert()).toBeVisible();
    await expect(this.warningAlert()).toContainText(new RegExp(`${karmaNeeded}.*karma`, 'i'));
  }

  /**
   * Click "Submit Another Clip" button
   */
  async submitAnotherClip(): Promise<void> {
    await this.submitAnotherButton().click();
  }

  /**
   * Navigate to My Submissions page
   */
  async goToMySubmissions(): Promise<void> {
    await this.mySubmissionsButton().click();
  }

  /**
   * Check if user is on the login prompt (not authenticated)
   */
  async isLoginPromptVisible(): Promise<boolean> {
    const loginButton = this.page.getByText('Log In');
    return await loginButton.isVisible({ timeout: 2000 }).catch(() => false);
  }

  /**
   * Verify that recent submissions section is visible
   */
  async expectRecentSubmissionsVisible(): Promise<void> {
    const recentSubmissionsHeading = this.page.getByText('Your Recent Submissions');
    await expect(recentSubmissionsHeading).toBeVisible();
  }

  /**
   * Get count of recent submissions shown
   */
  async getRecentSubmissionsCount(): Promise<number> {
    const recentSubmissionsSection = this.page.getByText('Your Recent Submissions').locator('..');
    const submissionItems = recentSubmissionsSection.locator('div[class*="bg-background-secondary"]');
    return await submissionItems.count();
  }

  /**
   * Verify submission status in recent submissions
   */
  async expectSubmissionStatus(submissionTitle: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    const submissionItem = this.page.getByText(submissionTitle).locator('..');
    const statusBadge = submissionItem.getByText(status, { exact: false });
    await expect(statusBadge).toBeVisible();
  }
}
