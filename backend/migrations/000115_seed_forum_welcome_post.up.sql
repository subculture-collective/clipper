-- Seed a pinned welcome thread for the forum
-- Uses a system/admin user if one exists, otherwise the first admin user
DO $$
DECLARE
    admin_id UUID;
    thread_id UUID;
BEGIN
    -- Find an admin user to attribute the post to
    SELECT id INTO admin_id FROM users WHERE role = 'admin' LIMIT 1;

    -- If no admin exists, skip
    IF admin_id IS NULL THEN
        RAISE NOTICE 'No admin user found, skipping forum welcome post';
        RETURN;
    END IF;

    thread_id := gen_random_uuid();

    INSERT INTO forum_threads (id, title, content, author_id, pinned, locked, created_at, updated_at)
    VALUES (
        thread_id,
        'Welcome to the clpr Forum!',
        E'## Welcome to the clpr community forum! 👋\n\nThis is your space to discuss clips, share ideas, and connect with the community.\n\n### What you can do here\n\n- **Discussion** — Talk about clips, streamers, and the Twitch ecosystem\n- **Help** — Ask questions and get help from the community\n- **Suggestions** — Share your ideas for improving clpr\n- **Bug Reports** — Found something broken? Let us know\n- **Feature Requests** — Tell us what you''d love to see next\n- **News** — Stay up to date with platform updates\n- **Clip Highlights** — Share and discuss amazing clips\n\n### Quick links\n\n- [Browse Clips](/) — Discover trending clips on the home feed\n- [Discovery Lists](/discover/lists) — Curated collections worth watching\n- [Leaderboard](/leaderboard) — Top contributors and streamers\n- [My Queue](/queue) — Your saved clips to watch later\n- [Submit a Clip](/submit) — Share a clip with the community\n\n### Community guidelines\n\n- Be respectful and constructive\n- Stay on topic — use the right topic tag when creating threads\n- No spam, self-promotion, or harassment\n- Report content that violates these guidelines\n\nWe''re glad you''re here. Start a discussion or jump into an existing one!',
        admin_id,
        true,  -- pinned
        false, -- not locked
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Add the "meta" tag to the welcome thread
    -- (tags are stored as part of the thread data, handled by the application layer)
END $$;
