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

Create a private `supabase/functions/.env.local` file and add:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_SECURE=true`
- `SMTP_USER=your-email@gmail.com`
- `SMTP_PASS=your-google-app-password`
- `SMTP_FROM_NAME=Cozy Cafe POS`
- `SMTP_FROM_EMAIL=your-email@gmail.com`
- `SMTP_REPLY_TO=your-email@gmail.com`

Set the SMTP secrets with the Supabase dashboard or:

`npx supabase secrets set --env-file supabase/functions/.env.local`

Recommended deploy flow:

1. Keep real SMTP credentials in `supabase/functions/.env.local` or another private local env file that is not committed.
2. Push those values to Supabase:
   `npx supabase secrets set --env-file supabase/functions/.env.local`
3. Deploy the function with JWT verification left on:
   `npx supabase functions deploy send-receipt-email`
4. For local testing, serve the function with your private env file:
   `npx supabase functions serve send-receipt-email --env-file supabase/functions/.env.local`

Notes:

- `verify_jwt` should stay enabled for this function because it is called from signed-in staff sessions through `supabase.functions.invoke(...)`.
- The receipt renderer intentionally prefers the latest saved `business_settings` for presentation, while the order snapshot remains a fallback for older or incomplete orders.
- Gmail requires 2-Step Verification and an App Password. Do not use the normal Gmail password.
- If the browser reports a failed CORS preflight, redeploy the function and confirm the `OPTIONS` response includes `access-control-allow-origin`, `access-control-allow-headers`, and `access-control-allow-methods`.
