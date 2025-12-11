import type { Clip } from './clip';

export interface Community {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    owner_id: string;
    is_public: boolean;
    member_count: number;
    rules?: string;
    created_at: string;
    updated_at: string;
}

export interface CommunityMember {
    id: string;
    community_id: string;
    user_id: string;
    role: 'admin' | 'mod' | 'member';
    joined_at: string;
}

export interface CommunityMemberWithUser extends CommunityMember {
    user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
}

export interface CommunityBan {
    id: string;
    community_id: string;
    banned_user_id: string;
    banned_by_user_id?: string;
    reason?: string;
    banned_at: string;
}

export interface CommunityBanWithUser extends CommunityBan {
    banned_user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
    banned_by_user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
}

export interface CommunityDiscussion {
    id: string;
    community_id: string;
    user_id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    is_resolved: boolean;
    vote_score: number;
    comment_count: number;
    created_at: string;
    updated_at: string;
}

export interface CommunityDiscussionWithUser extends CommunityDiscussion {
    user?: {
        id: string;
        username: string;
        display_name: string;
        avatar_url?: string;
    };
}

export interface CommunityDiscussionComment {
    id: string;
    discussion_id: string;
    user_id: string;
    parent_comment_id?: string;
    content: string;
    vote_score: number;
    is_edited: boolean;
    is_removed: boolean;
    removed_reason?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateCommunityRequest {
    name: string;
    description?: string;
    icon?: string;
    is_public?: boolean;
    rules?: string;
}

export interface UpdateCommunityRequest {
    name?: string;
    description?: string;
    icon?: string;
    is_public?: boolean;
    rules?: string;
}

export interface UpdateMemberRoleRequest {
    role: 'admin' | 'mod' | 'member';
}

export interface BanMemberRequest {
    user_id: string;
    reason?: string;
}

export interface AddClipToCommunityRequest {
    clip_id: string;
}

export interface CreateDiscussionRequest {
    title: string;
    content: string;
}

export interface UpdateDiscussionRequest {
    title?: string;
    content?: string;
    is_pinned?: boolean;
    is_resolved?: boolean;
}

export interface CommunityListResponse {
    communities: Community[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface CommunityMembersResponse {
    members: CommunityMemberWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface CommunityBansResponse {
    bans: CommunityBanWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface CommunityDiscussionsResponse {
    discussions: CommunityDiscussionWithUser[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

export interface CommunityFeedResponse {
    clips: Clip[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}
