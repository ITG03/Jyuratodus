This project uses a Node/Express server with a local SQLite (better-sqlite3) database under `server/data/weighbridge.db`.

Vercel doesn't support long-lived local files for serverless functions. To run the API on Vercel you have two recommended approaches:

1) Use Vercel Postgres (recommended)
   - Create a Vercel Postgres database in your Vercel dashboard (Project → Integrations → Vercel Postgres).
   - Copy the DATABASE_URL connection string into your Vercel project environment variable `DATABASE_URL` (and locally in a .env).
   - Convert the SQLite access code to use Postgres (pg) and run migrations to create tables.
   - Deploy: Vercel will build and serverless functions under `/api/*`.

2) Host the API separately (simpler, minimal changes)
   - Deploy the `server/` folder to a small Node host that allows persistent disk, e.g., Render, Railway, Fly, or a VPS.
   - Keep using the SQLite DB file in `server/data/weighbridge.db` and point your frontend to the hosted API URL.

What I added here:
- `vercel/api/health.js` — a simple serverless health endpoint to verify Vercel runs.

Recommended next steps (I can do these for you):
- If you choose Vercel Postgres I can convert `server/src/db.js` to a Postgres-backed `vercel/api/*` set of handlers using `pg` and add migrations.
- If you prefer hosting the Node server elsewhere, I can prepare a small `Dockerfile` or Render service config.

Tell me which approach to take and I'll implement the changes and provide deployment instructions.
