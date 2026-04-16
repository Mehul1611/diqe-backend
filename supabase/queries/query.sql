--------------------------------
All registered users + their data
--------------------------------
SELECT * FROM v_registered_users ORDER BY registered_at DESC


--------------------------------
Only active users
SELECT * FROM v_registered_users WHERE activity_status = 'active'
--------------------------------


Unverified emails   
--------------------------------
SELECT * FROM v_registered_users WHERE email_verified = false
--------------------------------


All login attempts
--------------------------------
SELECT * FROM login_attempts ORDER BY created_at DESC
--------------------------------


Failed logins only
--------------------------------
SELECT * FROM login_attempts WHERE success = false
--------------------------------


Supabase audit trail
--------------------------------
SELECT * FROM v_auth_events ORDER BY created_at DESC LIMIT 100
--------------------------------