# mqttcloud.ir

Persian-language (fa/en, RTL-aware) SaaS dashboard for **mqttcloud.ir** — auth,
wallet/finance, a CMS (blog/news/FAQ/legal pages), support tickets, and an
MQTT credentials/clients/activity dashboard for provisioning and monitoring
devices on the companion MQTT broker.

Built on top of [TailAdmin](https://tailadmin.com)'s free Next.js admin
dashboard template. The original template's bulk SMS/voice-call notification
feature (and its custom hardware bridge) has been removed, leaving the
auth + wallet + CMS + admin scaffolding as the base for this product.

## Stack

* **Next.js 16** App Router + **React 19** + **TypeScript**
* **MongoDB** via Mongoose (`src/lib/mongodb.ts`, schemas in `src/models/`)
* **NextAuth.js** (credentials + bcrypt) — session carries `id`, `role`, `avatar`, `createdAt`
* **Tailwind CSS v4** with a custom token palette (`src/app/globals.css`)
* **AG Grid** for admin/user data tables
* Bilingual FA/EN via `LanguageContext` + `useT()` (`src/i18n/translations.ts`), RTL-aware

## Route Groups

| Group | Path | Description |
|---|---|---|
| `(public)` | `/`, `/blog`, `/news`, `/pricing`, `/faq`, `/contact`, `/privacy`, `/terms` | Marketing site, no auth |
| `(user-dashboard)` | `/dashboard/**` | Authenticated user area |
| `(full-width-pages)` | auth pages, error pages | No sidebar |
| `admin` | `/admin/**` | Admin-only, guarded by `role === "admin"` |

Page-level route protection lives in `src/proxy.ts` (Next.js 16's rename of
`middleware.ts`); every API route additionally re-checks the session itself
since `proxy.ts` only covers page navigation.

## MQTT

This repo is the dashboard half of the MQTT service — users create MQTT
credentials (`MqttUser`) and register devices (`MqttClient`) here, and view
live connection activity and message payloads. The actual MQTT protocol
broker (Aedes, TCP/TLS on 1883/8883) is a separate deployable that reads and
writes the same MongoDB collections: see the sibling `broker-service` repo.

## Finance Flow

Users top up their wallet by picking an admin-owned bank card (`AdminCard`),
uploading a receipt image, and waiting for admin approval
(`/admin/(others-pages)/finance/`) — approval increments `walletBalance`
server-side.

## Getting Started

### Prerequisites

* Node.js 20.x or later
* A MongoDB instance

### Install & run

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev       # next dev --turbopack
npm run build     # production build
npm run start     # next start
npm run lint      # ESLint
```

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Mongo connection string, shared with `broker-service` |
| `NEXTAUTH_URL` | Public base URL used by NextAuth |
| `NEXTAUTH_SECRET` | NextAuth session signing secret |
| `SOCKET_SHARED_SECRET` | Must match `broker-service`'s value — signs the short-lived token minted at `/api/user/mqtt/socket-token` for the live activity Socket.IO channel |
| `NEXT_PUBLIC_SOCKET_URL` | Public URL of `broker-service`'s Socket.IO endpoint |
| `NEXT_PUBLIC_MQTT_HOST` | Broker hostname shown to users (default `mqtt.mqttcloud.ir`) |
| `NEXT_PUBLIC_MQTT_PORT_TCP` / `NEXT_PUBLIC_MQTT_PORT_TLS` | Broker ports shown to users (default `1883` / `8883`) |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL` | Telegram channel notifications on blog/news/announcement publish (`src/lib/telegram.ts`) |
| `TELEGRAM_PROXY` | Optional SOCKS proxy for the Telegram client |

No test suite is configured.

## Data Models

See `src/models/` — `User`, `Card`, `AdminCard`, `Deposit`, `BlogPost`,
`NewsItem`, `Announcement`, `Ticket`, `ContactMessage`, `BlogCategory`,
`NewsTag`, `SocialLink`, `Faq`, `LegalPage`, `SiteSeo`, plus the MQTT models
`MqttUser`, `MqttClient`, `MqttActivity`, `MqttPayload`.

## API Structure

```
/api/auth/[...nextauth]   NextAuth handlers
/api/auth/register        POST — public user registration
/api/admin/**             All guarded: session.user.role === "admin"
/api/user/**              All guarded: session.user.id present
/api/public/**            Unauthenticated reads (blog, news, FAQ, pricing…)
/api/upload               Image upload (avatar, receipts, cover images)
```

## Credits

Built on [TailAdmin Next.js](https://github.com/TailAdmin/free-nextjs-admin-dashboard)
(MIT licensed) — see `LICENSE`.
