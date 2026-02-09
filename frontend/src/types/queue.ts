import type { Clip } from './clip';

export interface QueueItem {
    id: string;
    user_id: string;
    clip_id: string;
    position: number;
    added_at: string;
    played_at?: string;
    created_at: string;
    updated_at: string;
}

export interface QueueItemWithClip extends QueueItem {
    clip?: Clip;
}

export interface Queue {
    items: QueueItemWithClip[];
    total: number;
    next_clip?: Clip;
}

export interface AddToQueueRequest {
    clip_id: string;
    at_end?: boolean;
}

export interface ReorderQueueRequest {
    item_id: string;
    new_position: number;
}

export interface ConvertQueueToPlaylistRequest {
    title: string;
    description?: string;
    only_unplayed?: boolean;
    clear_queue?: boolean;
}

export interface QueueResponse {
    success: boolean;
    data: Queue;
}

export interface QueueCountResponse {
    success: boolean;
    data: {
        count: number;
    };
}
