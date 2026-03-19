CREATE OR REPLACE FUNCTION update_user_karma(
    p_user_id UUID,
    p_amount INT,
    p_source VARCHAR(50),
    p_source_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update user's karma points
    UPDATE users
    SET karma_points = GREATEST(karma_points + p_amount, 0)
    WHERE id = p_user_id;

    -- Insert karma history record
    INSERT INTO karma_history (user_id, amount, source, source_id)
    VALUES (p_user_id, p_amount, p_source, p_source_id);
END;
$$ LANGUAGE plpgsql;
