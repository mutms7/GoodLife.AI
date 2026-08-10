# Supabase setup

1. Create a Supabase project and run the SQL migration in `migrations/`.
2. Enable email confirmations and the Google provider in Authentication.
3. Add the production `/app` URL and `goodlife://auth-callback` to the allowed redirect URLs.
4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the web host and GitHub Actions. These are public client values; never add a service-role key.

Conversation rows are hidden after seven days and deleted hourly by `pg_cron`. Model files and inference never go through Supabase.
