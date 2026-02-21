import React, { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Clip, Collection } from '@/types/clip';
import { MOCK_CLIPS, MOCK_COLLECTIONS } from '@/mocks/clips';

export const [ClipProvider, useClips] = createContextHook(() => {
  const [clips, setClips] = useState<Clip[]>(MOCK_CLIPS);
  const [collections, setCollections] = useState<Collection[]>(MOCK_COLLECTIONS);

  const vote = useCallback((clipId: string, direction: 'up' | 'down') => {
    setClips(prev =>
      prev.map(c => {
        if (c.id !== clipId) return c;
        const currentVote = c.userVote;
        let newVotes = c.votes;
        let newUserVote: 'up' | 'down' | null = direction;

        if (currentVote === direction) {
          newUserVote = null;
          newVotes += direction === 'up' ? -1 : 1;
        } else {
          if (currentVote === 'up') newVotes -= 1;
          if (currentVote === 'down') newVotes += 1;
          newVotes += direction === 'up' ? 1 : -1;
        }

        return { ...c, votes: newVotes, userVote: newUserVote };
      })
    );
  }, []);

  const toggleBookmark = useCallback((clipId: string) => {
    setClips(prev =>
      prev.map(c =>
        c.id === clipId ? { ...c, isBookmarked: !c.isBookmarked } : c
      )
    );
  }, []);

  const getClipById = useCallback((id: string) => {
    return clips.find(c => c.id === id) ?? null;
  }, [clips]);

  const bookmarkedClips = useMemo(() => clips.filter(c => c.isBookmarked), [clips]);

  const trendingClips = useMemo(() =>
    [...clips].sort((a, b) => b.votes - a.votes).slice(0, 10),
    [clips]
  );

  return {
    clips,
    collections,
    vote,
    toggleBookmark,
    getClipById,
    bookmarkedClips,
    trendingClips,
  };
});
