import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ClipPage - Page Object for individual clip detail page
 * 
 * Handles interactions with:
 * - Video player
 * - Clip metadata
 * - Comments
 * - Like/favorite actions
 * - Share functionality
 * 
 * @example
 * ```typescript
 * const clipPage = new ClipPage(page);
 * await clipPage.goto('550e8400-e29b-41d4-a716-446655440000');
 * await clipPage.verifyClipLoaded();
 * await clipPage.likeClip();
 * ```
 */
export class ClipPage extends BasePage {
  // Locators
  private readonly videoPlayer: Locator;
  private readonly clipTitle: Locator;
  private readonly likeButton: Locator;
  private readonly favoriteButton: Locator;
  private readonly shareButton: Locator;
  private readonly commentSection: Locator;
  private readonly commentInput: Locator;
  private readonly submitCommentButton: Locator;

  constructor(page: Page, clipId?: string) {
    super(page, clipId ? `/clip/${clipId}` : '/clip');
    
    // Initialize locators
    this.videoPlayer = page.locator('video, [data-testid="video-player"]').first();
    this.clipTitle = page.locator('h1, [data-testid="clip-title"]').first();
    this.likeButton = page.locator('button').filter({ hasText: /like|upvote|vote/i }).first();
    this.favoriteButton = page.locator('button').filter({ hasText: /favorite|bookmark|save/i }).first();
    this.shareButton = page.locator('button').filter({ hasText: /share/i }).first();
    this.commentSection = page.locator('[data-testid="comments"], section').filter({ hasText: /comment/i });
    this.commentInput = page.locator('textarea, input').filter({ hasText: /comment/i }).first();
    this.submitCommentButton = page.locator('button[type="submit"]').filter({ hasText: /comment|post|submit/i }).first();
  }

  /**
   * Navigate to a specific clip by ID
   * @param clipId - UUID of the clip
   */
  async gotoClip(clipId: string): Promise<void> {
    await this.page.goto(`/clip/${clipId}`, { waitUntil: 'networkidle' });
  }

  /**
   * Wait for clip to load
   */
  async waitForClipToLoad(): Promise<void> {
    await Promise.all([
      this.clipTitle.waitFor({ state: 'visible', timeout: 10000 }),
      this.waitForPageLoad(),
    ]);
  }

  /**
   * Verify clip is loaded
   */
  async verifyClipLoaded(): Promise<void> {
    await this.verifyElementVisible(this.clipTitle);
    await this.verifyElementVisible(this.videoPlayer);
  }

  /**
   * Get clip title
   * @returns Clip title text
   */
  async getClipTitle(): Promise<string> {
    return await this.clipTitle.textContent() || '';
  }

  /**
   * Verify clip title
   * @param expectedTitle - Expected title (string or regex)
   */
  async verifyClipTitle(expectedTitle: string | RegExp): Promise<void> {
    await this.verifyElementText(this.clipTitle, expectedTitle);
  }

  /**
   * Play video
   */
  async playVideo(): Promise<void> {
    // Check if video is already playing
    const isPaused = await this.videoPlayer.evaluate((video: any) => video.paused);
    
    if (isPaused) {
      await this.videoPlayer.click(); // Click to play
    }
  }

  /**
   * Pause video
   */
  async pauseVideo(): Promise<void> {
    const isPaused = await this.videoPlayer.evaluate((video: any) => video.paused);
    
    if (!isPaused) {
      await this.videoPlayer.click(); // Click to pause
    }
  }

  /**
   * Like the clip
   */
  async likeClip(): Promise<void> {
    if (await this.likeButton.isVisible({ timeout: 2000 })) {
      await this.click(this.likeButton);
    }
  }

  /**
   * Favorite/bookmark the clip
   */
  async favoriteClip(): Promise<void> {
    if (await this.favoriteButton.isVisible({ timeout: 2000 })) {
      await this.click(this.favoriteButton);
    }
  }

  /**
   * Click share button
   */
  async clickShare(): Promise<void> {
    if (await this.shareButton.isVisible({ timeout: 2000 })) {
      await this.click(this.shareButton);
    }
  }

  /**
   * Post a comment
   * @param commentText - Comment text to post
   */
  async postComment(commentText: string): Promise<void> {
    await this.fillInput(this.commentInput, commentText);
    await this.click(this.submitCommentButton);
    await this.page.waitForTimeout(1000); // Wait for comment to post
  }

  /**
   * Get all comments
   * @returns Array of comment text content
   */
  async getComments(): Promise<string[]> {
    const commentElements = this.page.locator('[data-testid="comment"], .comment');
    const count = await commentElements.count();
    const comments: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const comment = await commentElements.nth(i).textContent();
      if (comment) comments.push(comment.trim());
    }
    
    return comments;
  }

  /**
   * Verify comment section is visible
   */
  async verifyCommentSectionVisible(): Promise<void> {
    await this.verifyElementVisible(this.commentSection);
  }

  /**
   * Check if like button is visible
   */
  async isLikeButtonVisible(): Promise<boolean> {
    try {
      return await this.likeButton.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if comment input is visible (user is logged in)
   */
  async isCommentInputVisible(): Promise<boolean> {
    try {
      return await this.commentInput.isVisible({ timeout: 2000 });
    } catch {
      return false;
    }
  }

  /**
   * Get video player locator
   */
  getVideoPlayer(): Locator {
    return this.videoPlayer;
  }

  /**
   * Get like button locator
   */
  getLikeButton(): Locator {
    return this.likeButton;
  }

  /**
   * Get favorite button locator
   */
  getFavoriteButton(): Locator {
    return this.favoriteButton;
  }
}
