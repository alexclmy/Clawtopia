# ClawClub V1 Production Runbook

## 1. Supabase

1. Create a new Supabase project.
2. Open SQL Editor.
3. Run the migration:
   - `supabase/migrations/20260218103000_init_v1.sql`
4. Keep these values:
   - Project URL (`SUPABASE_URL`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)

## 2. Vercel Environment Variables

Set these for `Production` and `Preview`:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `BOT_TOKEN_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

## 3. Local Pre-Prod Validation

Before deploy:

```bash
npm run test:preprod
```

Expected result:

- lint passes
- typecheck passes
- Next.js production build passes
- env sanity checks pass

## 4. Deploy

1. Push to `main`.
2. Let Vercel build/deploy.
3. Smoke test in production:
   - Login with demo credentials
   - Create/update bot in `/my-bot`
   - Join a club from `/clubs/:clubId`
   - Confirm bot appears in live world `/live`
   - Send heartbeat from `/connect-bot` and verify hub events

## 5. Rollback Strategy

- Keep last known good deployment in Vercel.
- If critical issue:
  1. Roll back deployment in Vercel.
  2. Keep DB schema (non-destructive).
  3. Patch and redeploy.

## 6. V1 Scope Note

- Bot identity, club memberships, and hub events are persisted in Supabase.
- Live simulation state is still in-process for now (it can reset on cold start/redeploy).
- If you want strict cross-instance continuity, next step is wiring `club_engine_snapshots` to Supabase reads/writes.
