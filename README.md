# Kalorist Carousel Maker

Build nutrition-education Instagram carousel posts ("this or that", "day on a
plate", hook/cover, and save/CTA slides) with AI-generated slide images.
Every calorie and protein figure shown on a slide is looked up live from the
[USDA FoodData Central](https://fdc.nal.usda.gov/) database and baked into
the image-generation prompt as a verified fact — the model is never asked to
invent nutrition numbers.

Product photography on comparison/plate slides is generated from each
slide's human-facing label, never from the raw USDA database description or
its calorie/protein figures — so the photo always matches what the label
says, even when the underlying nutrition data came from a generic
approximation (see below) rather than an exact brand match. The brand name
tag has four selectable templates (Rounded Pill, Corner Ribbon, Circle Seal,
Underline) picked in the title/brand section — each is a precise, fixed
shape so the badge renders consistently across every slide instead of being
reinterpreted differently each generation.

Slides are fully AI-generated (background, layout, and text) using Google's
Gemini image generation model (`gemini-2.5-flash-image`, aka "Nano Banana").
On-slide copy (headlines, labels, CTAs) can optionally be drafted by an AI
model of your choice — Claude, Gemini, OpenAI, or any other OpenAI-compatible
API (Groq, Mistral, a local Ollama server, etc) — picked in Settings.

## Brainstorm an entire carousel

On the main builder, "Brainstorm entire carousel" (above the slide list)
replaces manually entering every headline, food comparison, and CTA
yourself: give it a topic, attach reference images, or both — a topic isn't
required if you attach images. Both are sent to your chosen copy-provider
model (if it supports vision) and it drafts the whole carousel in one shot,
inferring the post FORMAT — "this or that" comparisons vs. a "day on a
plate" grid — from what you gave it.

Attaching reference image(s) from an earlier post treats them as "Part 1" of
the series: the model infers the topic, tone, and format from the images and
brainstorms "Part 2" — a genuinely new next installment in the same style,
not a repeat of what's shown. The "Number of comparisons / plate sections"
field controls how many comparisons (this-or-that) or sections (day-on-a-
plate) it generates. The model only proposes *which* real foods to use —
every calorie number it uses still comes from a live USDA FoodData Central
search, never from the model itself. Review/edit the result like any other
slide before generating images.

**Target audience region** (optional) steers the brainstorm toward brands and
dishes actually relevant to that audience — e.g. set it to "Pakistan" to get
local restaurant chains and regional dishes instead of default American fast
food. Since USDA FoodData Central is US-centric and often won't carry a
specific local brand or dish by name, every food the model proposes also
comes with a plain generic fallback (e.g. "rice and lentils" for a specific
regional dish); if the exact item isn't found, the app automatically uses the
generic fallback's real USDA numbers instead of leaving the slide empty. Any
food resolved this way is clearly marked with a "≈" on its chip (hover for
"Approximate — closest generic match found, not the exact item") — the
number is still a real, verified USDA figure, just for a close equivalent
rather than the exact requested item.

## Use your own photo as the Cover/CTA background

The Cover and Closing/CTA slide editors have an optional "Background photo"
upload. Attach a real photo and it's used EXACTLY as the slide's background
(only light crop/contrast touch-ups for legibility and portrait framing) —
Gemini composes the headline badge and brand badge on top of it instead of
imagining a scene from a text prompt. The "Background scene" text field is
disabled and ignored while a photo is attached; remove the photo to go back
to an AI-imagined background.

## Recreate from your own photos

At `/recreate` (linked from the main builder) is an alternate flow for when
you want to use your *own* photos instead of a fully AI-imagined scene: pick
"Photo + Caption", "This or That", or "Day on a Plate", upload the relevant
photo(s), and the AI composes them into the same badge/pill/typography
layout as the main builder — the photo itself is used as-is, not
regenerated. Nutrition numbers still come from the same real USDA
FoodData Central search. Uses the same API keys as the main page (shared
via the same settings).

## How it works

0. On first visit you're asked to **sign up**, **log in**, or **continue as
   guest**. Guest mode is fully functional and permanent (remembered in this
   browser) — it just skips server-side sync, so keys/carousels stay in
   `localStorage` only. You can sign up later without losing anything already
   in the browser. If Neon Auth/Stack Auth is unreachable (misconfigured
   keys, an outage), the sign-in/sign-up form degrades to a "temporarily
   unavailable" message instead of taking down the page — "Continue as
   guest" always stays clickable.
1. Every carousel has a fixed **Cover** slide, a fixed **Closing/CTA** slide,
   and a variable middle of **content slides** ("This or That" comparisons or
   "Day on a Plate" grids; more content types will be added later) that you
   can add, remove, and reorder freely.
2. For food slides, search and pick real foods from USDA FoodData Central —
   the app computes calorie/protein totals from your picks and composes a
   detailed prompt (see `src/lib/promptBuilder.ts`) that tells Gemini exactly
   what numbers and text to render.
3. Optionally click "Draft with…" on a headline, CTA, or label field to have
   your chosen copywriting model write punchy copy from a rough idea. Pick
   the provider (Claude / Gemini / OpenAI / Other) under **Settings →
   Copywriting / brainstorming model** — this is independent of image
   generation, which always uses Gemini.
4. Clicking "Generate slide" calls Gemini's image generation API and shows
   the finished slide, ready to download as PNG (or all slides as a ZIP).

## Bring your own API keys

- **Gemini API key** (required) — generates the slide images. Get one at
  [Google AI Studio](https://aistudio.google.com/apikey).
- **USDA FoodData Central API key** (optional) — powers food search. Without
  one, searches fall back to USDA's shared `DEMO_KEY`, which works but is
  rate-limited. Get a free key at
  [api.data.gov/signup](https://api.data.gov/signup/).
- **A copywriting model** (optional) — powers the "Draft with…" copy assist.
  Pick one provider in Settings:
  - **Claude** — get a key at
    [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
    Standard pay-per-token API access — a Claude.ai or Claude Code
    *subscription* is a separate product and can't be used as an API key here.
  - **Gemini** — reuses the Gemini API key above, just pick a text model
    (e.g. `gemini-2.5-flash`) instead of the image one.
  - **OpenAI** — get a key at
    [platform.openai.com/api-keys](https://platform.openai.com/api-keys).
  - **Other** — any OpenAI-compatible chat completions API: Groq, Mistral,
    Together, a local Ollama server, etc. Enter its base URL, key, and model
    name directly.

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

- Identity/sign-in is handled by **Neon Auth**, using Neon's
  [Managed Better Auth](https://neon.com/docs/auth/overview) — enable it in
  the Neon Console for your project (**Project → Auth tab → Enable**), then
  copy the **Auth URL** from the Configuration tab into `NEON_AUTH_BASE_URL`.
  Generate `NEON_AUTH_COOKIE_SECRET` yourself with `openssl rand -base64 32`
  (see `.env.example`).
  - Note: Neon's older Stack Auth-based "legacy Neon Auth" product is closed
    to new projects — Managed Better Auth is the current replacement, and
    what this app is built against. If your project still shows the old
    Stack Auth-style keys instead of an Auth URL/JWKS URL, look for a
    "Configuration" section or an option to switch to the native/managed
    Auth product.
  - **Google** sign-in needs to be turned on once under **Auth methods** in
    the Neon Auth dashboard (shared dev OAuth keys, no extra setup).
  - **Apple** sign-in requires your own Apple Developer Program account
    (Services ID, Team ID, Key ID, private key), configured in the same
    dashboard under **Auth methods → Apple**. This is an Apple platform
    requirement — no auth provider can bypass it. Once enabled there, add
    `"apple"` to the `social.providers` array in `src/app/providers.tsx` so
    the button renders.
  - Email/password sign-in is also available out of the box.
- ⚠️ **Build-time requirement**: like the previous auth provider, this one
  is also validated when the app boots — `next build` (and therefore a
  Vercel deploy) will **fail outright** if `NEON_AUTH_COOKIE_SECRET` is
  missing or under 32 characters. Add it (and `NEON_AUTH_BASE_URL`) before
  deploying.
- ⚠️ This app currently depends on **beta** packages
  (`@neondatabase/auth`, `@neondatabase/auth-ui`) — Neon's Managed Better
  Auth is a new product, so expect some rough edges and API churn.
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
(`openssl rand -base64 32`) and `NEON_AUTH_BASE_URL` /
`NEON_AUTH_COOKIE_SECRET` from Neon Auth (Project → Auth tab → Enable, in
the Neon Console). The `user_settings`/`carousels` schema is created
automatically on first request — no separate migration step. Without
`DATABASE_URL`/`ENCRYPTION_KEY` set, the app still works fully in
signed-out (BYOK) mode; accounts just won't be available. The
`NEON_AUTH_*` vars, however, are required for the app to even build once
Neon Auth is wired in — see the build-time warning above.

## Project structure

- `src/app/api/usda/search` — proxies USDA FoodData Central food search.
- `src/app/api/gemini/{generate,generate-copy,models}` — proxies Gemini image
  generation, Gemini text (copy) generation, and model listing for both.
- `src/app/api/claude/{generate-copy,models}`,
  `src/app/api/openai/{generate-copy,models}`,
  `src/app/api/custom/generate-copy` — proxy copy generation (and model
  listing, where the provider supports discovery) for Claude, OpenAI, and any
  other OpenAI-compatible provider respectively.
- `src/lib/copyProvider.ts` — dispatches copy-drafting to whichever provider
  is selected in Settings.
- `src/app/api/settings`, `src/app/api/carousels/*` — encrypted settings and
  saved carousels, gated on the signed-in Neon Auth user.
- `src/app/api/auth/[...path]` — proxies auth requests to Neon's Managed
  Better Auth server.
- `src/app/auth/[path]` — hosted auth pages (OAuth callback, password
  reset, etc). Most users never see this directly — the in-app Account
  panel and welcome gate embed sign-in/sign-up inline.
- `src/lib/auth/server.ts`, `src/lib/auth/client.ts` — Neon Auth (Managed
  Better Auth) server and client instances.
- `src/app/providers.tsx` — wraps the app in `NeonAuthUIProvider`.
- `src/lib/nutrition.ts` — normalizes raw USDA results into calories/protein.
- `src/lib/promptBuilder.ts` — turns slide data + USDA figures into an image
  generation prompt per slide template.
- `src/lib/copyAssist.ts` — builds the copywriting prompts (provider-agnostic).
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

**`NEON_AUTH_COOKIE_SECRET` is required for the app to build at all**
(Neon Auth wraps the whole app in the root layout, so it's no longer
optional infrastructure the way `DATABASE_URL`/`ENCRYPTION_KEY` are, and
`createNeonAuth()` throws synchronously if the cookie secret is missing or
under 32 characters). Set all four variables — `DATABASE_URL`,
`ENCRYPTION_KEY`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` — before
deploying.
