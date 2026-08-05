import crypto from "node:crypto";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import type { AppSettings, CarouselBrand, CarouselState, Slide, SlideData } from "@/lib/types";
import { brainstormCarousel, BRAINSTORM_FORMATS } from "@/lib/carouselBrainstorm";
import { buildSlidePrompt, slidePhotos, STYLE_MATCH_SUFFIX } from "@/lib/promptBuilder";
import { searchUsdaFoodServer } from "@/lib/server/usdaSearchServer";
import { draftCopyServer } from "@/lib/server/draftCopyServer";
import { generateSlideImageServer } from "@/lib/server/geminiImageServer";
import { resolveMcpToken } from "@/lib/server/mcpAuthRepo";
import { getMcpImageByTag } from "@/lib/server/mcpImagesRepo";
import { createCarousel, updateCarousel } from "@/lib/server/carouselsRepo";

/**
 * Remote MCP server for Kalorist Carousel Maker — exposes the app's core
 * capabilities (USDA-grounded carousel brainstorming and slide-image
 * generation) as tools any MCP client (Claude Desktop, Claude Code,
 * claude.ai custom connectors) can call by adding this route's URL.
 *
 * BYOK for AI/USDA provider keys, same as the rest of the app: those are
 * passed as arguments and used for the single call, never persisted
 * server-side. Saving to an account is the one exception — save_carousel and
 * the referenceImageTags option take an mcpToken (generated from the app's
 * "Connect Claude" panel, stored only as a salted hash) so results can land
 * in the caller's own "My Carousels" list.
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

/**
 * Merges raw data: URLs with tags uploaded via the website's "Connect Claude"
 * widget. Tags are scoped to whichever account mcpToken resolves to, so
 * resolving even one tag requires a valid token.
 */
async function resolveReferenceImages(
  rawImages: string[] | undefined,
  tags: string[] | undefined,
  mcpToken: string | undefined
): Promise<string[]> {
  const images = [...(rawImages ?? [])];
  if (!tags || tags.length === 0) return images;

  if (!mcpToken) {
    throw new Error("referenceImageTags requires mcpToken — generate one in the app's Connect Claude panel.");
  }
  const resolved = await resolveMcpToken(mcpToken);
  if (!resolved) {
    throw new Error("Invalid or revoked access token. Generate a new one in the app's Connect Claude panel.");
  }
  for (const tag of tags) {
    const dataUrl = await getMcpImageByTag(resolved.userId, tag);
    if (!dataUrl) throw new Error(`Unknown reference image tag: ${tag}`);
    images.push(dataUrl);
  }
  return images;
}

const searchUsdaFoodInput = z.object({
  query: z.string().min(1).describe("Food or menu item name to search for"),
  usdaApiKey: z
    .string()
    .optional()
    .describe("Your USDA FoodData Central API key. Omit to use the shared DEMO_KEY (rate-limited)."),
});

const copyProviderInput = z.object({
  copyProvider: z.enum(["anthropic", "gemini", "openai", "custom"]),
  anthropicApiKey: z.string().optional(),
  anthropicModel: z.string().optional().describe("Defaults to claude-sonnet-5"),
  geminiApiKey: z.string().optional().describe("Also used for item detection/image generation if relevant"),
  geminiCopyModel: z.string().optional().describe("Defaults to gemini-2.5-flash"),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional().describe("Defaults to gpt-4o-mini"),
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
      "Tags (e.g. 'img_7f3a2c') from images uploaded via the app's Connect Claude panel, as an alternative to pasting raw data: URLs. Requires mcpToken."
    ),
  mcpToken: z
    .string()
    .optional()
    .describe("Your Kalorist account access token — only needed if using referenceImageTags"),
  valueProposition: z
    .string()
    .optional()
    .describe("Why similar content performs well — added as grounding context for the brainstorm"),
  usdaApiKey: z.string().optional().describe("Optional — DEMO_KEY is used otherwise (rate-limited)"),
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
  geminiApiKey: z.string().describe("Required — image generation always uses Gemini"),
  geminiModel: z.string().optional().describe("Defaults to gemini-2.5-flash-image"),
  referenceImages: z
    .array(dataUrlSchema)
    .max(2)
    .optional()
    .describe(
      "Up to 2 reference image(s) attached purely for visual style matching (color/layout/typography) — their content is never copied. Ignored if the slide already has its own background photo."
    ),
  referenceImageTags: z
    .array(z.string())
    .max(2)
    .optional()
    .describe(
      "Tags from images uploaded via the app's Connect Claude panel, as an alternative to referenceImages. Requires mcpToken."
    ),
  mcpToken: z
    .string()
    .optional()
    .describe("Your Kalorist account access token — only needed if using referenceImageTags"),
});

const slideSchema = z.object({
  id: z.string(),
  data: z.record(z.string(), z.unknown()),
  imageDataUrl: dataUrlSchema.optional(),
  status: z.enum(["idle", "generating", "done", "error"]).optional(),
  error: z.string().optional(),
});

