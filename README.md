# Kalorist Carousel Maker

Build nutrition-education Instagram carousel posts ("this or that", "day on a
plate", hook/cover, and save/CTA slides) with AI-generated slide images.
Every calorie and protein figure shown on a slide is looked up live from the
[USDA FoodData Central](https://fdc.nal.usda.gov/) database and baked into
the image-generation prompt as a verified fact — the model is never asked to
invent nutrition numbers.

Slides are fully AI-generated (background, layout, and text) using Google's
Gemini image generation model (`gemini-2.5-flash-image`, aka "Nano Banana").
Claude (via a real Anthropic API key) can optionally draft the on-slide copy.

## How it works

1. Every carousel has a fixed **Cover** slide, a fixed **Closing/CTA** slide,
   and a variable middle of **content slides** (today: "This or That"; more
   content types will be added later) that you can add, remove, and reorder
   freely.
2. For food slides, search and pick real foods from USDA FoodData Central —
   the app computes calorie/protein totals from your picks and composes a
   detailed prompt (see `src/lib/promptBuilder.ts`) that tells Gemini exactly
   what numbers and text to render.
3. Optionally click "Draft with Claude" on a headline, CTA, or label field to
   have Claude write punchy copy from a rough idea.
4. Clicking "Generate slide" calls Gemini's image generation API and shows
   the finished slide, ready to download as PNG (or all slides as a ZIP).

## Bring your own API keys

- **Gemini API key** (required) — generates the slide images. Get one at
  [Google AI Studio](https://aistudio.google.com/apikey).
- **USDA FoodData Central API key** (optional) — powers food search. Without
  one, searches fall back to USDA's shared `DEMO_KEY`, which works but is
  rate-limited. Get a free key at
  [api.data.gov/signup](https://api.data.gov/signup/).
- **Anthropic API key** (optional) — powers the "Draft with Claude" copy
  assist. Get one at
  [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
  This is standard pay-per-token API access — a Claude.ai or Claude Code
  *subscription* is a separate product and can't be used as an API key here.

Every key is entered in the in-app Settings panel and sent directly to this
app's own API routes on each request — the routes are stateless proxies and
never write a key to a server-side file or a database on their own.

### Signed-out (default): browser-only

If you don't create an account, keys and carousels live only in this
browser's `localStorage`. Nothing is sent anywhere except the AI providers
you're calling.

### Signed-in (optional): synced account

Signing in (Google, or email/password) additionally saves your keys and
carousels to a Postgres database ([Neon](https://neon.tech) is the intended
provider — serverless Postgres with a free tier), so they follow you across
devices/browsers:

- Identity/sign-in is handled by **Neon Auth** (built on
  [Stack Auth](https://stack-auth.com)) — enable it in the Neon Console for
  your project (**Project → Auth tab → Enable**), which provisions
  `NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`,
  and `STACK_SECRET_SERVER_KEY` for you automatically — copy them into your
  environment (see `.env.example`).
  - **Google** sign-in works immediately — Stack Auth provides shared dev
    OAuth keys, no setup required to test.
  - **Apple** sign-in requires your own Apple Developer Program account
    (Services ID, Team ID, Key ID, private key), configured in the Neon
    Auth / Stack Auth dashboard under **Auth methods → OAuth providers →
    Apple**. This is an Apple platform requirement — no auth provider can
    bypass it. Once enabled there, the Apple button appears automatically;
    no code change needed.
  - Email/password sign-in is also available out of the box.
- ⚠️ **Build-time requirement**: unlike the other env vars, the three
  `STACK_*` variables are validated when the app boots — `next build` (and
  therefore a Vercel deploy) will **fail outright**, not just misbehave at
  runtime, if they're missing or malformed. Add them before deploying this
  version.
- API keys (Gemini/USDA/Anthropic) are still encrypted at rest with
  AES-256-GCM using the `ENCRYPTION_KEY` environment variable (generate one
  with `openssl rand -base64 32`) — Neon Auth only replaces the identity
  layer, not this encryption.
- Saved carousels (including generated slide images) are stored per-account
  and only ever readable by that account.
- Uses `@neondatabase/serverless`'s HTTP driver for `user_settings`/
  `carousels` — no persistent connection pool to manage, so this works on
  serverless platforms (Vercel included), unlike a typical file-based
  database.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), open **Settings**, and
paste in your Gemini API key (and optionally USDA/Anthropic keys). Then add
slides and start generating.

Accounts need a Postgres database first:

```bash
npx neonctl@latest init   # creates a free Neon project, prints a connection string
```

Copy that connection string into `DATABASE_URL` in `.env.local` (copy
`.env.example` to start), along with an `ENCRYPTION_KEY`
(`openssl rand -base64 32`) and the three `NEXT_PUBLIC_STACK_*` /
`STACK_SECRET_SERVER_KEY` values from Neon Auth (Project → Auth tab →
Enable, in the Neon Console). The `user_settings`/`carousels` schema is
created automatically on first request — no separate migration step.
Without `DATABASE_URL`/`ENCRYPTION_KEY` set, the app still works fully in
signed-out (BYOK) mode; accounts just won't be available. The `STACK_*`
vars, however, are required for the app to even build once Neon Auth is
wired in — see the build-time warning above.

## Project structure

- `src/app/api/usda/search` — proxies USDA FoodData Central food search.
- `src/app/api/gemini/{generate,models}` — proxies Gemini image generation
  and model listing.
- `src/app/api/claude/{generate-copy,models}` — proxies Claude copy
  generation and model listing.
- `src/app/api/settings`, `src/app/api/carousels/*` — encrypted settings and
  saved carousels, gated on the signed-in Neon Auth user.
- `src/app/handler/[...stack]` — Neon Auth's hosted pages (OAuth callback,
  account settings, password reset). Most users never see this directly —
  the in-app Account panel embeds sign-in/sign-up inline.
- `src/stack.ts` — Neon Auth (Stack Auth) server app config.
- `src/lib/nutrition.ts` — normalizes raw USDA results into calories/protein.
- `src/lib/promptBuilder.ts` — turns slide data + USDA figures into an image
  generation prompt per slide template.
- `src/lib/copyAssist.ts` — builds the Claude copywriting prompts.
- `src/lib/server/` — Postgres access (`db.ts`) and AES-256-GCM encryption
  helpers (server-only).
- `src/components/` — carousel builder UI, slide editors, USDA food picker,
  auth panel.

## Deploying

This is a standard Next.js app and deploys anywhere Next.js runs, including
serverless platforms like Vercel.

```bash
npm run build
npm run start
```

**The three `STACK_*` variables are required for the app to build at all**
(Neon Auth wraps the whole app in the root layout, so it's no longer
optional infrastructure the way `DATABASE_URL`/`ENCRYPTION_KEY` are). Set
all five variables — `DATABASE_URL`, `ENCRYPTION_KEY`,
`NEXT_PUBLIC_STACK_PROJECT_ID`, `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`,
`STACK_SECRET_SERVER_KEY` — before deploying.
