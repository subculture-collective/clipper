-- Seed nested comments with reply relationships and reply_count trigger coverage
-- Runs after seed.sql and assumes core users/clips already exist

DO $$
DECLARE
    clip_hot UUID;
    clip_funny UUID;
    user1 UUID;
    user2 UUID;
    user3 UUID;
    user4 UUID;
    top_hot UUID;
    reply_hot_1 UUID;
    reply_hot_2 UUID;
    reply_hot_2_child UUID;
    top_funny UUID;
    reply_funny_1 UUID;
    reply_funny_2 UUID;
BEGIN
    SELECT id INTO clip_hot FROM clips WHERE twitch_clip_id = 'AwkwardHelplessSalamanderSwiftRage';
    SELECT id INTO clip_funny FROM clips WHERE twitch_clip_id = 'ClumsyBrightGorillaJebaited';

    SELECT id INTO user1 FROM users WHERE twitch_id = '12345'; -- testuser1
    SELECT id INTO user2 FROM users WHERE twitch_id = '12346'; -- testuser2
    SELECT id INTO user3 FROM users WHERE twitch_id = '12347'; -- testmod
    SELECT id INTO user4 FROM users WHERE twitch_id = '12348'; -- testadmin

    IF clip_hot IS NULL OR clip_funny IS NULL OR user1 IS NULL OR user2 IS NULL OR user3 IS NULL OR user4 IS NULL THEN
        RAISE NOTICE 'Skipping comment seed: required clips or users missing';
        RETURN;
    END IF;

    -- Skip if we've already seeded this thread to avoid duplicates on reruns
    IF EXISTS (SELECT 1 FROM comments WHERE content = 'This clutch deserves a medal.') THEN
        RAISE NOTICE 'Nested comment seed already present; skipping.';
        RETURN;
    END IF;

    -- Thread on the hot clip
    INSERT INTO comments (clip_id, user_id, content)
    VALUES (clip_hot, user1, 'This clutch deserves a medal.')
    RETURNING id INTO top_hot;

    INSERT INTO comments (clip_id, user_id, parent_comment_id, content)
    VALUES (clip_hot, user2, top_hot, 'Agreed! Timing was perfect.')
    RETURNING id INTO reply_hot_1;

    INSERT INTO comments (clip_id, user_id, parent_comment_id, content)
    VALUES (clip_hot, user3, top_hot, 'Seen better, but still solid.')
    RETURNING id INTO reply_hot_2;

    -- Deep reply chain on second reply
    INSERT INTO comments (clip_id, user_id, parent_comment_id, content)
    VALUES (clip_hot, user1, reply_hot_2, 'No way, this was clean!')
    RETURNING id INTO reply_hot_2_child;

    -- Thread on the funny clip
    INSERT INTO comments (clip_id, user_id, content)
    VALUES (clip_funny, user4, 'I cannot stop laughing')
    RETURNING id INTO top_funny;

    INSERT INTO comments (clip_id, user_id, parent_comment_id, content)
    VALUES (clip_funny, user1, top_funny, 'Peak comedy right here.')
    RETURNING id INTO reply_funny_1;

    INSERT INTO comments (clip_id, user_id, parent_comment_id, content)
    VALUES (clip_funny, user2, top_funny, 'Rewatching this on loop.')
    RETURNING id INTO reply_funny_2;

    -- Add some votes to exercise vote_score and triggers
    INSERT INTO comment_votes (user_id, comment_id, vote_type) VALUES
        (user2, top_hot, 1),
        (user3, top_hot, 1),
        (user4, top_hot, 1),
        (user1, reply_hot_1, 1),
        (user3, reply_hot_1, 1),
        (user4, reply_hot_1, -1),
        (user1, top_funny, 1),
        (user3, top_funny, 1),
        (user4, reply_funny_1, 1),
        (user1, reply_funny_2, 1);

    -- Refresh vote_score and reply_count to ensure consistent seeded state
    UPDATE comments c
    SET vote_score = COALESCE(agg.votes, 0)
    FROM (
        SELECT comment_id, SUM(vote_type) AS votes
        FROM comment_votes
        GROUP BY comment_id
    ) agg
    WHERE c.id = agg.comment_id;

    UPDATE clips SET
        comment_count = COALESCE((SELECT COUNT(*) FROM comments WHERE clip_id = clips.id), 0)
    WHERE id IN (clip_hot, clip_funny);

    RAISE NOTICE 'Nested comment seed applied';
END $$;
