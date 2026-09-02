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
| `npm run admin:create -- 'login' 'password'` | Create the admin account, or reset its password |

## Admin sign-in

The login and password live in `admin_users`, not in the environment. After
`npm run db:migrate`, create the account once:

```bash
npm run admin:create -- 'your-login' 'your-password'
```

Running it again for the same login resets that password and signs out every
open session. Day to day the password is changed from the panel itself, under
Settings -> Account.

`ADMIN_SECRET` still has to be in the environment: it signs the session tokens.
It is not a credential — nobody types it — and rotating it signs every browser
out at once.

## Empty database (no tables yet)

If Neon is empty, either run `npm run db:push` once, or replace `0000_*.sql` with a full `CREATE TABLE` migration from `drizzle-kit generate` on a clean snapshot.
