-- Make chat tables easier to write from the frontend (no need to pass user_id)

ALTER TABLE public.chat_sessions
    ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.chat_messages
    ALTER COLUMN user_id SET DEFAULT auth.uid();

