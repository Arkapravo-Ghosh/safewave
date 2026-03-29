# Safewave

Next.js app with Drizzle ORM configured for PostgreSQL.

## Environment Variables

Drizzle is configured to use these values from `.env`:

- `PGHOST`
- `PGDATABASE`
- `PGUSER`
- `PGPASSWORD`
- `PGSSLMODE`
- `PGCHANNELBINDING`
- `PGPORT` (optional, defaults to `5432`)
- `AUTH_SECRET` (required for signed auth session cookies)

Generate a strong `AUTH_SECRET` value:

```bash
openssl rand -base64 32
```

## Database Setup

Generate migration files from `src/db/schema.ts`:

```bash
npm run db:generate
```

Apply generated migrations:

```bash
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## Auth and Roles

Auth is configured with:

- `bcryptjs` for password hashing
- `jose` for signed JWT session cookies (`safewave_session`)
- Route protection via `src/proxy.ts`

Supported roles:

- `user` (default on signup)
- `admin`
- `superadmin`

App routes:

- `/login`
- `/signup`
- `/dashboard` (any authenticated user)
- `/admin` (admin + superadmin)
- `/superadmin` (superadmin only)

To promote a user role in Postgres:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
UPDATE users SET role = 'superadmin' WHERE email = 'owner@example.com';
```

## Project Structure

- `drizzle.config.ts`: Drizzle Kit config for migration generation and DB credentials.
- `src/db/schema.ts`: Drizzle schema definition.
- `src/db/index.ts`: server-only Drizzle database client.

## Using the DB Client

Use `db` from server code (Server Components, Route Handlers, or Server Actions).

```ts
import { db, schema } from "@/db";

const users = await db.select().from(schema.users);
```

## Development

```bash
npm run dev
```
