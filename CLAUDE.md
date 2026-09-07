# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # next dev --turbopack
npm run build     # Production build (next build --turbopack)
npm run start     # next start
npm run lint      # ESLint
```

No test suite is configured.

## Product

A Persian-language SaaS dashboard template (auth, wallet/finance, CMS, support tickets) based on TailAdmin's Next.js template. The original product built on this base sent bulk SMS/voice-call notifications over custom hardware; that feature (and its hardware bridge, custom `server.ts`, SMS/voice-call/API-key models and routes) has been removed, leaving the auth + wallet + CMS + admin scaffolding as a starting point for a different product.

## Stack

- **Next.js 16** App Router + **React 19** + **TypeScript**
- **MongoDB** via Mongoose — `src/lib/mongodb.ts` manages the cached connection; `src/models/` contains all schemas
- **NextAuth.js** — credentials provider with bcrypt; `src/auth.ts` + `src/auth.config.ts`; session carries `id`, `role`, `avatar`, `createdAt`
- **Tailwind CSS v4** — custom token palette in `src/app/globals.css` (`brand-{25..950}`, dark mode via `.dark` class)
- **AG Grid** (`ag-grid-react`) — used for all admin and user data tables, with custom light/dark `themeQuartz` params
- **Bilingual FA/EN** — `LanguageContext` + `useT()` hook backed by `src/i18n/translations.ts`; RTL is toggled on the `<html>` element

## Route Groups

| Group | Path | Description |
|---|---|---|
| `(public)` | `/`, `/blog`, `/news`, `/pricing`, `/faq`, `/contact`, `/privacy`, `/terms` | Marketing site, no auth required |
| `(user-dashboard)` | `/dashboard/**` | Authenticated user area |
| `(full-width-pages)` | auth pages, error pages | No sidebar |
| `admin` | `/admin/**` | Admin-only; guarded by `role === "admin"` check in every API route |

Page-level route protection (redirect anonymous users to `/signin`, non-admins away from `/admin/**`) happens in `src/proxy.ts` — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; it's picked up automatically by filename, not imported anywhere. Every API route still re-checks `session.user.role`/`session.user.id` itself (see API Structure below) since `proxy.ts` only covers page navigation, not fetch/XHR calls to `/api/**`.

## Data Models (`src/models/`)

| Model | Key fields |
|---|---|
| `User` | `firstName`, `lastName`, `email`, `password` (bcrypt), `role` (`admin`/`user`), `walletBalance`, `avatar`, `phone` |
| `Card` | User's Iranian bank card — `cardNumber`, `ownerName`, `bankName`, `userId` |
| `AdminCard` | Admin-owned bank card shown to users for deposits |
| `Deposit` | `userId`, `cardId`, `amount`, `receiptImage`, `status` (`pending`/`approved`/`rejected`), `adminNote`, `interceptionCode` |
| `BlogPost` | `slug`, `category`, `title`, `excerpt`, `sections[]` (`heading?`, `body`, `image?`), `hashtags[]`, `readTime`, `highlight`, `published` |
| `NewsItem` | `category`, `hashtags[]`, `title`, `body`, `image?`, `highlight`, `published`, `publishedAt` |
| `Announcement` | Site-wide announcements shown to users |
| `Ticket` / `ContactMessage` | User support and public contact form |
| `BlogCategory` / `NewsTag` / `SocialLink` / `Faq` / `LegalPage` | CMS content |
| `SiteSeo` | Singleton-style site metadata — `title`, `description`, `keywords[]` |

## Finance Flow

Users deposit wallet credit by:
1. Picking an `AdminCard` to transfer to
2. Uploading a bank receipt image
3. Admin approves/rejects via `/admin/(others-pages)/finance/` — on approval, `walletBalance` is incremented server-side

## Static Content

Blog posts also live as a static array in `src/data/blogPosts.ts`. The seed endpoint `POST /api/admin/blog/seed` reads from this file and inserts missing posts into MongoDB. Prefer adding new posts to `blogPosts.ts` first (so they survive a DB reset), then trigger the seed endpoint.

News items are seeded from the inline `seedData` array in `src/app/api/admin/news/seed/route.ts`. Use `category` (not `tag` — legacy field name) when adding new items.

Publishing/updating a `BlogPost`, `NewsItem`, or `Announcement` also posts a message to a Telegram channel via `src/lib/telegram.ts` (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL`, optional `TELEGRAM_PROXY` as a SOCKS agent) — see the `admin/**/notify` routes and the relevant admin `[id]`/base routes.

## API Structure

```
/api/auth/[...nextauth]   NextAuth handlers
/api/auth/register        POST — public user registration
/api/admin/**             All guarded: session.user.role === "admin"
/api/user/**              All guarded: session.user.id present
/api/public/**            Unauthenticated reads (blog, news, FAQ, pricing…)
/api/upload               Image upload (avatar, receipts, cover images)
```

## Global Contexts (`src/context/`)

- **`ThemeContext`** — light/dark, persisted to `localStorage`, `.dark` class on `<html>`
- **`LanguageContext`** — `"fa"` / `"en"`, sets `dir="rtl"` / `dir="ltr"` on `<html>`; use `useT()` for all UI strings
- **`SidebarContext`** / **`UserSidebarContext`** — collapsed/expanded state for admin and user sidebars

## Adding New Pages

- Public page → `src/app/(public)/your-page/page.tsx`
- User dashboard page → `src/app/(user-dashboard)/dashboard/your-page/page.tsx`
- Admin page → `src/app/admin/(others-pages)/your-page/page.tsx` + add to `AppSidebar.tsx` nav items

## Styling

SVGs are imported as React components via `@svgr/webpack`. All SVG icons are barrel-exported from `src/icons/index.tsx`.
