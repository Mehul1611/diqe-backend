-- chat_sessions + chat_messages for per-model console history

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_id        UUID        NOT NULL REFERENCES public.model_cards(id) ON DELETE CASCADE,
    title           TEXT        NOT NULL DEFAULT 'New chat',
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_model_idx ON public.chat_sessions (user_id, model_id);
CREATE INDEX IF NOT EXISTS chat_sessions_last_message_idx ON public.chat_sessions (last_message_at DESC);

DROP TRIGGER IF EXISTS chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_only" ON public.chat_sessions;
CREATE POLICY "owner_only" ON public.chat_sessions
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.chat_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID        NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_created_idx ON public.chat_messages (session_id, created_at ASC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_only" ON public.chat_messages;
CREATE POLICY "owner_only" ON public.chat_messages
    FOR ALL
    USING (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.chat_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1
            FROM public.chat_sessions s
            WHERE s.id = session_id AND s.user_id = auth.uid()
        )
    );

