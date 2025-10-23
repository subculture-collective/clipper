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
  http.get(`${API_BASE_URL}/clips/:id/comments`, () => {
    return HttpResponse.json({
      comments: [],
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        has_more: false,
      },
    });
  }),

  // POST /api/clips/:id/comments - Create comment
  http.post(`${API_BASE_URL}/clips/:id/comments`, () => {
    return HttpResponse.json({
      comment: {
        id: '423e4567-e89b-12d3-a456-426614174003',
        content: 'Test comment',
        user_id: mockUser.id,
        created_at: new Date().toISOString(),
      },
    });
  }),
];
