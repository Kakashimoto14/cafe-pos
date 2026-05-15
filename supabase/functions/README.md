# Supabase Edge Functions

## create-user

The `create-user` function lets an active admin create cafe operator accounts from the Team page.

Required Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Deploy with JWT verification enabled. The frontend sends the current user's access token, the function verifies that user, checks the matching `public.profiles` row is active and has the `admin` role, then uses the service role key server-side to create the Auth user and matching profile.

## send-receipt-email

The `send-receipt-email` function lets active staff send a completed order receipt through SMTP without exposing mail credentials to the browser.

Required Supabase secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Required SMTP secrets:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM_NAME`
- `SMTP_FROM_EMAIL`
- `SMTP_REPLY_TO` (optional but recommended)

Deploy with JWT verification enabled. The frontend sends the current user's access token, the function verifies the caller, checks the matching `public.profiles` row is active and has an `admin`, `manager`, or `cashier` role, then loads the order, merges the receipt snapshot with the latest `business_settings`, renders the receipt server-side, and sends it through SMTP.

Set the SMTP secrets with the Supabase dashboard or `supabase secrets set --env-file .env.example` after replacing the placeholder values with real server-side credentials.

Recommended deploy flow:

1. Replace the placeholder values in the repo-root `.env.example` with real SMTP credentials in a private local env file that is not committed.
2. Push those values to Supabase:
   `supabase secrets set --env-file <your-private-env-file>`
3. Deploy the function with JWT verification left on:
   `supabase functions deploy send-receipt-email`
4. For local testing, serve the function with your private env file:
   `supabase functions serve send-receipt-email --env-file <your-private-env-file>`

Notes:

- `verify_jwt` should stay enabled for this function because it is called from signed-in staff sessions through `supabase.functions.invoke(...)`.
- The receipt renderer intentionally prefers the latest saved `business_settings` for presentation, while the order snapshot remains a fallback for older or incomplete orders.
