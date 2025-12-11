/**
 * Clipper Clip Submission API - TypeScript SDK Example
 * 
 * This example demonstrates how to use the Clip Submission API with TypeScript/JavaScript.
 * It can be used in Node.js applications, browsers, or React applications.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

// ============================================================================
// Type Definitions
// ============================================================================

interface ClipMetadata {
  clip_id: string;
  title: string;
  streamer_name: string;
  game_name: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  url: string;
}

interface SubmitClipRequest {
  clip_url: string;
  custom_title?: string;
  broadcaster_name_override?: string;
  tags?: string[];
  is_nsfw?: boolean;
  submission_reason?: string;
}

interface ClipSubmission {
  id: string;
  user_id: string;
  twitch_clip_id: string;
  title: string;
  custom_title?: string;
  broadcaster_name: string;
  game_name: string;
  thumbnail_url?: string;
  view_count?: number;
  duration?: number;
  tags: string[];
  is_nsfw: boolean;
  submission_reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  approved_at?: string;
  rejected_at?: string;
  reviewer_id?: string;
  rejection_reason?: string;
  clip_id?: string;
}

interface SubmissionStats {
  total_submissions: number;
  approved_submissions: number;
  rejected_submissions: number;
  pending_submissions: number;
  approval_rate: number;
  total_karma_earned: number;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  field?: string;
}

// ============================================================================
// Clip Submission Client
// ============================================================================

export class ClipSubmissionClient {
  private client: AxiosInstance;

  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch clip metadata from Twitch
   * 
   * @param clipUrl - Twitch clip URL or clip ID
   * @returns Clip metadata
   * @throws Error if the clip is not found or Twitch API is unavailable
   */
  async fetchMetadata(clipUrl: string): Promise<ClipMetadata> {
    try {
      const response = await this.client.get<{ success: true; data: ClipMetadata }>('/submissions/metadata', {
        params: { url: clipUrl }
      });

      return response.data.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Submit a clip to the platform
   * 
   * @param request - Clip submission request
   * @returns Submission details including status and ID
   * @throws Error if validation fails or rate limit is exceeded
   */
  async submitClip(request: SubmitClipRequest): Promise<{
    message: string;
    submission: ClipSubmission;
  }> {
    try {
      const response = await this.client.post<{
        success: true;
        message: string;
        submission: ClipSubmission;
      }>('/submissions', request);

      return {
        message: response.data.message,
        submission: response.data.submission
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get user's submission history
   * 
   * @param page - Page number (starts at 1)
   * @param limit - Items per page (max 100)
   * @returns Paginated list of submissions
   */
  async getMySubmissions(page: number = 1, limit: number = 20): Promise<PaginatedResponse<ClipSubmission>> {
    try {
      const response = await this.client.get<PaginatedResponse<ClipSubmission>>('/submissions', {
        params: { page, limit }
      });

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Get submission statistics for the authenticated user
   * 
   * @returns Submission statistics
   */
  async getStats(): Promise<SubmissionStats> {
    try {
      const response = await this.client.get<{ success: true; data: SubmissionStats }>('/submissions/stats');

      return response.data.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Complete workflow: Validate and submit a clip
   * 
   * @param clipUrl - Twitch clip URL
   * @param options - Optional submission parameters
   * @returns Metadata and submission details
   */
  async submitClipWorkflow(clipUrl: string, options?: {
    customTitle?: string;
    tags?: string[];
    isNsfw?: boolean;
    reason?: string;
  }): Promise<{
    metadata: ClipMetadata;
    submission: ClipSubmission;
    message: string;
  }> {
    // Step 1: Validate and fetch metadata
    console.log('Fetching clip metadata...');
    const metadata = await this.fetchMetadata(clipUrl);
    console.log('✓ Clip found:', metadata.title);

    // Step 2: Submit the clip
    console.log('Submitting clip...');
    const { submission, message } = await this.submitClip({
      clip_url: clipUrl,
      custom_title: options?.customTitle,
      tags: options?.tags,
      is_nsfw: options?.isNsfw || false,
      submission_reason: options?.reason
    });

    if (submission.status === 'approved') {
      console.log('✓ Clip auto-approved! Clip ID:', submission.clip_id);
    } else {
      console.log('✓ Clip submitted for review. Submission ID:', submission.id);
    }

    return { metadata, submission, message };
  }

  /**
   * Handle API errors and throw user-friendly error messages
   */
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponse>;
      
      if (axiosError.response) {
        const { status, data } = axiosError.response;
        
        switch (status) {
          case 400:
            if (data.field === 'clip_url') {
              if (data.error.includes('duplicate')) {
                throw new Error('This clip has already been submitted');
              } else if (data.error.includes('not found')) {
                throw new Error('Clip not found on Twitch. It may have been deleted.');
              } else if (data.error.includes('format')) {
                throw new Error('Invalid clip URL format');
              }
            } else if (data.field === 'karma') {
              throw new Error('You need at least 100 karma to submit clips');
            }
            throw new Error(data.error || 'Validation error');
            
          case 401:
            throw new Error('Authentication required. Please log in.');
            
          case 429:
            throw new Error('Rate limit exceeded. You can submit up to 5 clips per hour.');
            
          case 502:
            throw new Error('Unable to connect to Twitch. Please try again later.');
            
          default:
            throw new Error(data.error || 'An unexpected error occurred');
        }
      }
    }
    
    throw new Error('Network error. Please check your connection.');
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function main() {
  // Configuration
  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
  const TOKEN = process.env.CLIPPER_TOKEN || '';

  if (!TOKEN) {
    console.error('Error: CLIPPER_TOKEN environment variable is required');
    console.error('Usage: CLIPPER_TOKEN=your_token node clip-submission-example.js');
    process.exit(1);
  }

  // Create client
  const client = new ClipSubmissionClient(API_BASE_URL, TOKEN);

  try {
    // Example 1: Submit a clip with the complete workflow
    console.log('=== Example 1: Complete Submission Workflow ===\n');
    
    const result = await client.submitClipWorkflow(
      'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
      {
        customTitle: 'Epic 1v5 Clutch',
        tags: ['clutch', 'epic', 'valorant'],
        reason: 'Amazing gameplay moment that deserves to be shared'
      }
    );

    console.log('\nResult:', {
      clip: result.metadata.title,
      status: result.submission.status,
      message: result.message
    });

    // Example 2: Get submission statistics
    console.log('\n=== Example 2: Get Submission Statistics ===\n');
    
    const stats = await client.getStats();
    console.log('Your Statistics:', {
      total: stats.total_submissions,
      approved: stats.approved_submissions,
      pending: stats.pending_submissions,
      approvalRate: `${stats.approval_rate.toFixed(1)}%`,
      karmaEarned: stats.total_karma_earned
    });

    // Example 3: List recent submissions
    console.log('\n=== Example 3: Recent Submissions ===\n');
    
    const submissions = await client.getMySubmissions(1, 5);
    console.log(`Found ${submissions.meta.total} total submissions`);
    console.log(`Showing page ${submissions.meta.page} of ${submissions.meta.total_pages}`);
    
    submissions.data.forEach((submission, index) => {
      console.log(`\n${index + 1}. ${submission.title}`);
      console.log(`   Status: ${submission.status}`);
      console.log(`   Submitted: ${new Date(submission.submitted_at).toLocaleDateString()}`);
      if (submission.rejection_reason) {
        console.log(`   Reason: ${submission.rejection_reason}`);
      }
    });

  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

// Export for use as a library
export default ClipSubmissionClient;
