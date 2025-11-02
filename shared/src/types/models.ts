/**
 * Shared TypeScript type definitions for Clipper
 * Used across web and mobile applications
 */

// User types
export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  karma: number;
  createdAt: string;
  updatedAt: string;
}

// Clip types
export interface Clip {
  id: string;
  slug: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl: string;
  duration: number;
  viewCount: number;
  broadcaster: {
    id: string;
    name: string;
    displayName: string;
  };
  game?: {
    id: string;
    name: string;
  };
  createdAt: string;
  creatorId: string;
  voteScore: number;
  commentCount: number;
  tags?: string[];
}

// Comment types
export interface Comment {
  id: string;
  clipId: string;
  userId: string;
  user: User;
  content: string;
  parentId?: string;
  replies?: Comment[];
  voteScore: number;
  createdAt: string;
  updatedAt: string;
}

// Vote types
export type VoteDirection = 'up' | 'down' | null;

export interface Vote {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'clip' | 'comment';
  direction: VoteDirection;
  createdAt: string;
}

// Authentication types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokens;
}
