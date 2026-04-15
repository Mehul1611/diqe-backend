-- ============================================================
--  002_admin_monitoring.sql
--  Run this in the Supabase SQL Editor (requires service role).
--  Creates two admin views + a login-attempts tracking table.
-- ============================================================


-- ────────────────────────────────────────────────────────────
--  TABLE 1 EQUIVALENT: v_registered_users
--  Shows every registered account with live model/doc stats.
--  View this in: Supabase Dashboard → Table Editor → Views
--  or: SELECT * FROM public.v_registered_users ORDER BY created_at DESC;
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_registered_users AS
SELECT
    u.id                                                  AS user_id,
    u.email,
    u.email_confirmed_at IS NOT NULL                      AS email_verified,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.created_at                                          AS registered_at,
    COALESCE(s.model_count, 0)                            AS model_count,
    COALESCE(s.total_docs,  0)                            AS total_docs,
    s.last_model_activity,
    CASE
        WHEN u.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN u.last_sign_in_at > NOW() - INTERVAL '30 days' THEN 'idle'
        ELSE 'inactive'
    END                                                   AS activity_status,
    -- raw_user_meta_data can hold provider info (google, github, etc.)
    u.raw_app_meta_data->>'provider'                      AS auth_provider
FROM auth.users u
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*)          AS model_count,
        SUM(doc_count)    AS total_docs,
        MAX(updated_at)   AS last_model_activity
    FROM public.model_cards
    GROUP BY user_id
) s ON s.user_id = u.id;


-- ────────────────────────────────────────────────────────────
--  TABLE 2: login_attempts
--  Custom table written to by the backend on every auth event.
--  Gives you a queryable history of logins, failures, and
--  email-verification attempts with IP and user-agent context.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT        NOT NULL,
    user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    event       TEXT        NOT NULL,   -- 'login_success' | 'login_failure' | 'signup' | 'email_verify' | 'password_reset'
    success     BOOLEAN     NOT NULL DEFAULT FALSE,
    ip_address  TEXT,
    user_agent  TEXT,
    error_msg   TEXT,                   -- filled on failure
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_idx     ON public.login_attempts (email);
CREATE INDEX IF NOT EXISTS login_attempts_user_id_idx   ON public.login_attempts (user_id);
CREATE INDEX IF NOT EXISTS login_attempts_created_at_idx ON public.login_attempts (created_at DESC);

-- Only service role can insert/read; no public access
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.login_attempts;
CREATE POLICY "service_role_only" ON public.login_attempts
    FOR ALL USING (FALSE);


-- ────────────────────────────────────────────────────────────
--  BONUS VIEW: v_auth_events (built-in Supabase audit log)
--  Supabase already logs everything in auth.audit_log_entries.
--  This view surfaces it cleanly.
--  Query: SELECT * FROM public.v_auth_events ORDER BY created_at DESC LIMIT 100;
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_auth_events AS
SELECT
    id,
    created_at,
    ip_address,
    payload->>'action'              AS action,
    payload->'actor'->>'email'      AS email,
    payload->'actor'->>'id'         AS user_id,
    payload->'traits'->>'email'     AS signup_email,  -- present on signup events
    payload->>'log_type'            AS log_type        -- 'account', 'token', etc.
FROM auth.audit_log_entries
WHERE payload IS NOT NULL;
