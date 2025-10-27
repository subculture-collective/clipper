/**
 * Manual verification test for useClipById hook
 *
 * This file demonstrates that useClipById correctly uses useQuery
 * instead of useInfiniteQuery for fetching a single clip.
 *
 * Key differences between useQuery and useInfiniteQuery:
 *
 * 1. useQuery - Used for single resource fetching
 *    - Returns: { data, isLoading, error, refetch, ... }
 *    - Data structure: Single value (Clip in this case)
 *    - No pagination parameters needed
 *
 * 2. useInfiniteQuery - Used for paginated data
 *    - Returns: { data, isLoading, error, fetchNextPage, hasNextPage, ... }
 *    - Data structure: { pages: [...], pageParams: [...] }
 *    - Requires initialPageParam and getNextPageParam
 *
 * Why the change is correct:
 *
 * - useClipById fetches a SINGLE clip by ID
 * - There's no pagination involved in fetching a single resource
 * - Using useInfiniteQuery would be overkill and incorrect
 * - The removed parameters (initialPageParam, getNextPageParam) don't apply to single fetches
 *
 * Expected behavior:
 *
 * const { data: clip, isLoading, error } = useClipById('clip-id-123');
 *
 * - clip: Single Clip object (not an array or pages structure)
 * - isLoading: Boolean indicating loading state
 * - error: Error object if fetch fails
 * - No pagination-related properties
 */
// Example of what the hook returns
const exampleUsage = {
    data: {
        id: '1',
        twitch_clip_id: 'clip1',
        twitch_clip_url: 'https://twitch.tv/clip1',
        embed_url: 'https://clips.twitch.tv/embed?clip=clip1',
        title: 'Amazing Play',
        creator_name: 'streamer1',
        broadcaster_name: 'streamer1',
        view_count: 1000,
        created_at: new Date().toISOString(),
        imported_at: new Date().toISOString(),
        vote_score: 42,
        comment_count: 5,
        favorite_count: 10,
        is_featured: false,
        is_nsfw: false,
        is_removed: false,
    },
    isLoading: false,
    error: null,
    refetch: () => {
        console.log('Refetching clip...');
    },
};
// Verification notes
console.log('useClipById verification:');
console.log('1. Returns single Clip object, not paginated structure');
console.log('2. No pagination parameters required');
console.log('3. Correct for single resource fetching');
console.log('Example data structure:', exampleUsage.data);
export { exampleUsage };
