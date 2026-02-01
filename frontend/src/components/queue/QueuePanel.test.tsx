import { render, screen, fireEvent } from '@/test/test-utils';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueuePanel } from './QueuePanel';
import type { Queue } from '@/types/queue';

// Mock the hooks
const mockReorderQueue = vi.fn();
const mockRemoveFromQueue = vi.fn();
const mockClearQueue = vi.fn();

vi.mock('@/hooks/useQueue', () => ({
    useQueue: () => ({
        data: mockQueueData,
        isLoading: false,
    }),
    useRemoveFromQueue: () => ({
        mutate: mockRemoveFromQueue,
    }),
    useClearQueue: () => ({
        mutate: mockClearQueue,
    }),
    useReorderQueue: () => ({
        mutate: mockReorderQueue,
    }),
}));

let mockQueueData: Queue | null = null;

const createMockQueue = (itemCount: number): Queue => ({
    items: Array.from({ length: itemCount }, (_, i) => ({
        id: `item-${i}`,
        clip_id: `clip-${i}`,
        user_id: 'user-1',
        position: i,
        added_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        clip: {
            id: `clip-${i}`,
            twitch_clip_id: `twitch-${i}`,
            twitch_clip_url: `https://clips.twitch.tv/test-${i}`,
            embed_url: `https://clips.twitch.tv/embed?clip=test-${i}`,
            title: `Test Clip ${i + 1}`,
            creator_name: 'TestCreator',
            broadcaster_name: 'TestStreamer',
            game_name: 'Test Game',
            thumbnail_url: `https://example.com/thumb-${i}.jpg`,
            duration: 30,
            view_count: 100,
            vote_score: 0,
            comment_count: 0,
            favorite_count: 0,
            created_at: '2024-01-01T00:00:00Z',
            imported_at: '2024-01-01T00:00:00Z',
            is_featured: false,
            is_nsfw: false,
            is_removed: false,
            user_vote: null,
            is_favorited: false,
        },
    })),
    total: itemCount,
    next_clip: undefined,
});

describe('QueuePanel - Drag and Drop', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQueueData = createMockQueue(3);
    });

    it('resets drag state on drag end', () => {
        render(<QueuePanel />);
        
        const firstItem = screen.getByText('Test Clip 1').closest('[draggable="true"]');
        expect(firstItem).toBeInTheDocument();

        // Start drag
        fireEvent.dragStart(firstItem!);
        expect(firstItem).toHaveClass('opacity-50');

        // End drag (e.g., ESC or drag outside)
        fireEvent.dragEnd(firstItem!);
        
        // Verify opacity is no longer applied
        expect(firstItem).not.toHaveClass('opacity-50');
    });

    it('clears drag state when drag ends without drop', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const firstItem = items[0];
        
        // Start dragging
        fireEvent.dragStart(firstItem);
        
        // Verify drag state is set
        expect(firstItem).toHaveClass('opacity-50');
        
        // End drag without dropping
        fireEvent.dragEnd(firstItem);
        
        // Verify drag state is cleared
        expect(firstItem).not.toHaveClass('opacity-50');
    });
});

describe('QueuePanel - Keyboard Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQueueData = createMockQueue(3);
    });

    it('moves item up with Alt+ArrowUp', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const secondItem = items[1]; // Index 1
        
        // Focus the second item and press Alt+ArrowUp
        secondItem.focus();
        fireEvent.keyDown(secondItem, { key: 'ArrowUp', altKey: true });
        
        // Verify reorderQueue was called with correct parameters
        expect(mockReorderQueue).toHaveBeenCalledWith({
            item_id: 'item-1',
            new_position: 0,
        });
    });

    it('moves item down with Alt+ArrowDown', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const secondItem = items[1]; // Index 1
        
        // Focus the second item and press Alt+ArrowDown
        secondItem.focus();
        fireEvent.keyDown(secondItem, { key: 'ArrowDown', altKey: true });
        
        // Verify reorderQueue was called with correct parameters
        expect(mockReorderQueue).toHaveBeenCalledWith({
            item_id: 'item-1',
            new_position: 2,
        });
    });

    it('does not move first item up beyond bounds', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const firstItem = items[0]; // Index 0
        
        // Try to move first item up (should not work)
        firstItem.focus();
        fireEvent.keyDown(firstItem, { key: 'ArrowUp', altKey: true });
        
        // Verify reorderQueue was not called
        expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('does not move last item down beyond bounds', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const lastItem = items[2]; // Index 2 (last)
        
        // Try to move last item down (should not work)
        lastItem.focus();
        fireEvent.keyDown(lastItem, { key: 'ArrowDown', altKey: true });
        
        // Verify reorderQueue was not called
        expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('ignores arrow keys without Alt modifier', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const secondItem = items[1];
        
        // Press ArrowUp without Alt
        secondItem.focus();
        fireEvent.keyDown(secondItem, { key: 'ArrowUp', altKey: false });
        
        // Verify reorderQueue was not called
        expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('ignores other keys with Alt modifier', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        const secondItem = items[1];
        
        // Press another key with Alt
        secondItem.focus();
        fireEvent.keyDown(secondItem, { key: 'a', altKey: true });
        
        // Verify reorderQueue was not called
        expect(mockReorderQueue).not.toHaveBeenCalled();
    });

    it('has appropriate aria labels for accessibility', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        
        // Check that items have informative aria labels
        expect(items[0]).toHaveAttribute('aria-label');
        const ariaLabel = items[0].getAttribute('aria-label');
        expect(ariaLabel).toContain('Queue item 1');
        expect(ariaLabel).toContain('Test Clip 1');
        expect(ariaLabel).toContain('Alt+Arrow');
    });

    it('queue items are keyboard focusable', () => {
        render(<QueuePanel />);
        
        const items = screen.getAllByRole('listitem');
        
        // Check that items have tabIndex
        items.forEach(item => {
            expect(item).toHaveAttribute('tabIndex', '0');
        });
    });
});
