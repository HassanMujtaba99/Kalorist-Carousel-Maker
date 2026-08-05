"use client";

import { useEffect, useRef, useState } from "react";
import {
  createMcpToken,
  deleteMcpImage,
  listMcpImages,
  listMcpTokens,
  revokeMcpToken,
  uploadMcpImage,
  type McpImageSummary,
  type McpTokenSummary,
} from "@/lib/mcpClient";

const MAX_BYTES = 8 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function referenceSnippet(tag: string): string {
  return `Use my uploaded reference image (tag: ${tag}) via the Kalorist Carousel Maker MCP.`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function McpPanel() {
  const [open, setOpen] = useState(false);

  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [tokenLabel, setTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [justCreated, setJustCreated] = useState<{ token: string; label: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [images, setImages] = useState<McpImageSummary[]>([]);
  const [pendingFile, setPendingFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    listMcpTokens().then(setTokens).catch(() => {});
    listMcpImages().then(setImages).catch(() => {});
  }, [open]);

  const handleCreateToken = async () => {
    setCreatingToken(true);
    setTokenError(null);
    try {
      const { token, label } = await createMcpToken(tokenLabel.trim() || "MCP token");
      setJustCreated({ token, label });
      setTokenLabel("");
      setTokens(await listMcpTokens());
    } catch (e) {
      setTokenError(e instanceof Error ? e.message : "Could not create token.");
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    await revokeMcpToken(id).catch(() => {});
    setTokens((t) => t.filter((x) => x.id !== id));
  };

  const handleFilePicked = async (files: FileList | null) => {
    setUploadError(null);
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Image is too large (max 8MB).");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPendingFile({ name: file.name, dataUrl });
    } catch {
      setUploadError("Could not read that file — try again.");
    }
  };

  const handleSubmitUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const tag = await uploadMcpImage(pendingFile.dataUrl);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImages(await listMcpImages());
      const copied = await copyToClipboard(referenceSnippet(tag));
      setCopiedTag(copied ? tag : null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleCopyTag = async (tag: string) => {
    const copied = await copyToClipboard(referenceSnippet(tag));
    setCopiedTag(copied ? tag : null);
    if (copied) setTimeout(() => setCopiedTag((t) => (t === tag ? null : t)), 2500);
  };

  const handleDeleteImage = async (tag: string) => {
    await deleteMcpImage(tag).catch(() => {});
    setImages((imgs) => imgs.filter((i) => i.tag !== tag));
  };

  return (
    <div className="kal-card !p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-bold text-ink">Connect Claude (MCP)</span>
        <span className="text-sm font-semibold text-purple">{open ? "Hide" : "Set up"}</span>
      </button>

      {open && (
        <div className="space-y-6 border-t-2 border-ink px-4 py-4">
          <p className="text-sm text-ink/60">
            Add <code className="rounded bg-ink/5 px-1 py-0.5">/api/mcp</code> as a
            remote MCP server in Claude Desktop, Claude Code, or claude.ai, then
            generate an access token below so carousels Claude builds for you can
            be saved straight to your account.
          </p>

          {/* Access tokens */}
          <div className="space-y-3">
            <span className="kal-label">Access tokens</span>

            {justCreated && (
              <div className="space-y-2 rounded-xl border-2 border-lime-dark bg-lime-dark/10 p-3">
                <p className="text-xs font-semibold text-ink">
                  Copy this now — it won&apos;t be shown again. Pass it as the{" "}
                  <code className="rounded bg-ink/5 px-1 py-0.5">mcpToken</code> argument
                  when Claude calls <code className="rounded bg-ink/5 px-1 py-0.5">save_carousel</code>.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg border-2 border-ink/15 bg-white px-2 py-1 text-xs">
                    {justCreated.token}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(justCreated.token)}
                    className="kal-btn-ghost shrink-0 !py-1 !text-xs"
                  >
                    Copy
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setJustCreated(null)}
                  className="text-xs font-semibold text-purple hover:underline"
                >
                  Done
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                placeholder="Label, e.g. Claude Desktop"
                className="kal-input !w-auto flex-1"
              />
              <button
                type="button"
                onClick={handleCreateToken}
                disabled={creatingToken}
                className="kal-btn-primary shrink-0"
              >
                {creatingToken ? "Creating…" : "Generate token"}
              </button>
            </div>
            {tokenError && <p className="text-xs font-semibold text-purple">{tokenError}</p>}

            {tokens.length > 0 && (
              <ul className="divide-y-2 divide-ink/10 overflow-hidden rounded-xl border-2 border-ink/15">
                {tokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{t.label}</p>
                      <p className="text-xs text-ink/45">
                        Created {formatDate(t.createdAt)}
                        {t.lastUsedAt ? ` · last used ${formatDate(t.lastUsedAt)}` : " · never used"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeToken(t.id)}
                      className="shrink-0 text-xs font-bold text-purple hover:underline"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Reference image upload */}
          <div className="space-y-3 border-t-2 border-dashed border-ink/15 pt-4">
            <span className="kal-label">Upload a reference image</span>
            <p className="text-xs text-ink/45">
              Upload an image here, then paste the copied line into your Claude
              message yourself — Claude has no way to reach into this page, so
              the paste step is manual.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="kal-btn-ghost"
              >
                Choose image…
              </button>
              {pendingFile && (
                <>
                  <span className="max-w-[10rem] truncate text-xs text-ink/60">{pendingFile.name}</span>
                  <button
                    type="button"
                    onClick={handleSubmitUpload}
                    disabled={uploading}
                    className="kal-btn-primary"
                  >
                    {uploading ? "Uploading…" : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="text-xs font-semibold text-purple hover:underline"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleFilePicked(e.target.files)}
            />
            {uploadError && <p className="text-xs font-semibold text-purple">{uploadError}</p>}

            {images.length > 0 && (
              <ul className="divide-y-2 divide-ink/10 overflow-hidden rounded-xl border-2 border-ink/15">
                {images.map((img) => (
                  <li key={img.tag} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <code className="text-sm text-ink">{img.tag}</code>
                      <p className="text-xs text-ink/45">Uploaded {formatDate(img.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleCopyTag(img.tag)}
                        className="text-xs font-bold text-purple hover:underline"
                      >
                        {copiedTag === img.tag ? "Copied!" : "Copy for Claude"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.tag)}
                        className="text-xs font-bold text-ink/40 hover:text-purple hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