const saveCarouselInput = z.object({
  mcpToken: z
    .string()
    .describe("Your Kalorist account access token — generate one in the app's Connect Claude panel"),
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

function toAppSettings(input: z.infer<typeof copyProviderInput> & { usdaApiKey?: string }): AppSettings {
  return {
    geminiApiKey: input.geminiApiKey ?? "",
    geminiModel: "gemini-2.5-flash-image",
    usdaApiKey: input.usdaApiKey ?? "",
    copyProvider: input.copyProvider,
    anthropicApiKey: input.anthropicApiKey ?? "",
    anthropicModel: input.anthropicModel || "claude-sonnet-5",
    geminiCopyModel: input.geminiCopyModel || "gemini-2.5-flash",
    openaiApiKey: input.openaiApiKey ?? "",
    openaiModel: input.openaiModel || "gpt-4o-mini",
    customApiKey: input.customApiKey ?? "",
    customModel: input.customModel ?? "",
    customBaseUrl: input.customBaseUrl ?? "",
  };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "search_usda_food",
      {
        title: "Search USDA Food Data",
        description:
          "Search the USDA FoodData Central database for real, verified calorie/protein figures for a food or menu item. Never invents numbers.",
        inputSchema: searchUsdaFoodInput,
      },
      async ({ query, usdaApiKey }) => {
        try {
          const foods = await searchUsdaFoodServer(query, usdaApiKey ?? "");
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
          "Brainstorm a full nutrition-education Instagram carousel (cover headline, content slide(s), closing CTA) using your chosen AI copy provider. The model only proposes which real foods to use — every calorie/protein number comes from a live USDA FoodData Central lookup, never invented. Returns SlideData objects ready to pass to generate_slide_image.",
        inputSchema: brainstormCarouselInput,
      },
      async (input) => {
        try {
          const settings = toAppSettings(input);
          const extraContext = input.valueProposition
            ? `The value this content should provide to the viewer (why it performs well): "${input.valueProposition}"`
            : null;
          const images = await resolveReferenceImages(input.referenceImages, input.referenceImageTags, input.mcpToken);
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
          "Render one finished carousel slide image from a SlideData object (as returned by brainstorm_carousel). Reuses the app's own prompt templates so the badge, typography, and layout stay consistent with the rest of the carousel. Returns the rendered image plus a 'slide' JSON object you can pass straight into save_carousel's cover/content/cta.",
        inputSchema: generateSlideImageInput,
      },
      async ({ slideData, brand, geminiApiKey, geminiModel, referenceImages, referenceImageTags, mcpToken }) => {
        try {
          const brandObj: CarouselBrand = {
            name: brand?.name ?? "MY COACHING",
            accentColor: brand?.accentColor ?? "#22c55e",
            badgeTemplate: brand?.badgeTemplate ?? "pill",
          };
          const data = slideData as unknown as SlideData;
          const ownPhotos = slidePhotos(data);
          const styleImages = await resolveReferenceImages(referenceImages, referenceImageTags, mcpToken);
          const usingStyleImages = ownPhotos.length === 0 && styleImages.length > 0;
          const prompt =
            buildSlidePrompt(data, brandObj) + (usingStyleImages ? STYLE_MATCH_SUFFIX : "");

          const imageDataUrl = await generateSlideImageServer(
            prompt,
            geminiApiKey,
            geminiModel || "gemini-2.5-flash-image",
            ownPhotos.length > 0 ? ownPhotos : styleImages
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
          "Save a finished carousel (title, brand, and cover/content/cta slides — each ideally the 'slide' object returned by generate_slide_image) into the caller's Kalorist account, so it shows up in \"My Carousels\" on the website for viewing and downloading. Requires mcpToken. Pass carouselId to update a carousel you saved earlier instead of creating a new one.",
        inputSchema: saveCarouselInput,
      },
      async (input) => {
        try {
          const resolved = await resolveMcpToken(input.mcpToken);
          if (!resolved) {
            throw new Error(
              "Invalid or revoked access token. Generate a new one in the app's Connect Claude panel."
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
            const updated = await updateCarousel(resolved.userId, id, carousel);
            if (!updated) throw new Error(`No carousel with id "${id}" in your account.`);
          } else {
            id = await createCarousel(resolved.userId, carousel);
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
viewing/downloading (needs mcpToken, generated from the app's "Connect
Claude" panel). search_usda_food is available standalone for looking up
specific items. referenceImageTags on brainstorm_carousel/generate_slide_image
resolve images uploaded through that same panel (also needs mcpToken) as an
alternative to pasting raw data: URLs. AI/USDA provider keys are BYOK — pass
your own as arguments each call; ${BRAINSTORM_FORMATS.map((f) => f.label).join(", ")}
are the available content formats.`,
  }
);

export { handler as GET, handler as POST };
