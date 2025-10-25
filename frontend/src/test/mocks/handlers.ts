import { http, HttpResponse } from 'msw';

const API_BASE_URL = 'http://localhost:8080/api';

// Mock data
export const mockClips = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    twitch_clip_id: 'test_clip_1',
    title: 'Amazing Play',
    url: 'https://clips.twitch.tv/test_clip_1',
    thumbnail_url: 'https://example.com/thumb1.jpg',
    view_count: 1000,
    duration: 30.5,
    broadcaster_name: 'TestStreamer',
    game_name: 'Test Game',
    score: 100,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    twitch_clip_id: 'test_clip_2',
    title: 'Epic Moment',
    url: 'https://clips.twitch.tv/test_clip_2',
    thumbnail_url: 'https://example.com/thumb2.jpg',
    view_count: 2000,
    duration: 45.2,
    broadcaster_name: 'AnotherStreamer',
    game_name: 'Another Game',
    score: 200,
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const mockUser = {
  id: '323e4567-e89b-12d3-a456-426614174002',
  username: 'testuser',
  display_name: 'Test User',
  email: 'test@example.com',
  profile_image_url: 'https://example.com/avatar.png',
  role: 'user',
};

// Mock comments data
export const mockComments = [
  {
    id: 'comment-1',
    clip_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: mockUser.id,
    username: mockUser.username,
    user_avatar: mockUser.profile_image_url,
    user_karma: 1234,
    user_role: 'user',
    parent_id: null,
    content: 'Great play!',
    vote_score: 5,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
    is_deleted: false,
    is_removed: false,
    depth: 0,
    child_count: 1,
    user_vote: 1,
    replies: [],
  },
  {
    id: 'comment-2',
    clip_id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: 'user-2',
    username: 'user2',
    user_avatar: 'https://example.com/avatar2.png',
    user_karma: 500,
    user_role: 'user',
    parent_id: 'comment-1',
    content: 'I agree!',
    vote_score: 2,
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z',
    is_deleted: false,
    is_removed: false,
    depth: 1,
    child_count: 0,
    user_vote: null,
    replies: [],
  },
];

// API handlers
export const handlers = [
  // GET /api/clips - List clips
  http.get(`${API_BASE_URL}/clips`, ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '25');
    
    return HttpResponse.json({
      clips: mockClips,
      pagination: {
        page,
        limit,
        total: mockClips.length,
        has_more: false,
      },
    });
  }),

  // GET /api/clips/:id - Get single clip
  http.get(`${API_BASE_URL}/clips/:id`, ({ params }) => {
    const clip = mockClips.find((c) => c.id === params.id);
    
    if (!clip) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json({ clip });
  }),

  // POST /api/clips/:id/vote - Vote on clip
  http.post(`${API_BASE_URL}/clips/:id/vote`, () => {
    return HttpResponse.json({ success: true });
  }),

  // GET /api/auth/me - Get current user
  http.get(`${API_BASE_URL}/auth/me`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  // POST /api/auth/logout - Logout
  http.post(`${API_BASE_URL}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // GET /api/clips/:id/comments - Get comments
  http.get(`${API_BASE_URL}/clips/:id/comments`, ({ params, request }) => {
    const url = new URL(request.url);
    const sort = url.searchParams.get('sort') || 'best';
    const cursor = parseInt(url.searchParams.get('cursor') || '0');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const clipComments = mockComments.filter((c) => c.clip_id === params.id);
    
    // Sort comments
    const sortedComments = [...clipComments];
    switch (sort) {
      case 'new':
        sortedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'old':
        sortedComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'controversial':
        sortedComments.sort((a, b) => Math.abs(b.vote_score) - Math.abs(a.vote_score));
        break;
      case 'best':
      default:
        sortedComments.sort((a, b) => b.vote_score - a.vote_score);
        break;
    }

    const paginatedComments = sortedComments.slice(cursor, cursor + limit);
    
    return HttpResponse.json({
      comments: paginatedComments,
      total: clipComments.length,
      next_cursor: cursor + paginatedComments.length,
      has_more: paginatedComments.length === limit,
    });
  }),

  // POST /api/v1/clips/:id/comments - Create comment
  http.post(`${API_BASE_URL}/v1/clips/:id/comments`, async ({ request, params }) => {
    const body = await request.json() as { content: string; parent_id?: string };
    
    return HttpResponse.json({
      id: `comment-${Date.now()}`,
      clip_id: params.id,
      user_id: mockUser.id,
      username: mockUser.username,
      user_avatar: mockUser.profile_image_url,
      user_karma: 1234,
      user_role: 'user',
      parent_id: body.parent_id || null,
      content: body.content,
      vote_score: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
      is_removed: false,
      depth: body.parent_id ? 1 : 0,
      child_count: 0,
      user_vote: 1,
      replies: [],
    }, { status: 201 });
  }),

  // PUT /api/v1/comments/:id - Update comment
  http.put(`${API_BASE_URL}/v1/comments/:id`, async ({ request }) => {
    const body = await request.json() as { content: string };
    
    return HttpResponse.json({
      message: 'Comment updated successfully',
      content: body.content,
    });
  }),

  // DELETE /api/v1/comments/:id - Delete comment
  http.delete(`${API_BASE_URL}/v1/comments/:id`, () => {
    return HttpResponse.json({
      message: 'Comment deleted successfully',
    });
  }),

  // POST /api/v1/comments/:id/vote - Vote on comment
  http.post(`${API_BASE_URL}/v1/comments/:id/vote`, async ({ request }) => {
    const body = await request.json() as { vote: number };
    
    return HttpResponse.json({
      message: 'Vote recorded successfully',
      vote: body.vote,
    });
  }),

  // POST /api/v1/reports - Report content
  http.post(`${API_BASE_URL}/v1/reports`, async ({ request }) => {
    const body = await request.json() as { 
      target_type: string; 
      target_id: string; 
      reason: string; 
      description?: string 
    };
    
    return HttpResponse.json({
      message: 'Report submitted successfully',
      report: {
        id: `report-${Date.now()}`,
        ...body,
        user_id: mockUser.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
  }),
];
