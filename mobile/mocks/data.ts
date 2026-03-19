import type { Clip, Game, User, Comment, Collection } from '@/types';

export const MOCK_GAMES: Game[] = [
  { id: '1', name: 'Valorant', slug: 'valorant', cover_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=280&fit=crop', clip_count: 12450 },
  { id: '2', name: 'League of Legends', slug: 'league-of-legends', cover_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=280&fit=crop', clip_count: 9870 },
  { id: '3', name: 'Fortnite', slug: 'fortnite', cover_url: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=200&h=280&fit=crop', clip_count: 8320 },
  { id: '4', name: 'Minecraft', slug: 'minecraft', cover_url: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=200&h=280&fit=crop', clip_count: 6540 },
  { id: '5', name: 'CS2', slug: 'cs2', cover_url: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=280&fit=crop', clip_count: 11200 },
  { id: '6', name: 'Apex Legends', slug: 'apex-legends', cover_url: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=200&h=280&fit=crop', clip_count: 5890 },
  { id: '7', name: 'Overwatch 2', slug: 'overwatch-2', cover_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=280&fit=crop', clip_count: 7100 },
  { id: '8', name: 'GTA V', slug: 'gta-v', cover_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&h=280&fit=crop', clip_count: 4300 },
];

const STREAMERS = [
  { id: 's1', display_name: 'shroud', avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', is_live: true },
  { id: 's2', display_name: 'Pokimane', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', is_live: false },
  { id: 's3', display_name: 'xQc', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', is_live: true },
  { id: 's4', display_name: 'TimTheTatman', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', is_live: false },
  { id: 's5', display_name: 'summit1g', avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', is_live: true },
  { id: 's6', display_name: 'Valkyrae', avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', is_live: false },
];

const THUMBNAILS = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=640&h=360&fit=crop',
];

const CLIP_TITLES = [
  'INSANE 1v5 ACE clutch in ranked!',
  'This play should NOT be possible',
  'Most calculated play of the year',
  'He really just did that on stream...',
  'NEW WORLD RECORD speedrun any%',
  'When the timing is just *perfect*',
  'Chat went absolutely WILD after this',
  'Pro player reacts to fan clip',
  'The luckiest moment in gaming history',
  'How does this even happen?!',
  'TRIPLE COLLATERAL through smoke',
  'Outplayed the entire lobby',
  'This strat is actually broken',
  'The clutch that broke the internet',
  "I can't believe this worked...",
];

export const MOCK_CLIPS: Clip[] = Array.from({ length: 20 }, (_, i) => ({
  id: `clip-${i + 1}`,
  twitch_clip_id: `twitch-${i + 1}`,
  title: CLIP_TITLES[i % CLIP_TITLES.length],
  thumbnail_url: THUMBNAILS[i % THUMBNAILS.length],
  embed_url: '',
  broadcaster_name: STREAMERS[i % STREAMERS.length].display_name,
  view_count: Math.floor(Math.random() * 500000) + 1000,
  duration: Math.floor(Math.random() * 55) + 5,
  created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  streamer: STREAMERS[i % STREAMERS.length] as any,
  game: MOCK_GAMES[i % MOCK_GAMES.length] as any,
  game_name: MOCK_GAMES[i % MOCK_GAMES.length].name,
  vote_score: Math.floor(Math.random() * 5000) - 500,
  hot_score: Math.random() * 100,
  trending_score: Math.random() * 50,
  user_vote: null,
  comment_count: Math.floor(Math.random() * 300),
  is_favorited: i % 5 === 0,
  tags: [],
  status: 'approved',
  submitted_by: null,
  updated_at: new Date().toISOString(),
}));

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c-1',
    clip_id: 'clip-1',
    user_id: 'u-1',
    content: 'This is absolutely NUTS. How do you even react that fast?',
    vote_score: 234,
    reply_count: 1,
    created_at: '2026-02-19T12:00:00Z',
    updated_at: '2026-02-19T12:00:00Z',
    user: {
      id: 'u-1',
      display_name: 'ClipMaster99',
      username: 'clipmaster99',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop',
    } as any,
    replies: [
      {
        id: 'c-1-r1',
        clip_id: 'clip-1',
        user_id: 'u-2',
        parent_comment_id: 'c-1',
        content: 'Years of practice honestly. Shroud is just built different.',
        vote_score: 89,
        reply_count: 0,
        created_at: '2026-02-19T12:30:00Z',
        updated_at: '2026-02-19T12:30:00Z',
        user: {
          id: 'u-2',
          display_name: 'GameSniper',
          username: 'gamesniper',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop',
        } as any,
      },
    ],
  },
  {
    id: 'c-2',
    clip_id: 'clip-1',
    user_id: 'u-3',
    content: 'I was watching this live and chat literally exploded',
    vote_score: 156,
    reply_count: 0,
    created_at: '2026-02-19T11:00:00Z',
    updated_at: '2026-02-19T11:00:00Z',
    user: {
      id: 'u-3',
      display_name: 'TwitchFan2026',
      username: 'twitchfan2026',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop',
    } as any,
  },
];

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    title: 'Best of 2026',
    description: 'The greatest clips of the year so far',
    clip_count: 42,
    visibility: 'public',
    user_id: 'user-me',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'col-2',
    title: 'Insane Clutches',
    description: 'Clutch moments that defy belief',
    clip_count: 28,
    visibility: 'public',
    user_id: 'user-me',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'col-3',
    title: 'Funny Fails',
    description: 'When gaming goes hilariously wrong',
    clip_count: 15,
    visibility: 'private',
    user_id: 'user-me',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];

export const MOCK_USER: User = {
  id: 'user-me',
  twitch_id: '12345',
  username: 'clipper_pro',
  display_name: 'Clipper Pro',
  avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  role: 'user',
  account_type: 'premium',
  karma_points: 12450,
  follower_count: 340,
  following_count: 52,
  created_at: '2025-06-15T00:00:00Z',
  updated_at: '2025-06-15T00:00:00Z',
};

export const TRENDING_TAGS = [
  'clutch', 'ace', 'funny', 'fail', 'pro-play', 'speedrun',
  'world-record', 'reaction', 'outplay', 'insane',
];
