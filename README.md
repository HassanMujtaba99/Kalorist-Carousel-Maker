# Kalorist Carousel Maker

Build nutrition-education Instagram carousel posts ("this or that", "day on a
plate", "protein swap", hook/cover, and save/CTA slides) with AI-generated
slide images.
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
model (if it supports vision) and it drafts the whole carousel in one shot.

**Content format** picks which content-slide type it generates — "This or
That" comparisons, a "Day on a Plate" grid, or a "Protein Swap" before/after
meal comparison — or leave it on "Let AI decide" to infer it from your
topic/reference images (it otherwise defaults to This or That).

Attaching reference image(s) from an earlier post treats them as "Part 1" of
the series: the model infers the topic, tone, and format from the images and
brainstorms "Part 2" — a genuinely new next installment in the same style,
not a repeat of what's shown. The "Number of comparisons / plate sections"
field controls how many comparisons (this-or-that) or sections (day-on-a-
plate) it generates; a protein-swap slide instead always gets 2-4 real foods
per side, forming one complete lower-protein and one complete higher-protein
meal. The model only proposes *which* real foods to use —
every calorie number it uses still comes from a live USDA FoodData Central
search, never from the model itself. Review/edit the result like any other
slide before generating images.

**Target audience region** (optional, with an optional **city** field that
appears once a region is set) steers the brainstorm toward brands and dishes
actually local to that audience — e.g. set it to "Pakistan" (and "Karachi")
to get local restaurant chains and regional dishes a resident there would
actually recognize, instead of defaulting to whichever multinational chain
(McDonald's, KFC, Subway, etc.) is easiest to think of just because it also
happens to operate there. Since USDA FoodData Central is US-centric and
often won't carry a specific local brand or dish by name, every food the
model proposes also
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

## Studio: build from reference posts, item by item

At `/studio` (linked from the main builder) is a guided, step-by-step flow
for when you want a new carousel closely modeled on a handful of real
example posts:

1. **Share references.** Attach up to 6 reference images and describe the
   value the content provides the viewer — the specific reason it performs
   well (not just what it looks like).
2. **Confirm identified items.** Gemini runs a best-effort object-detection
   pass on each image and overlays a box per identified item directly on
   the image. Boxes can be off-position or wrong-sized, or miss things
   entirely — drag a box to reposition it, drag its corner handle to
   resize it, rename it via the input list below the image, remove
   anything wrong, or add a box for anything missed. If detection fails
   outright (bad key, rate limit), you can still annotate manually.
3. **Generate the idea.** Pick a content format (or let the AI infer it)
   and it brainstorms a full new carousel — cover, content slide(s), CTA —
   grounded in your value proposition and the confirmed items, the same
   USDA-grounded engine "Brainstorm entire carousel" uses.
4. **Generate images.** Review/edit the generated carousel like any other
   (same slide editors), then generate. Each slide's image-generation
   prompt is built from the confirmed items via the brainstormed content
   — and, for slides without their own background photo, up to two of
   your reference images are attached purely for visual style matching
   (color palette, layout, typography) without copying their specific
   content.

## MCP server: let Claude drive it for you

This app also runs as a remote [MCP](https://modelcontextprotocol.io) server
at `/api/mcp` — add its URL to any MCP-compatible Claude client (Claude
Desktop, Claude Code, claude.ai custom connectors) and Claude can build
carousels for you directly, no local install required. It deploys
automatically with the rest of the app.

**Claude Desktop / Claude Code** — add to your MCP config:

```json
{
  "mcpServers": {
    "kalorist-carousel-maker": {
      "url": "https://<your-deployed-app>.vercel.app/api/mcp"
    }
  }
}
```

(Claude Code: `claude mcp add --transport http kalorist-carousel-maker https://<your-deployed-app>.vercel.app/api/mcp`)

**Tools exposed:**

- `search_usda_food` — look up real calorie/protein figures for a food or
  menu item.
- `brainstorm_carousel` — draft a full carousel (cover, content slide(s) in
  "this or that" / "day on a plate" / "protein swap" format, closing CTA),
  same USDA-grounded engine the app's UI uses. Returns `SlideData` objects.
- `generate_slide_image` — render a finished slide image from a `SlideData`
  object (as returned by `brainstorm_carousel`), reusing the app's own
  prompt templates so the badge/typography/layout stay consistent. Also
  returns a ready-made `slide` JSON object (image + metadata) you can pass
  straight into `save_carousel`.
- `save_carousel` — save the finished carousel into your Kalorist account so
  it shows up in **My Carousels** on the site, where you can view each slide
  and use the existing "Download all as ZIP" button. Requires `mcpToken`
  (see below). Pass `carouselId` from an earlier `save_carousel` call to
  update that carousel instead of creating a new one.

Typical flow: `brainstorm_carousel` → `generate_slide_image` once per
returned slide → `save_carousel` with the collected `slide` objects.

**Connecting a tool call to your account.** MCP tool calls have no browser
session, so there's no automatic way for a call to know "this is your
account" the way a page load on the website does — it needs its own
credential. Sign in on the site, open the **Connect Claude (MCP)** panel,
and click "Generate token". Pass that token as the `mcpToken` argument and
two things follow from it:

1. **Your saved provider keys are used automatically.** If you've already
   entered API keys in the app's Settings panel, pass `mcpToken` alone on
   `search_usda_food` / `brainstorm_carousel` / `generate_slide_image` and
   leave out `usdaApiKey` / `copyProvider` / `anthropicApiKey` /
   `geminiApiKey` / etc. — each one falls back to whatever's saved in your
   account. Pass an explicit key as well and it overrides the saved one just
   for that call.
2. **`save_carousel` and `referenceImageTags` become available** — these
   always require `mcpToken` since they read/write account-scoped data (no
   anonymous equivalent exists).

Only a salted hash of the token is stored; revoke it any time from the same
panel.

**Reference images without pasting a data URL.** Since there's no way to
attach a file to a chat message inside a chatbox, the same "Connect Claude"
panel has an upload widget: pick an image, hit submit, and it's stored under
your account with a short tag (e.g. `img_7f3a2c`) plus a "Copy for Claude"
button that copies a ready-made sentence referencing it. Paste that into
your message yourself — Claude can't reach into the page and do it for you
— then pass the tag via `referenceImageTags` on `brainstorm_carousel` or
`generate_slide_image` (alongside `mcpToken`) instead of a raw `data:` URL.

Internally, the MCP route calls Anthropic/Gemini/OpenAI/USDA directly
(`src/lib/server/*`) rather than routing back through this app's own
`/api/*` routes, which assume a browser's implicit origin for their
relative `fetch()` calls — that assumption doesn't hold in a server
context. `save_carousel` and image-tag lookups are the one place account
data is touched, via a small token table (`src/lib/server/mcpAuthRepo.ts`)
separate from Neon Auth's cookie-based session.

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
   and a variable middle of **content slides** ("This or That" comparisons,
   "Day on a Plate" grids, or "Protein Swap" before/after meal comparisons;
   more content types will be added later) that you
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
