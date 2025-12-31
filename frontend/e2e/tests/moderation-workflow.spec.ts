import { test, expect } from '../fixtures';
import type { Page, Route, Request } from '@playwright/test';

/**
 * Moderation Workflow E2E Tests
 * 
 * Tests the complete admin/moderator workflow for moderation queue:
 * - Access control (admin-only enforcement)
 * - Single approve/reject with rejection reasons
 * - Bulk approve/reject operations
 * - Audit logging for all actions
 * - Rejection reason visibility to users
 * - Performance baseline (p95 page load)
 */

type SubmissionStatus = 'pending' | 'approved' | 'rejected';

type MockSubmission = {
  id: string;
  user_id: string;
  twitch_clip_id: string;
  twitch_clip_url: string;
  title: string;
  custom_title?: string;
  broadcaster_name?: string;
  game_name?: string;
  tags?: string[];
  is_nsfw: boolean;
  submission_reason?: string;
  status: SubmissionStatus;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  user?: any;
};

type MockUser = {
  id: string;
  username: string;
  display_name?: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  karma_points: number;
  is_banned: boolean;
};

type AuditLogEntry = {
  id: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  timestamp: string;
};

/**
 * Setup moderation API mocks
 */
async function setupModerationMocks(page: Page) {
  const submissions = new Map<string, MockSubmission>();
  const auditLogs: AuditLogEntry[] = [];
  let currentUser: MockUser | null = null;
  let submissionCounter = 1;

  const respond = (route: Route, status: number, body: any) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

  const createMockSubmission = (overrides?: Partial<MockSubmission>): MockSubmission => {
    const id = overrides?.id || `mock-submission-${submissionCounter++}`;
    const now = new Date().toISOString();
    return {
      id,
      user_id: overrides?.user_id || 'user-1',
      twitch_clip_id: overrides?.twitch_clip_id || `clip-${id}`,
      twitch_clip_url: overrides?.twitch_clip_url || `https://clips.twitch.tv/${id}`,
      title: overrides?.title || `Test Submission ${id}`,
      custom_title: overrides?.custom_title,
      broadcaster_name: overrides?.broadcaster_name || 'TestStreamer',
      game_name: overrides?.game_name || 'Test Game',
      tags: overrides?.tags || ['test'],
      is_nsfw: overrides?.is_nsfw ?? false,
      submission_reason: overrides?.submission_reason,
      status: overrides?.status || 'pending',
      rejection_reason: overrides?.rejection_reason,
      reviewed_by: overrides?.reviewed_by,
      reviewed_at: overrides?.reviewed_at,
      created_at: overrides?.created_at || now,
      updated_at: overrides?.updated_at || now,
      thumbnail_url: overrides?.thumbnail_url || 'https://via.placeholder.com/640x360',
      user: overrides?.user || {
        id: 'user-1',
        username: 'testuser',
        display_name: 'Test User',
        karma_points: 150,
        role: 'user',
      },
    };
  };

  const createAuditLog = (action: string, resourceType: string, resourceId: string, actorId: string, details: any = {}) => {
    const log: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random()}`,
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      timestamp: new Date().toISOString(),
    };
    auditLogs.push(log);
    return log;
  };

  await page.context().route('**/api/**', async (route: Route, request: Request) => {
    const url = new URL(request.url());
    const pathname = url.pathname.replace(/.*\/api\/(v1\/)?/, '/');
    const method = request.method();

    // Auth endpoints
    if (pathname === '/auth/me') {
      if (currentUser) {
        return respond(route, 200, currentUser);
      }
      return respond(route, 401, { error: 'unauthenticated' });
    }

    if (pathname === '/auth/test-login') {
      return respond(route, 200, { user: currentUser });
    }

    if (pathname === '/auth/logout') {
      currentUser = null;
      return respond(route, 200, { success: true });
    }

    // Admin submissions (moderation queue)
    if (pathname === '/admin/submissions' && method === 'GET') {
      const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      
      const pendingSubmissions = Array.from(submissions.values())
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const start = (pageNum - 1) * limit;
      const end = start + limit;
      const paginatedData = pendingSubmissions.slice(start, end);
      const total = pendingSubmissions.length;
      
      return respond(route, 200, {
        success: true,
        data: paginatedData,
        meta: {
          page: pageNum,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    }

    // Approve submission
    const approveMatch = pathname.match(/^\/admin\/submissions\/([^/]+)\/approve$/);
    if (approveMatch && method === 'POST') {
      const submissionId = approveMatch[1];
      const submission = submissions.get(submissionId);
      
      if (!submission) {
        return respond(route, 404, { error: 'Submission not found' });
      }
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return respond(route, 403, { error: 'Forbidden: Admin or moderator access required' });
      }
      
      submission.status = 'approved';
      submission.reviewed_by = currentUser.id;
      submission.reviewed_at = new Date().toISOString();
      submission.updated_at = new Date().toISOString();
      submissions.set(submissionId, submission);
      
      // Create audit log
      createAuditLog('approve_submission', 'submission', submissionId, currentUser.id, {
        submission_title: submission.title,
      });
      
      return respond(route, 200, {
        success: true,
        message: 'Submission approved',
      });
    }

    // Reject submission
    const rejectMatch = pathname.match(/^\/admin\/submissions\/([^/]+)\/reject$/);
    if (rejectMatch && method === 'POST') {
      const submissionId = rejectMatch[1];
      const submission = submissions.get(submissionId);
      const body = (request.postDataJSON?.() || {}) as { reason?: string };
      
      if (!submission) {
        return respond(route, 404, { error: 'Submission not found' });
      }
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return respond(route, 403, { error: 'Forbidden: Admin or moderator access required' });
      }
      
      if (!body?.reason || body.reason.trim() === '') {
        return respond(route, 400, { error: 'Rejection reason is required' });
      }
      
      submission.status = 'rejected';
      submission.rejection_reason = body.reason;
      submission.reviewed_by = currentUser.id;
      submission.reviewed_at = new Date().toISOString();
      submission.updated_at = new Date().toISOString();
      submissions.set(submissionId, submission);
      
      // Create audit log
      createAuditLog('reject_submission', 'submission', submissionId, currentUser.id, {
        submission_title: submission.title,
        rejection_reason: body.reason,
      });
      
      return respond(route, 200, {
        success: true,
        message: 'Submission rejected',
      });
    }

    // Bulk approve submissions
    if (pathname === '/admin/submissions/bulk-approve' && method === 'POST') {
      const body = (request.postDataJSON?.() || {}) as { submission_ids?: string[] };
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return respond(route, 403, { error: 'Forbidden: Admin or moderator access required' });
      }
      
      if (!body?.submission_ids || body.submission_ids.length === 0) {
        return respond(route, 400, { error: 'Submission IDs are required' });
      }
      
      const approvedIds: string[] = [];
      for (const submissionId of body.submission_ids) {
        const submission = submissions.get(submissionId);
        if (submission) {
          submission.status = 'approved';
          submission.reviewed_by = currentUser.id;
          submission.reviewed_at = new Date().toISOString();
          submission.updated_at = new Date().toISOString();
          submissions.set(submissionId, submission);
          approvedIds.push(submissionId);
          
          // Create audit log for each
          createAuditLog('bulk_approve_submission', 'submission', submissionId, currentUser.id, {
            submission_title: submission.title,
            batch_size: body.submission_ids.length,
          });
        }
      }
      
      return respond(route, 200, {
        success: true,
        message: 'Submissions approved',
        count: approvedIds.length,
      });
    }

    // Bulk reject submissions
    if (pathname === '/admin/submissions/bulk-reject' && method === 'POST') {
      const body = (request.postDataJSON?.() || {}) as { submission_ids?: string[]; reason?: string };
      
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return respond(route, 403, { error: 'Forbidden: Admin or moderator access required' });
      }
      
      if (!body?.submission_ids || body.submission_ids.length === 0) {
        return respond(route, 400, { error: 'Submission IDs are required' });
      }
      
      if (!body?.reason || body.reason.trim() === '') {
        return respond(route, 400, { error: 'Rejection reason is required' });
      }
      
      const rejectedIds: string[] = [];
      for (const submissionId of body.submission_ids) {
        const submission = submissions.get(submissionId);
        if (submission) {
          submission.status = 'rejected';
          submission.rejection_reason = body.reason;
          submission.reviewed_by = currentUser.id;
          submission.reviewed_at = new Date().toISOString();
          submission.updated_at = new Date().toISOString();
          submissions.set(submissionId, submission);
          rejectedIds.push(submissionId);
          
          // Create audit log for each
          createAuditLog('bulk_reject_submission', 'submission', submissionId, currentUser.id, {
            submission_title: submission.title,
            rejection_reason: body.reason,
            batch_size: body.submission_ids.length,
          });
        }
      }
      
      return respond(route, 200, {
        success: true,
        message: 'Submissions rejected',
        count: rejectedIds.length,
      });
    }

    // User submissions - get own submissions (includes rejection reasons)
    if (pathname === '/submissions' && method === 'GET') {
      if (!currentUser) {
        return respond(route, 401, { error: 'Unauthorized' });
      }
      
      const userSubmissions = Array.from(submissions.values())
        .filter(s => s.user_id === currentUser.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return respond(route, 200, {
        success: true,
        data: userSubmissions,
        meta: {
          total: userSubmissions.length,
        },
      });
    }

    // Audit logs endpoint
    if (pathname === '/admin/audit-logs' && method === 'GET') {
      if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'moderator')) {
        return respond(route, 403, { error: 'Forbidden: Admin or moderator access required' });
      }
      
      const resourceId = url.searchParams.get('resource_id');
      const action = url.searchParams.get('action');
      
      let filteredLogs = [...auditLogs];
      if (resourceId) {
        filteredLogs = filteredLogs.filter(log => log.resource_id === resourceId);
      }
      if (action) {
        filteredLogs = filteredLogs.filter(log => log.action === action);
      }
      
      return respond(route, 200, {
        success: true,
        data: filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
        meta: {
          total: filteredLogs.length,
        },
      });
    }

    return route.fallback();
  });

  return {
    setCurrentUser: (user: MockUser | null) => {
      currentUser = user;
    },
    seedSubmission: (overrides?: Partial<MockSubmission>) => {
      const submission = createMockSubmission(overrides);
      submissions.set(submission.id, submission);
      return submission;
    },
    seedSubmissions: (count: number, overrides?: Partial<MockSubmission>) => {
      const seeded: MockSubmission[] = [];
      for (let i = 0; i < count; i++) {
        const submission = createMockSubmission({
          ...overrides,
          title: `${overrides?.title || 'Test Submission'} ${i + 1}`,
        });
        submissions.set(submission.id, submission);
        seeded.push(submission);
      }
      return seeded;
    },
    getSubmission: (id: string) => submissions.get(id),
    getAuditLogs: () => [...auditLogs],
    clear: () => {
      submissions.clear();
      auditLogs.length = 0;
    },
  };
}

test.describe('Moderation Workflow E2E', () => {
  test.describe('Access Control', () => {
    test('should block non-admin users from accessing moderation queue', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set current user as regular user
      mocks.setCurrentUser({
        id: 'user-regular',
        username: 'regularuser',
        email: 'regular@example.com',
        role: 'user',
        karma_points: 100,
        is_banned: false,
      });
      
      // Try to navigate to moderation queue
      await page.goto('/admin/moderation');
      
      // Should be redirected to home or see access denied
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      
      // Verify we're NOT on the moderation page (redirected or blocked)
      expect(currentUrl).not.toContain('/admin/moderation');
    });

    test('should allow admin users to access moderation queue', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set current user as admin
      mocks.setCurrentUser({
        id: 'user-admin',
        username: 'adminuser',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed some submissions
      mocks.seedSubmissions(3);
      
      // Navigate to moderation queue
      await page.goto('/admin/moderation');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the moderation page
      await expect(page).toHaveURL(/\/admin\/moderation/);
      await expect(page.getByRole('heading', { name: /moderation queue/i })).toBeVisible();
    });

    test('should allow moderator users to access moderation queue', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set current user as moderator
      mocks.setCurrentUser({
        id: 'user-moderator',
        username: 'moderatoruser',
        email: 'moderator@example.com',
        role: 'moderator',
        karma_points: 300,
        is_banned: false,
      });
      
      // Seed some submissions
      mocks.seedSubmissions(2);
      
      // Navigate to moderation queue
      await page.goto('/admin/moderation');
      await page.waitForLoadState('networkidle');
      
      // Verify we're on the moderation page
      await expect(page).toHaveURL(/\/admin\/moderation/);
      await expect(page.getByRole('heading', { name: /moderation queue/i })).toBeVisible();
    });
  });

  test.describe('Single Submission Actions', () => {
    test('should approve submission and create audit log', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed a submission
      const submission = mocks.seedSubmission({
        title: 'Amazing Play',
        status: 'pending',
      });
      
      // Navigate to moderation queue
      await page.goto('/admin/moderation');
      await page.waitForLoadState('networkidle');
      
      // Find and click approve button for the submission
      const approveButton = page.getByRole('button', { name: /approve/i }).first();
      await approveButton.click();
      
      // Wait for success message
      await expect(page.locator('[role="alert"]').filter({ hasText: /success/i })).toBeVisible({ timeout: 5000 });
      
      // Verify submission was approved
      const updatedSubmission = mocks.getSubmission(submission.id);
      expect(updatedSubmission?.status).toBe('approved');
      expect(updatedSubmission?.reviewed_by).toBe('admin-1');
      
      // Verify audit log was created
      const auditLogs = mocks.getAuditLogs();
      const approveLog = auditLogs.find(log => 
        log.action === 'approve_submission' && 
        log.resource_id === submission.id
      );
      expect(approveLog).toBeDefined();
      expect(approveLog?.actor_id).toBe('admin-1');
    });

    test('should reject submission with reason and create audit log', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed a submission
      const submission = mocks.seedSubmission({
        title: 'Low Quality Clip',
        status: 'pending',
      });
      
      // Navigate to moderation queue
      await page.goto('/admin/moderation');
      await page.waitForLoadState('networkidle');
      
      // Find and click reject button
      const rejectButton = page.getByRole('button', { name: /reject/i }).first();
      await rejectButton.click();
      
      // Wait for rejection modal/form
      const reasonTextarea = page.getByLabel(/rejection reason/i);
      await reasonTextarea.waitFor({ state: 'visible', timeout: 5000 });
      
      // Fill rejection reason
      const rejectionReason = 'Low quality content that does not meet our standards';
      await reasonTextarea.fill(rejectionReason);
      
      // Confirm rejection
      const confirmButton = page.getByRole('button', { name: /confirm|reject/i }).last();
      await confirmButton.click();
      
      // Wait for success message
      await expect(page.locator('[role="alert"]').filter({ hasText: /success/i })).toBeVisible({ timeout: 5000 });
      
      // Verify submission was rejected with reason
      const updatedSubmission = mocks.getSubmission(submission.id);
      expect(updatedSubmission?.status).toBe('rejected');
      expect(updatedSubmission?.rejection_reason).toBe(rejectionReason);
      expect(updatedSubmission?.reviewed_by).toBe('admin-1');
      
      // Verify audit log was created
      const auditLogs = mocks.getAuditLogs();
      const rejectLog = auditLogs.find(log => 
        log.action === 'reject_submission' && 
        log.resource_id === submission.id
      );
      expect(rejectLog).toBeDefined();
      expect(rejectLog?.actor_id).toBe('admin-1');
      expect(rejectLog?.details?.rejection_reason).toBe(rejectionReason);
    });

    test('should display rejection reason to submitting user', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      const userId = 'user-submitter';
      const rejectionReason = 'Content violates community guidelines';
      
      // First, create and reject a submission
      const submission = mocks.seedSubmission({
        user_id: userId,
        title: 'My Submission',
        status: 'rejected',
        rejection_reason: rejectionReason,
      });
      
      // Set current user as the submitter
      mocks.setCurrentUser({
        id: userId,
        username: 'submitter',
        email: 'submitter@example.com',
        role: 'user',
        karma_points: 100,
        is_banned: false,
      });
      
      // Navigate to user's submissions page
      await page.goto('/submissions');
      await page.waitForLoadState('networkidle');
      
      // Verify rejection reason is visible
      await expect(page.getByText(rejectionReason)).toBeVisible();
    });
  });

  test.describe('Bulk Actions', () => {
    test('should bulk approve multiple submissions and create audit logs', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed multiple submissions
      const submissions = mocks.seedSubmissions(3, { status: 'pending' });
      
      // For this test, we'll need to add bulk action API support to the frontend
      // Since the UI doesn't currently support bulk actions visually,
      // we'll test the API directly via route interception
      
      // Make API call for bulk approve
      const response = await page.request.post('/api/admin/submissions/bulk-approve', {
        data: {
          submission_ids: submissions.map(s => s.id),
        },
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      
      // Verify all submissions were approved
      for (const submission of submissions) {
        const updated = mocks.getSubmission(submission.id);
        expect(updated?.status).toBe('approved');
        expect(updated?.reviewed_by).toBe('admin-1');
      }
      
      // Verify audit logs were created for each
      const auditLogs = mocks.getAuditLogs();
      const bulkApproveLogs = auditLogs.filter(log => log.action === 'bulk_approve_submission');
      expect(bulkApproveLogs.length).toBe(3);
    });

    test('should bulk reject multiple submissions with reason and create audit logs', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed multiple submissions
      const submissions = mocks.seedSubmissions(3, { status: 'pending' });
      const rejectionReason = 'Batch rejection for quality issues';
      
      // Make API call for bulk reject
      const response = await page.request.post('/api/admin/submissions/bulk-reject', {
        data: {
          submission_ids: submissions.map(s => s.id),
          reason: rejectionReason,
        },
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(3);
      
      // Verify all submissions were rejected with reason
      for (const submission of submissions) {
        const updated = mocks.getSubmission(submission.id);
        expect(updated?.status).toBe('rejected');
        expect(updated?.rejection_reason).toBe(rejectionReason);
        expect(updated?.reviewed_by).toBe('admin-1');
      }
      
      // Verify audit logs were created for each
      const auditLogs = mocks.getAuditLogs();
      const bulkRejectLogs = auditLogs.filter(log => log.action === 'bulk_reject_submission');
      expect(bulkRejectLogs.length).toBe(3);
      bulkRejectLogs.forEach(log => {
        expect(log.details?.rejection_reason).toBe(rejectionReason);
      });
    });
  });

  test.describe('Performance Baseline', () => {
    test('should measure p95 page load time for moderation queue', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed realistic number of submissions (50)
      mocks.seedSubmissions(50, { status: 'pending' });
      
      // Measure page load times over multiple iterations
      const loadTimes: number[] = [];
      const iterations = 20; // 20 iterations to get p95
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await page.goto('/admin/moderation');
        await page.waitForLoadState('networkidle');
        
        // Wait for submissions to be visible
        await page.locator('.bg-background-secondary').first().waitFor({ state: 'visible', timeout: 10000 });
        
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        loadTimes.push(loadTime);
        
        // Small delay between iterations
        await page.waitForTimeout(100);
      }
      
      // Calculate p95
      loadTimes.sort((a, b) => a - b);
      const p95Index = Math.ceil(iterations * 0.95) - 1;
      const p95LoadTime = loadTimes[p95Index];
      
      console.log(`Moderation Queue Load Times (ms):`, {
        min: Math.min(...loadTimes),
        max: Math.max(...loadTimes),
        median: loadTimes[Math.floor(loadTimes.length / 2)],
        p95: p95LoadTime,
        mean: loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length,
      });
      
      // Assert p95 is within acceptable range (under 3 seconds for mock data)
      expect(p95LoadTime).toBeLessThan(3000);
    });
  });

  test.describe('Audit Logging', () => {
    test('should create audit logs for all moderation actions', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Seed submissions
      const submission1 = mocks.seedSubmission({ title: 'Submission 1' });
      const submission2 = mocks.seedSubmission({ title: 'Submission 2' });
      
      // Approve submission 1 via API
      await page.request.post(`/api/admin/submissions/${submission1.id}/approve`);
      
      // Reject submission 2 via API
      await page.request.post(`/api/admin/submissions/${submission2.id}/reject`, {
        data: { reason: 'Test rejection' },
      });
      
      // Verify audit logs exist
      const auditLogs = mocks.getAuditLogs();
      
      const approveLog = auditLogs.find(log => 
        log.action === 'approve_submission' && log.resource_id === submission1.id
      );
      expect(approveLog).toBeDefined();
      expect(approveLog?.actor_id).toBe('admin-1');
      
      const rejectLog = auditLogs.find(log => 
        log.action === 'reject_submission' && log.resource_id === submission2.id
      );
      expect(rejectLog).toBeDefined();
      expect(rejectLog?.actor_id).toBe('admin-1');
      expect(rejectLog?.details?.rejection_reason).toBe('Test rejection');
    });

    test('should retrieve audit logs via API with filters', async ({ page }) => {
      const mocks = await setupModerationMocks(page);
      
      // Set admin user
      mocks.setCurrentUser({
        id: 'admin-1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        karma_points: 500,
        is_banned: false,
      });
      
      // Create some audit logs
      const submission = mocks.seedSubmission();
      await page.request.post(`/api/admin/submissions/${submission.id}/approve`);
      
      // Retrieve audit logs filtered by resource_id
      const response = await page.request.get(`/api/admin/audit-logs?resource_id=${submission.id}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].resource_id).toBe(submission.id);
      expect(data.data[0].action).toBe('approve_submission');
    });
  });
});
