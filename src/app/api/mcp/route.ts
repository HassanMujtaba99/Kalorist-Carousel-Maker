import crypto from "node:crypto";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { AppSettings, CarouselBrand, CarouselState, CopyProvider, Slide, SlideData } from "@/lib/types";
import { brainstormCarousel, BRAINSTORM_FORMATS } from "@/lib/carouselBrainstorm";
import { buildSlidePrompt, slidePhotos, STYLE_MATCH_SUFFIX, SUBJECT_MATCH_SUFFIX } from "@/lib/promptBuilder";
import { searchUsdaFoodServer } from "@/lib/server/usdaSearchServer";
import { draftCopyServer } from "@/lib/server/draftCopyServer";
import { generateSlideImageServer } from "@/lib/server/geminiImageServer";
import { resolveMcpToken } from "@/lib/server/mcpAuthRepo";
import { getMcpImageByTag } from "@/lib/server/mcpImagesRepo";
import { createCarousel, updateCarousel } from "@/lib/server/carouselsRepo";
import { getUserSettings } from "@/lib/server/settingsRepo";

/**
 * Remote MCP server for Kalorist Carousel Maker — exposes the app's core
 * capabilities (USDA-grounded carousel brainstorming and slide-image
 * generation) as tools any MCP client (Claude Desktop, Claude Code,
 * claude.ai custom connectors) can call by adding this route's URL.
 *
 * Account linking happens once, at the CONNECTION, not per tool call: add
 * this server with an `Authorization: Bearer <token>` header (the token
 * comes from the app's "Connect Claude" panel) and every tool call after
 * that is automatically scoped to that account — no token argument for
 * Claude to ask for in chat. withMcpAuth (below) verifies the header via
 * resolveMcpToken and exposes the account as ctx.http.authInfo; tool
 * handlers read it via resolveAccount(ctx). Provider API keys still work
 * two ways: pass them explicitly as arguments (fully anonymous BYOK,
 * nothing stored), or leave them out once connected with a header and
 * they're pulled from the account's saved Settings — an explicit argument
 * always wins when both are present. save_carousel and referenceImageTags
 * require the header, since they read/write account-scoped data.
 *
 * Calls the upstream providers (Anthropic/Gemini/OpenAI/custom/USDA)
 * directly via src/lib/server/* rather than routing back through this
 * app's own /api/* endpoints — those endpoints assume a browser's implicit
 * origin for relative fetch() calls, which doesn't exist in this server
 * context.
 */

const dataUrlPattern = /^data:image\/[a-zA-Z+.-]+;base64,/;
const dataUrlSchema = z.string().regex(dataUrlPattern, "must be a data:image/...;base64,... URL");

function errorResult(e: unknown) {
  return {
    content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
    isError: true,
  };
}

/** Verifies the Authorization: Bearer header (if any) against the app's own token table. */
async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken || !bearerToken.trim()) return undefined;
  const resolved = await resolveMcpToken(bearerToken);
  if (!resolved) return undefined;
  return { token: bearerToken, clientId: resolved.userId, scopes: [], extra: { userId: resolved.userId } };
}

interface ResolvedAccount {
  userId: string;
  settings: AppSettings | null;
}

/** Reads the account a request's Authorization header resolved to (if any), plus its saved settings. */
async function resolveAccount(ctx: ServerContext): Promise<ResolvedAccount | null> {
  const userId = ctx.http?.authInfo?.extra?.userId;
  if (typeof userId !== "string") return null;
  const settings = await getUserSettings(userId);
  return { userId, settings };
}

/**
 * Merges raw data: URLs with tags uploaded via the website's "Connect Claude"
 * widget. Tags are scoped to the resolved account, so resolving even one tag
 * requires the connection to carry a valid Authorization header.
 */
async function resolveReferenceImages(
  rawImages: string[] | undefined,
  tags: string[] | undefined,
  account: ResolvedAccount | null
): Promise<string[]> {
  const images = [...(rawImages ?? [])];
  if (!tags || tags.length === 0) return images;

  if (!account) {
    throw new Error(
      "referenceImageTags requires this MCP connection to be authenticated — add an Authorization: Bearer header with a token from the app's Connect Claude panel when connecting this server."
    );
  }
  for (const tag of tags) {
    const dataUrl = await getMcpImageByTag(account.userId, tag);
    if (!dataUrl) throw new Error(`Unknown reference image tag: ${tag}`);
    images.push(dataUrl);
  }
  return images;
}

