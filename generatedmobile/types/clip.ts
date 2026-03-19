export interface Clip {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  viewCount: number;
  duration: number;
  createdAt: string;
  streamer: Streamer;
  game: Game;
  votes: number;
  userVote: 'up' | 'down' | null;
  commentCount: number;
  isBookmarked: boolean;
}

export interface Streamer {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string;
  isLive: boolean;
}

export interface Game {
  id: string;
  name: string;
  coverUrl: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  clipCount: number;
  thumbnailUrl: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  votes: number;
  createdAt: string;
  replies: Comment[];
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  karma: number;
  clipsSubmitted: number;
  collectionsCount: number;
  joinedAt: string;
  isPremium: boolean;
}
