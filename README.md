# Kalorist Carousel Maker

Build nutrition-education Instagram carousel posts ("this or that", "day on a
plate", hook/cover, and save/CTA slides) with AI-generated slide images.
Every calorie and protein figure shown on a slide is looked up live from the
[USDA FoodData Central](https://fdc.nal.usda.gov/) database and baked into
the image-generation prompt as a verified fact — the model is never asked to
invent nutrition numbers.

Slides are fully AI-generated (background, layout, and text) using Google's
Gemini image generation model (`gemini-2.5-flash-image`, aka "Nano Banana").

## How it works

1. You add slides (Title/Hook, This or That, Day on a Plate, Save/CTA) and
   fill in headlines, background scene descriptions, and — for the food
   slides — search and pick real foods from USDA FoodData Central.
2. The app computes calorie/protein totals from the selected USDA foods and
   composes a detailed prompt (see `src/lib/promptBuilder.ts`) that tells
   Gemini exactly what numbers and text to render.
3. Clicking "Generate slide" calls Gemini's image generation API and shows
   the finished slide, ready to download as PNG (or all slides as a ZIP).

## Bring your own API keys

This project is designed to be open-sourced and self-hosted. There is no
backend database and no server-side key storage:

- **Gemini API key** (required) — entered in the in-app Settings panel,
  stored only in your browser's `localStorage`, and sent directly to this
  app's own `/api/gemini/generate` route on each request. Get one at
  [Google AI Studio](https://aistudio.google.com/apikey).
- **USDA FoodData Central API key** (optional) — same storage model. Without
  one, searches fall back to USDA's shared `DEMO_KEY`, which works but is
  rate-limited. Get a free key at
  [api.data.gov/signup](https://api.data.gov/signup/).

Neither key is ever written to disk, a database, or a `.env` file on the
server — anyone who deploys this app supplies their own keys in the browser.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), open **Settings**, and
paste in your Gemini API key (and optionally a USDA key). Then add slides
and start generating.

## Project structure

- `src/app/api/usda/search` — proxies USDA FoodData Central food search.
- `src/app/api/gemini/generate` — proxies Gemini image generation.
- `src/lib/nutrition.ts` — normalizes raw USDA results into calories/protein.
- `src/lib/promptBuilder.ts` — turns slide data + USDA figures into an image
  generation prompt per slide template.
- `src/components/` — carousel builder UI, slide editors, USDA food picker.

## Deploying

This is a standard Next.js app and can be deployed anywhere Next.js runs
(Vercel, a Node server, Docker, or a Claude Code-managed environment). No
environment variables are required — all API keys are supplied by the user
at runtime in the browser.

```bash
npm run build
npm run start
```
