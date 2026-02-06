import { render, waitFor } from '@/test/test-utils';
import { vi } from 'vitest';
import * as clipApi from '@/lib/clip-api';
import { ClipFeed } from './ClipFeed';
import type { ClipFeedResponse } from '@/types/clip';

vi.mock('@/lib/clip-api');

describe('ClipFeed default filters', () => {
    it('does not include language filter by default', async () => {
        const mockResponse: ClipFeedResponse = {
            clips: [],
            total: 0,
            page: 1,
            has_more: false,
            limit: 10,
        };

        vi.mocked(clipApi.fetchClips).mockResolvedValue(mockResponse);

        render(<ClipFeed />);

        await waitFor(() => {
            expect(clipApi.fetchClips).toHaveBeenCalled();
        });

        const call = vi.mocked(clipApi.fetchClips).mock.calls[0][0];
        // Ensure filters exist and do not include language by default
        expect(call.filters).toBeDefined();
        expect(call.filters?.sort).toBe('trending');
        expect(call.filters?.timeframe).toBe('day');
        // @ts-expect-error dynamic check
        expect(call.filters?.language).toBeUndefined();
    });
});
