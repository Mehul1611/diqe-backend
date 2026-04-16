-- model_cards table
CREATE TABLE IF NOT EXISTS model_cards (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    description TEXT,
    doc_count   INT         NOT NULL DEFAULT 0,
    status      TEXT        NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS model_cards_updated_at ON model_cards;
CREATE TRIGGER model_cards_updated_at
    BEFORE UPDATE ON model_cards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE model_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_only" ON model_cards;
CREATE POLICY "owner_only" ON model_cards
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
