"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { AuthPanel } from "./AuthPanel";
import {
  createMcpToken,
  deleteMcpImage,
  listMcpImages,
  listMcpTokens,
  renameMcpImage,
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

function filenameToLabel(name: string): string {
  return name.replace(/\.[^./]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled";
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function subjectSnippet(label: string, tag: string): string {
  return `Use my uploaded photo "${label}" (tag: ${tag}) as the actual subject in the slide — I want the real person/food shown, not a generic AI version. (Say "just match its style" instead if you only want a mood/color reference.)`;
}

function coverSnippet(label: string, tag: string): string {
  return `Use my uploaded photo "${label}" (tag: ${tag}) as the exact cover/CTA background photo, unaltered.`;
}

function buildConnectCommand(token: string): string {
  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";
  return `claude mcp add --transport http kalorist-carousel-maker ${mcpUrl} --header "Authorization: Bearer ${token}"`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function ConnectClaudeBuilder() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const user = session?.user ?? null;

  const [tokens, setTokens] = useState<McpTokenSummary[]>([]);
  const [tokenLabel, setTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [justCreated, setJustCreated] = useState<{ token: string; label: string } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [images, setImages] = useState<McpImageSummary[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    listMcpTokens().then(setTokens).catch(() => {});
    listMcpImages().then(setImages).catch(() => {});
  }, [user]);

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

  const uploadFiles = async (files: File[]) => {
    setUploadError(null);
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setUploadError("Please choose image files.");
      return;
    }
    setUploading(true);
    try {
      for (const file of images) {
        if (file.size > MAX_BYTES) {
          setUploadError((prev) => prev ?? `"${file.name}" is too large (max 8MB) — skipped.`);
          continue;
        }
        try {
          const dataUrl = await readFileAsDataUrl(file);
          await uploadMcpImage(dataUrl, filenameToLabel(file.name));
        } catch (e) {
          setUploadError(e instanceof Error ? e.message : `Could not upload "${file.name}".`);
        }
      }
      setImages(await listMcpImages());
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCopy = async (key: string, text: string) => {
    const copied = await copyToClipboard(text);
    setCopiedKey(copied ? key : null);
    if (copied) setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2500);
  };

  const handleDeleteImage = async (tag: string) => {
    await deleteMcpImage(tag).catch(() => {});
    setImages((imgs) => imgs.filter((i) => i.tag !== tag));
  };

  const startRename = (img: McpImageSummary) => {
    setRenamingTag(img.tag);
    setRenameValue(img.label);
  };

  const submitRename = async (tag: string) => {
    const label = renameValue.trim() || "Untitled";
    setRenamingTag(null);
    await renameMcpImage(tag, label).catch(() => {});
    setImages((imgs) => imgs.map((i) => (i.tag === tag ? { ...i, label } : i)));
  };

  if (sessionPending) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Connect Claude</h1>
        <p className="max-w-2xl text-sm text-ink/60">
          Link your account so Claude can plan a carousel and generate it
          through this app using your own saved API keys and photos, then
          save the result straight to <strong>My Carousels</strong>.
        </p>
      </header>

      <AuthPanel user={user} onSignOut={() => authClient.signOut()} />

      {!user && (
        <div className="kal-card">
          <p className="text-sm text-ink/60">
            Sign in above first — tokens and your photo library are tied to
            your account, so there&apos;s nothing to set up until then.
          </p>
        </div>
      )}

      {user && (
        <>
          <section className="kal-card space-y-4">
            <div>
              <h2 className="font-bold text-ink">Connect this server</h2>
              <p className="mt-1 text-sm text-ink/60">
                Add <code className="rounded bg-ink/5 px-1 py-0.5">/api/mcp</code> as a
                remote MCP server in Claude Desktop, Claude Code, or claude.ai.
              </p>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink/60">
              <li>
                <strong>claude.ai</strong>: Settings → Connectors → Add custom
                connector → paste the URL → Connect. It&apos;ll open a login
                popup for this app — sign in and click Allow, nothing to copy.
              </li>
              <li>
                <strong>Claude Desktop / Claude Code</strong>: generate a
                token below and connect with it as an{" "}
                <code className="rounded bg-ink/5 px-1 py-0.5">Authorization</code> header.
              </li>
            </ul>

            {justCreated && (
              <div className="space-y-3 rounded-xl border-2 border-lime-dark bg-lime-dark/10 p-3">
                <p className="text-xs font-semibold text-ink">
                  Copy this now — it won&apos;t be shown again. Use it to
                  connect this server with an{" "}
                  <code className="rounded bg-ink/5 px-1 py-0.5">Authorization: Bearer</code>{" "}
                  header, not as a value you type into a Claude conversation.
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
                <div>
                  <p className="mb-1 text-xs text-ink/60">Claude Code — run once in your terminal:</p>
                  <div className="flex items-start gap-2">
                    <code className="flex-1 overflow-x-auto whitespace-pre rounded-lg border-2 border-ink/15 bg-white px-2 py-1 text-xs">
                      {buildConnectCommand(justCreated.token)}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(buildConnectCommand(justCreated.token))}
                      className="kal-btn-ghost shrink-0 !py-1 !text-xs"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-ink/45">
                    Claude Desktop: add the same URL and header under this
                    server&apos;s <code className="rounded bg-ink/5 px-1 py-0.5">headers</code> in
                    your MCP config instead.
                  </p>
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
          </section>

          <section className="kal-card space-y-4">
            <div>
              <h2 className="font-bold text-ink">Photo library</h2>
              <p className="mt-1 text-sm text-ink/60">
                An image attached directly in a Claude conversation can&apos;t
                be used to generate a slide — upload it here instead. Claude
                can list what&apos;s in this library and ask which one you
                mean, or you can paste a copied line yourself (Claude has no
                way to reach into this page, so that step is always manual).
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void uploadFiles(Array.from(e.dataTransfer.files));
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                dragOver ? "border-purple bg-purple/5" : "border-ink/25"
              }`}
            >
              <p className="text-sm text-ink/60">Drag photos here, or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="kal-btn-primary"
              >
                {uploading ? "Uploading…" : "Choose photos…"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
              />
            </div>
            {uploadError && <p className="text-xs font-semibold text-purple">{uploadError}</p>}

            {images.length === 0 ? (
              <p className="text-xs text-ink/45">Nothing uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {images.map((img) => (
                  <div key={img.tag} className="overflow-hidden rounded-xl border-2 border-ink/15 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/mcp-images/${img.tag}`}
                      alt={img.label}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="space-y-1.5 p-2">
                      {renamingTag === img.tag ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => submitRename(img.tag)}
                          onKeyDown={(e) => e.key === "Enter" && submitRename(img.tag)}
                          className="kal-input !py-1 !text-xs"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startRename(img)}
                          className="block w-full truncate text-left text-xs font-bold text-ink hover:underline"
                          title="Rename"
                        >
                          {img.label}
                        </button>
                      )}
                      <p className="text-[10px] text-ink/40">{formatDate(img.createdAt)}</p>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                        <button
                          type="button"
                          onClick={() => handleCopy(`subject-${img.tag}`, subjectSnippet(img.label, img.tag))}
                          className="text-[11px] font-bold text-purple hover:underline"
                        >
                          {copiedKey === `subject-${img.tag}` ? "Copied!" : "Copy for Claude"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(`cover-${img.tag}`, coverSnippet(img.label, img.tag))}
                          className="text-[11px] font-bold text-ink/50 hover:underline"
                        >
                          {copiedKey === `cover-${img.tag}` ? "Copied!" : "as cover/CTA"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.tag)}
                          className="text-[11px] font-bold text-ink/40 hover:text-purple hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
