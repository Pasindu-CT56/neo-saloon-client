<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project

Backend API for Leo Saloon built with Next.js 16 App Router route handlers, Prisma 7 and PostgreSQL, Zod 4, and `jose` JWTs. The UI in `app/page.tsx` is still the create-next-app placeholder; current work is in `app/api/`. The appointment handler is a stub, and `app/api/users/password/route.ts` is empty.

## Commands

- `npm run dev`, `npm run build`, and `npm run start` are the configured app scripts. No lint or test scripts/test runner are configured.
- Prisma CLI config is `prisma7.config.ts` (it loads `.env` via `dotenv/config`); pass `--config prisma7.config.ts` to Prisma commands. The Prisma schema's datasource block has no URL.
- `npx prisma migrate dev --config prisma7.config.ts --name <name>` creates and applies a development migration after editing `prisma/schema.prisma`.
- `npx prisma migrate deploy --config prisma7.config.ts` applies committed migrations in a deployment.
- `npx prisma generate --config prisma7.config.ts` generates the client into `app/generated/prisma`. This output is gitignored; generate after a fresh clone or schema change before using its imports.
- `npx prisma db seed --config prisma7.config.ts` runs `tsx prisma/seed.ts` and creates the admin user. The seed uses `create`, so it is not safe to rerun against a database that already has that email.

**Environment:** `DATABASE_URL` is the PostgreSQL connection string. `JOSE_SECRET` signs and verifies JWTs. The login route uses `JOSE_SECRET` directly, while `getUser` currently has a hard-coded fallback; configure a strong non-empty secret and do not rely on the fallback.

## Architecture

- **Prisma client:** Always import the shared singleton `prisma` from `@/lib/prisma`. It uses the `@prisma/adapter-pg` driver adapter, required by this Prisma 7 setup. Import generated client types from `@/app/generated/prisma/client` and enums from `@/app/generated/prisma/enums`, not from `@prisma/client`.
- **Authentication:** `POST /api/auth` checks the bcrypt password and sets an httpOnly `login-token` cookie containing an HS256 JWT with the `RequestUserType` claims from `types/requestUser.ts`, including privileges. The cookie currently lasts seven days; the JWT has no explicit expiry claim. Since privileges are embedded in the token and `getUser` does not reload the user, privilege changes take effect only after a new token is issued (currently by logging in again).
- **Authorization:** `getUser(request)` verifies the cookie JWT and returns `null` if verification fails. `isPrivileged(request, "resource:action")` checks the token's `privileges` array. Authorization is privilege-based, not role-based.
- **Strict authorization rule:** No matter how a requirement is worded (for example, “only admins can…”), never gate access on `User.role`. Map it to a named `resource:action` privilege and check it with `isPrivileged`, so the privilege can be granted explicitly.
- **Current privilege names:** User listing checks `users:read`; editing another user's account checks `users:edit`. Product collection handlers use `products:read`, `products:add`, `products:edit`, and `products:delete`. The detail handler currently checks singular `product:read` for inactive products. Keep privilege names aligned between routes and issued token claims; resolve this singular/plural inconsistency deliberately when changing the API.
- **Route handlers:** Use one `route.ts` per resource and export HTTP method handlers. Current item IDs use the `?id=` query parameter rather than dynamic `[id]` segments (for example, `app/api/products/byId/route.ts`). Use `NextRequest`/`NextResponse` and `request.nextUrl.searchParams` for query parameters.
- **Validation and responses:** Validate JSON bodies with Zod DTO schemas in `types/dto/`; return `400` for `z.ZodError`, using `error.issues[0]?.message` when present. Use `NextResponse.json({ message, ... }, { status })`. Return `401` for missing/invalid authentication and `403` for a missing privilege. Existing endpoints have response-shape inconsistencies: user lists use `data`, product lists use `products`, and product detail returns a raw object (with string error bodies). Preserve or intentionally standardize contracts when changing routes.
- **Pagination:** `getPaginationInfo(request)` in `utils/pageInfoRetrieval.ts` reads `pageNumber`/`pageSize` (defaults `1`/`10`) and list handlers use Prisma `skip`/`take`. Successful user and product list responses include `{ pageNumber, pageSize, totalPages, totalCount }` under `pagination`. The helper does not validate non-numeric, zero, negative, or oversized values; validate these when changing pagination. The user list rejects pages beyond the end, while the product list returns an empty page.
- **Products:** Deletion is a soft delete (`status = DELETED`); deleted products should remain hidden. The collection route returns only `ACTIVE` products publicly and all non-deleted statuses to holders of `products:read`. The detail route currently checks `product:read` (singular) to expose `INACTIVE` products. A non-empty `media` array in a product update replaces the existing `Media` rows; an empty array currently leaves them unchanged.
- **Models:** `User.role` and `User.status` are strings; status defaults to `ACTIVE` and the schema lists `INACTIVE` and `SUSPENDED` as other values. Login rejects non-`ACTIVE` users. `Product.status` (`ACTIVE`, `INACTIVE`, `DELETED`) and `Media.type` (`IMAGE`, `VIDEO`) are Prisma enums. Product media is a one-to-many relation. Never return a user's password hash.
