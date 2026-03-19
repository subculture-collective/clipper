import { Clip, Collection, Comment, UserProfile, Game } from '@/types/clip';

export const GAMES: Game[] = [
  { id: '1', name: 'Valorant', coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&h=280&fit=crop' },
  { id: '2', name: 'League of Legends', coverUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=280&fit=crop' },
  { id: '3', name: 'Fortnite', coverUrl: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=200&h=280&fit=crop' },
  { id: '4', name: 'Minecraft', coverUrl: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=200&h=280&fit=crop' },
  { id: '5', name: 'CS2', coverUrl: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=200&h=280&fit=crop' },
  { id: '6', name: 'Apex Legends', coverUrl: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b28?w=200&h=280&fit=crop' },
  { id: '7', name: 'Overwatch 2', coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&h=280&fit=crop' },
  { id: '8', name: 'GTA V', coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&h=280&fit=crop' },
];

const STREAMERS = [
  { id: '1', name: 'shroud', displayName: 'shroud', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop', isLive: true },
  { id: '2', name: 'pokimane', displayName: 'Pokimane', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop', isLive: false },
  { id: '3', name: 'xqc', displayName: 'xQc', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop', isLive: true },
  { id: '4', name: 'timthetatman', displayName: 'TimTheTatman', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop', isLive: false },
  { id: '5', name: 'summit1g', displayName: 'summit1g', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop', isLive: true },
  { id: '6', name: 'valkyrae', displayName: 'Valkyrae', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop', isLive: false },
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
  'https://images.unsplash.com/photo-1542751110-97427bbecf20?w=640&h=360&fit=crop',
  'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=640&h=360&fit=crop',
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
  'I can\'t believe this worked...',
];

export const MOCK_CLIPS: Clip[] = Array.from({ length: 20 }, (_, i) => ({
  id: `clip-${i + 1}`,
  title: CLIP_TITLES[i % CLIP_TITLES.length],
  thumbnailUrl: THUMBNAILS[i % THUMBNAILS.length],
  videoUrl: '',
  viewCount: Math.floor(Math.random() * 500000) + 1000,
  duration: Math.floor(Math.random() * 55) + 5,
  createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  streamer: STREAMERS[i % STREAMERS.length],
  game: GAMES[i % GAMES.length],
  votes: Math.floor(Math.random() * 5000) - 500,
  userVote: null,
  commentCount: Math.floor(Math.random() * 300),
  isBookmarked: i % 5 === 0,
}));

export const MOCK_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Best of 2026',
    description: 'The greatest clips of the year so far',
    clipCount: 42,
    thumbnailUrl: THUMBNAILS[0],
    isPrivate: false,
    createdAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'col-2',
    name: 'Insane Clutches',
    description: 'Clutch moments that defy belief',
    clipCount: 28,
    thumbnailUrl: THUMBNAILS[2],
    isPrivate: false,
    createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'col-3',
    name: 'Funny Fails',
    description: 'When gaming goes hilariously wrong',
    clipCount: 15,
    thumbnailUrl: THUMBNAILS[4],
    isPrivate: true,
    createdAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'col-4',
    name: 'Pro Plays',
    description: 'Tournament-level gaming moments',
    clipCount: 67,
    thumbnailUrl: THUMBNAILS[6],
    isPrivate: false,
    createdAt: '2025-12-20T00:00:00Z',
  },
];

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c-1',
    userId: 'u-1',
    username: 'ClipMaster99',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&h=50&fit=crop',
    text: 'This is absolutely NUTS. How do you even react that fast?',
    votes: 234,
    createdAt: '2026-02-19T12:00:00Z',
    replies: [
      {
        id: 'c-1-r1',
        userId: 'u-2',
        username: 'GameSniper',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop',
        text: 'Years of practice honestly. Shroud is just built different.',
        votes: 89,
        createdAt: '2026-02-19T12:30:00Z',
        replies: [],
      },
    ],
  },
  {
    id: 'c-2',
    userId: 'u-3',
    username: 'TwitchFan2026',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&h=50&fit=crop',
    text: 'I was watching this live and chat literally exploded',
    votes: 156,
    createdAt: '2026-02-19T11:00:00Z',
    replies: [],
  },
  {
    id: 'c-3',
    userId: 'u-4',
    username: 'ProGamerMoves',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop',
    text: 'This is why this game needs to be nerfed lmao',
    votes: 78,
    createdAt: '2026-02-19T10:00:00Z',
    replies: [],
  },
];

export const MOCK_USER: UserProfile = {
  id: 'user-me',
  username: 'clipper_pro',
  displayName: 'Clipper Pro',
  avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
  karma: 12450,
  clipsSubmitted: 87,
  collectionsCount: 4,
  joinedAt: '2025-06-15T00:00:00Z',
  isPremium: true,
};

export const TRENDING_TAGS = [
  'clutch', 'ace', 'funny', 'fail', 'pro-play', 'speedrun',
  'world-record', 'reaction', 'outplay', 'insane',
];
