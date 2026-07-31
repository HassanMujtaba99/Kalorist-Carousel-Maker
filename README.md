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

Creating an account (email + password) additionally saves your keys and
carousels to a small server-side SQLite database, so they follow you across
devices/browsers:

- Passwords are hashed with bcrypt; sessions use a random-token httpOnly
  cookie.
- API keys are encrypted at rest with AES-256-GCM using the `ENCRYPTION_KEY`
  environment variable (see `.env.example` — generate one with
  `openssl rand -base64 32`).
- Saved carousels (including generated slide images) are stored per-account
  and only ever readable by that account.

**Deployment note:** the accounts feature uses file-based SQLite
(`better-sqlite3`), which needs a persistent, writable filesystem. That's
fine for self-hosting (Docker, a VPS, PM2, Railway, Fly.io) but **not** for
stateless serverless platforms like Vercel, where local disk is ephemeral —
point `DATABASE_PATH` at a mounted volume there, or swap `src/lib/server/db.ts`
for a hosted database. The rest of the app (BYOK image/copy generation,
signed-out mode) works fine on Vercel regardless.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), open **Settings**, and
paste in your Gemini API key (and optionally USDA/Anthropic keys). Then add
slides and start generating. Accounts work out of the box in dev — set
`ENCRYPTION_KEY` in `.env.local` first (copy `.env.example`).

## Project structure

- `src/app/api/usda/search` — proxies USDA FoodData Central food search.
- `src/app/api/gemini/{generate,models}` — proxies Gemini image generation
  and model listing.
- `src/app/api/claude/{generate-copy,models}` — proxies Claude copy
  generation and model listing.
- `src/app/api/auth/*`, `src/app/api/settings`, `src/app/api/carousels/*` —
  accounts, encrypted settings, and saved carousels.
- `src/lib/nutrition.ts` — normalizes raw USDA results into calories/protein.
- `src/lib/promptBuilder.ts` — turns slide data + USDA figures into an image
  generation prompt per slide template.
- `src/lib/copyAssist.ts` — builds the Claude copywriting prompts.
- `src/lib/server/` — SQLite access, auth, and AES-256-GCM encryption helpers
  (server-only).
- `src/components/` — carousel builder UI, slide editors, USDA food picker,
  auth panel.

## Deploying

This is a standard Next.js app.

```bash
npm run build
npm run start
```

Without `ENCRYPTION_KEY` set, the app still works fully in signed-out (BYOK)
mode — accounts/save-to-server just won't be available. See the deployment
note above regarding SQLite on serverless platforms.
