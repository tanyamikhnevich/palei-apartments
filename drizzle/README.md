# Drizzle migrations (Neon)

Connection string lives in `.env.local` as `DATABASE_URL`.

## Apply pending migrations

```bash
npm run db:migrate
```

## After changing `src/db/schema.ts`

```bash
npm run db:generate -- --name short_description_of_change
npm run db:migrate
```

## Other commands

| Command | Use |
|---------|-----|
| `npm run db:generate` | Create SQL from schema diff |
| `npm run db:migrate` | Run pending files in `./drizzle` against Neon |
| `npm run db:push` | Sync schema without migration files (dev only) |
| `npm run db:seed` | Reset & seed demo data |
| `npm run db:studio` | Browse tables in Drizzle Studio |

## Empty database (no tables yet)

If Neon is empty, either run `npm run db:push` once, or replace `0000_*.sql` with a full `CREATE TABLE` migration from `drizzle-kit generate` on a clean snapshot.