/** True if a string field is meaningfully set (not empty/whitespace). */
function has(value: string | undefined | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

interface ProviderKeyInput {
  copyProvider?: CopyProvider;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiCopyModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  customApiKey?: string;
  customModel?: string;
  customBaseUrl?: string;
  usdaApiKey?: string;
}

/**
 * Builds the effective AppSettings for a call: an explicit argument always
 * wins, otherwise falls back to the resolved account's saved settings (if
 * the connection is authenticated and something's been saved there),
 * otherwise a default.
 */
function mergeAppSettings(input: ProviderKeyInput, account: AppSettings | null): AppSettings {
  const pick = (explicit: string | undefined, fromAccount: string | undefined | null, fallback = "") =>
    has(explicit) ? explicit.trim() : has(fromAccount) ? fromAccount.trim() : fallback;
  return {
    geminiApiKey: pick(input.geminiApiKey, account?.geminiApiKey),
    geminiModel: pick(undefined, account?.geminiModel, "gemini-2.5-flash-image"),
    usdaApiKey: pick(input.usdaApiKey, account?.usdaApiKey),
    copyProvider: input.copyProvider ?? account?.copyProvider ?? "anthropic",
    anthropicApiKey: pick(input.anthropicApiKey, account?.anthropicApiKey),
    anthropicModel: pick(input.anthropicModel, account?.anthropicModel, "claude-sonnet-5"),
    geminiCopyModel: pick(input.geminiCopyModel, account?.geminiCopyModel, "gemini-2.5-flash"),
    openaiApiKey: pick(input.openaiApiKey, account?.openaiApiKey),
    openaiModel: pick(input.openaiModel, account?.openaiModel, "gpt-4o-mini"),
    customApiKey: pick(input.customApiKey, account?.customApiKey),
    customModel: pick(input.customModel, account?.customModel),
    customBaseUrl: pick(input.customBaseUrl, account?.customBaseUrl),
  };
}

const searchUsdaFoodInput = z.object({
  query: z.string().min(1).describe("Food or menu item name to search for"),
  usdaApiKey: z
    .string()
    .optional()
    .describe(
      "Your USDA FoodData Central API key. Omit if this connection is authenticated (see server instructions) to use the key saved in your account's Settings; omit both to fall back to the shared DEMO_KEY (rate-limited)."
    ),
});

const copyProviderInput = z.object({
  copyProvider: z
    .enum(["anthropic", "gemini", "openai", "custom"])
    .optional()
    .describe("Omit to use the provider saved in your account's Settings (needs an authenticated connection); defaults to anthropic otherwise"),
  anthropicApiKey: z.string().optional().describe("Omit on an authenticated connection to use the key saved in Settings"),
  anthropicModel: z.string().optional().describe("Defaults to claude-sonnet-5, or your saved model on an authenticated connection"),
  geminiApiKey: z
    .string()
    .optional()
    .describe("Also used for item detection/image generation if relevant. Omit on an authenticated connection to use the key saved in Settings"),
  geminiCopyModel: z.string().optional().describe("Defaults to gemini-2.5-flash, or your saved model on an authenticated connection"),
  openaiApiKey: z.string().optional().describe("Omit on an authenticated connection to use the key saved in Settings"),
  openaiModel: z.string().optional().describe("Defaults to gpt-4o-mini, or your saved model on an authenticated connection"),
  customApiKey: z.string().optional(),
  customModel: z.string().optional(),
  customBaseUrl: z.string().optional().describe("e.g. https://api.groq.com/openai/v1 — must be https"),
});

const brainstormCarouselInput = copyProviderInput.extend({
  topic: z.string().optional().describe("Topic/niche. Optional if referenceImages are attached."),
  region: z.string().optional().describe("e.g. 'Pakistan' — steers toward brands/dishes local to that audience"),
  city: z.string().optional().describe("e.g. 'Karachi' — only used if region is also set"),
  format: z
    .enum(["auto", "this-or-that", "day-on-a-plate", "protein-swap"])
    .optional()
    .describe("Content-slide format. 'auto' lets the model infer it (defaults to this-or-that)."),
  count: z.number().int().min(1).max(6).optional().describe("Comparisons/sections (ignored for protein-swap, which always uses 2-4 items per side)"),
  referenceImages: z.array(dataUrlSchema).max(6).optional().describe("Reference post image(s) as data: URLs"),
  referenceImageTags: z
    .array(z.string())
    .max(6)
    .optional()
    .describe(
      "Tags (e.g. 'img_7f3a2c') from images uploaded via the app's Connect Claude panel, as an alternative to pasting raw data: URLs. Needs an authenticated connection."
    ),
  valueProposition: z
    .string()
    .optional()
    .describe("Why similar content performs well — added as grounding context for the brainstorm"),
  usdaApiKey: z
    .string()
    .optional()
    .describe("Omit on an authenticated connection to use the key saved in Settings; omit both to fall back to DEMO_KEY (rate-limited)"),
});

const brandInput = z
  .object({
    name: z.string().optional(),
    accentColor: z.string().optional().describe("e.g. #22c55e"),
    badgeTemplate: z.enum(["pill", "ribbon", "circle", "underline"]).optional(),
  })
  .optional();

const generateSlideImageInput = z.object({
  slideData: z
    .record(z.string(), z.unknown())
    .describe(
      "A SlideData object exactly as returned in brainstorm_carousel's cover/content/cta fields — must include its 'kind' (title | this-or-that | day-on-a-plate | protein-swap | cta)"
    ),
  brand: brandInput.describe("Optional brand name/color/badge style — defaults to a generic placeholder brand"),
  geminiApiKey: z
    .string()
    .optional()
    .describe(
      "Image generation always uses Gemini. Omit on an authenticated connection to use the Gemini key saved in your account's Settings."
    ),
  geminiModel: z.string().optional().describe("Defaults to gemini-2.5-flash-image, or your saved model on an authenticated connection"),
  subjectImages: z
    .array(dataUrlSchema)
    .max(2)
    .optional()
    .describe(
      "Up to 2 photo(s) whose actual CONTENT should appear in the slide — the real person's likeness, or the real food/meal shown — not just their style. Use this (not referenceImages) whenever the user wants a specific person or dish depicted rather than a generic AI-generated one. Takes priority over referenceImages if both are given. Ignored if the slide already has its own background photo."
    ),
  subjectImageTags: z
    .array(z.string())
    .max(2)
    .optional()
    .describe(
      "Tags from images uploaded via the app's Connect Claude panel, as an alternative to subjectImages. Needs an authenticated connection."
    ),
  referenceImages: z
    .array(dataUrlSchema)
    .max(2)
    .optional()
    .describe(
      "Up to 2 reference image(s) attached purely for visual STYLE matching (color/layout/typography) — their content is never copied, so don't use this for a photo the user wants actually depicted (use subjectImages for that instead). Ignored if the slide already has its own background photo or subjectImages are given."
    ),
  referenceImageTags: z
    .array(z.string())
    .max(2)
    .optional()
    .describe(
      "Tags from images uploaded via the app's Connect Claude panel, as an alternative to referenceImages. Needs an authenticated connection."
    ),
});

const slideSchema = z.object({
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  imageDataUrl: dataUrlSchema.optional(),
  status: z.enum(["idle", "generating", "done", "error"]).optional(),
  error: z.string().optional(),
});

const saveCarouselInput = z.object({
  carouselId: z
    .string()
    .optional()
    .describe("Pass the id returned from an earlier save_carousel call to update that carousel instead of creating a new one"),
  title: z.string().min(1),
  brand: z.object({
    name: z.string(),
    accentColor: z.string(),
    badgeTemplate: z.enum(["pill", "ribbon", "circle", "underline"]),
  }),
  cover: slideSchema.describe("Use the 'slide' object returned by generate_slide_image for the cover"),
  content: z.array(slideSchema),
  cta: slideSchema.describe("Use the 'slide' object returned by generate_slide_image for the CTA"),
});

const rawHandler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_usda_food",
      {
        title: "Search USDA Food Data",
        description:
          "Search the USDA FoodData Central database for real, verified calorie/protein figures for a food or menu item. Never invents numbers. On an authenticated connection, the USDA key saved in your account's Settings is used automatically if usdaApiKey is omitted.",
        inputSchema: searchUsdaFoodInput,
      },
      async ({ query, usdaApiKey }, ctx) => {
        try {
          const account = await resolveAccount(ctx);
          const key = usdaApiKey?.trim() || account?.settings?.usdaApiKey || "";
          const foods = await searchUsdaFoodServer(query, key);
          return { content: [{ type: "text", text: JSON.stringify(foods, null, 2) }] };
        } catch (e) {
          return errorResult(e);
        }
      }
    );

    server.registerTool(
      "brainstorm_carousel",
      {
        title: "Brainstorm a Carousel",
        description:
          "Brainstorm a full nutrition-education Instagram carousel (cover headline, content slide(s), closing CTA) using your chosen AI copy provider. The model only proposes which real foods to use — every calorie/protein number comes from a live USDA FoodData Central lookup, never invented. Returns SlideData objects ready to pass to generate_slide_image. On an authenticated connection, the provider/keys saved in your account's Settings are used automatically for anything left unspecified.",
        inputSchema: brainstormCarouselInput,
      },
      async (input, ctx) => {
        try {
          const account = await resolveAccount(ctx);
          const settings = mergeAppSettings(input, account?.settings ?? null);
          const extraContext = input.valueProposition
            ? `The value this content should provide to the viewer (why it performs well): "${input.valueProposition}"`
            : null;
          const images = await resolveReferenceImages(input.referenceImages, input.referenceImageTags, account);
          const result = await brainstormCarousel(
            input.topic ?? "",
            images,
            input.count ?? 3,
            input.region ?? "",
            input.city ?? "",
            input.format && input.format !== "auto" ? input.format : null,
            settings,
            extraContext,
            { draftCopy: draftCopyServer, searchUsdaFood: searchUsdaFoodServer }
          );
          const summary = {
            cover: result.cover.data,
            content: result.content.map((s) => s.data),
            cta: result.cta.data,
            warnings: {
              unresolvedComparisons: result.unresolvedComparisons,
              usdaErrorCount: result.usdaErrorCount,
              usdaErrorSample: result.usdaErrorSample,
              approximatedItems: result.approximatedItems,
            },
          };
          return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
        } catch (e) {
          return errorResult(e);
        }
      }
    );

    server.registerTool(
      "generate_slide_image",
      {
        title: "Generate a Slide Image",
        description:
          "Render one finished carousel slide image from a SlideData object (as returned by brainstorm_carousel). Reuses the app's own prompt templates so the badge, typography, and layout stay consistent with the rest of the carousel. Returns the rendered image plus a 'slide' JSON object you can pass straight into save_carousel's cover/content/cta. On an authenticated connection, the Gemini key saved in your account's Settings is used automatically if geminiApiKey is omitted. Use subjectImages/subjectImageTags (not referenceImages) when the user wants an actual uploaded photo of a person or dish to appear in the result rather than a generic AI-generated one.",
        inputSchema: generateSlideImageInput,
      },
      async ({ slideData, brand, geminiApiKey, geminiModel, subjectImages, subjectImageTags, referenceImages, referenceImageTags }, ctx) => {
        try {
          const account = await resolveAccount(ctx);
          const effectiveGeminiApiKey = geminiApiKey?.trim() || account?.settings?.geminiApiKey || "";
          if (!effectiveGeminiApiKey) {
            throw new Error(
              "Missing Gemini API key — pass geminiApiKey directly, or connect this MCP server with an Authorization header so a Gemini key saved in your account's Settings can be used."
            );
          }
          const effectiveGeminiModel = geminiModel?.trim() || account?.settings?.geminiModel || "gemini-2.5-flash-image";
          const brandObj: CarouselBrand = {
            name: brand?.name ?? "MY COACHING",
            accentColor: brand?.accentColor ?? "#22c55e",
            badgeTemplate: brand?.badgeTemplate ?? "pill",
          };
          const data = slideData as unknown as SlideData;
          const ownPhotos = slidePhotos(data);
          const subjectPhotos = await resolveReferenceImages(subjectImages, subjectImageTags, account);
          const styleImages = await resolveReferenceImages(referenceImages, referenceImageTags, account);

          // Priority: the slide's own configured photo (e.g. a cover/CTA
          // background) > an uploaded photo whose actual content should
          // appear (SUBJECT_MATCH_SUFFIX) > a photo attached purely for
          // style inspiration (STYLE_MATCH_SUFFIX, content never copied).
          let attachedPhotos: string[];
          let suffix = "";
          if (ownPhotos.length > 0) {
            attachedPhotos = ownPhotos;
          } else if (subjectPhotos.length > 0) {
            attachedPhotos = subjectPhotos;
            suffix = SUBJECT_MATCH_SUFFIX;
          } else if (styleImages.length > 0) {
            attachedPhotos = styleImages;
            suffix = STYLE_MATCH_SUFFIX;
          } else {
            attachedPhotos = [];
          }
          const prompt = buildSlidePrompt(data, brandObj) + suffix;

          const imageDataUrl = await generateSlideImageServer(
            prompt,
            effectiveGeminiApiKey,
            effectiveGeminiModel,
            attachedPhotos
          );
          const match = /^data:([^;]+);base64,(.+)$/.exec(imageDataUrl);
          if (!match) throw new Error("Unexpected image response shape.");

          // Also hand back a ready-to-use Slide object (id + imageDataUrl) so
          // it can be passed straight into save_carousel's cover/content/cta
          // without the caller having to reconstruct the data: URL itself.
          const slide: Slide = { id: crypto.randomUUID(), data, imageDataUrl, status: "done" };
          return {
            content: [
              { type: "image", data: match[2], mimeType: match[1] },
              { type: "text", text: JSON.stringify({ slide }) },
            ],
          };
        } catch (e) {
          return errorResult(e);
        }
      }
    );

    server.registerTool(
      "save_carousel",
      {
        title: "Save a Carousel to My Account",
        description:
          "Save a finished carousel (title, brand, and cover/content/cta slides — each ideally the 'slide' object returned by generate_slide_image) into the caller's Kalorist account, so it shows up in \"My Carousels\" on the website for viewing and downloading. Needs an authenticated connection (Authorization: Bearer header). Pass carouselId to update a carousel you saved earlier instead of creating a new one.",
        inputSchema: saveCarouselInput,
      },
      async (input, ctx) => {
        try {
          const account = await resolveAccount(ctx);
          if (!account) {
            throw new Error(
              "This tool needs an authenticated connection — add an Authorization: Bearer header with a token from the app's Connect Claude panel when connecting this MCP server, then reconnect."
            );
          }
          const carousel: CarouselState = {
            title: input.title,
            brand: input.brand,
            cover: input.cover as unknown as Slide,
            content: input.content as unknown as Slide[],
            cta: input.cta as unknown as Slide,
          };
          let id = input.carouselId ?? null;
          if (id) {
            const updated = await updateCarousel(account.userId, id, carousel);
            if (!updated) throw new Error(`No carousel with id "${id}" in your account.`);
          } else {
            id = await createCarousel(account.userId, carousel);
          }
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  id,
                  message: `Saved to your Kalorist account — open "My Carousels" on the site to view or download it.`,
                }),
              },
            ],
          };
        } catch (e) {
          return errorResult(e);
        }
      }
    );
  },
  {
    serverInfo: { name: "kalorist-carousel-maker", version: "1.0.0" },
    instructions: `Kalorist Carousel Maker: build USDA-grounded nutrition-education Instagram
carousels. Typical flow: call brainstorm_carousel to draft the content
(cover/content/cta SlideData, format is "this-or-that", "day-on-a-plate", or
"protein-swap"), then call generate_slide_image once per slide — each call
returns the rendered image plus a ready-made 'slide' JSON object. Collect
those slide objects and call save_carousel to persist the finished carousel
into the caller's Kalorist account, where it shows up in "My Carousels" for
viewing/downloading. search_usda_food is available standalone for looking up
specific items.

Account linking is a one-time CONNECTION setting, not a tool argument: the
user adds an "Authorization: Bearer <token>" header (token from the app's
"Connect Claude" panel) when they connect this server — never ask for a
token in chat, there is no tool parameter for it. If a tool call fails with
an authentication-required error, tell the user to reconnect this server
with that header (e.g. \`claude mcp add --transport http kalorist <url>
--header "Authorization: Bearer <token>"\` in Claude Code) rather than
asking them to paste anything into the conversation. Once connected that
way, provider/USDA keys saved in the user's account Settings are used
automatically for any of copyProvider/anthropicApiKey/geminiApiKey/
usdaApiKey/etc. left unspecified — only ask the user for a raw API key if
they're not connected that way or haven't saved one for the provider they
want. save_carousel always needs the authenticated connection (no anonymous
way to save).

An image the user attaches directly in this chat is NOT usable by these
tools — this server only accepts images as a data: URL argument or as a
tag from the app's "Connect Claude" panel upload widget, and needs the
authenticated connection either way. If the user attaches or mentions a
photo, tell them to upload it there and paste back the tag it gives them
(their "Copy for Claude" button prefills a message for this) — do not try
to describe the image in words as a substitute, since that produces a
generic, different-looking result instead of the actual person or dish.
Once you have a tag, pick the right parameter based on what the user wants:
subjectImageTags on generate_slide_image if the real person or food shown
should actually appear in the output (their likeness/appearance is
preserved), or referenceImageTags on either tool if it's only a style/mood
reference (content is deliberately not copied). ${BRAINSTORM_FORMATS.map((f) => f.label).join(", ")}
are the available content formats.`,
  }
);

const handler = withMcpAuth(rawHandler, verifyToken, {
  required: false,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { handler as GET, handler as POST };
