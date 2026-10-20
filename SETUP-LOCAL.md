# Run Deli Design Brief Hub locally (own database, real Google login)

Needs: Docker Desktop (running), Node.js 20+.

## 1. Google OAuth client (once)
1. Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > **Web application**.
2. **Authorized redirect URIs**: `http://127.0.0.1:54321/auth/v1/callback`
3. Copy the Client ID and Client secret into `supabase/.env` (copy `supabase/.env.example`).
4. If the OAuth consent screen is in "Testing", add every Google account that will sign in as a test user.

## 2. Start the local database
```bash
npm install
npx supabase start     # first run downloads images; applies supabase/migrations/* then seed.sql
```
It prints `API URL`, `anon key` and `service_role key`. Studio (DB browser): http://127.0.0.1:54323

## 3. App environment
Copy `.env.local.example` to `.env.local` and set:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key printed above>
MANAGER_EMAIL=<the Google account that signs in as Design Manager>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
`RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `NOTIFY_WEBHOOK_SECRET` are only for e-mail notifications; leave them out locally.

## 4. Run
```bash
npm run dev            # http://localhost:3000
```
Open the site with `localhost` (not 127.0.0.1) so the auth cookie and redirect match.

## Notes
- Designers must be listed in `designer_allowlist` (seed.sql has two example Gmail addresses; edit seed.sql or insert rows in Studio for real addresses).
- Reset the local DB (re-runs migrations + seed): `npx supabase db reset`. Stop: `npx supabase stop`.
- Data is local only; nothing here touches the cloud Supabase project.
