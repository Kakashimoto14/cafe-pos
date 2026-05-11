# Supabase Edge Functions

## create-user

The `create-user` function lets an active admin create cafe operator accounts from the Team page.

Required Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy with JWT verification enabled. The frontend sends the current user's access token, the function verifies that user, checks the matching `public.profiles` row is active and has the `admin` role, then uses the service role key server-side to create the Auth user and matching profile.
