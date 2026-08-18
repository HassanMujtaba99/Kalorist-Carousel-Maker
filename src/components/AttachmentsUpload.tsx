"use client";

import { useRef, useState } from "react";

export interface Attachment {
  id: string;
  label: string;
  image: string;
}

interface Props {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  /** Insert this attachment's label at the caret of the prompt textarea. */
  onInsertLabel: (label: string) => void;
  maxAttachments?: number;
}

const MAX_BYTES = 8 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Multi-image upload where each item gets an editable label so it can be
 * called out by name in the prompt (e.g. "Attachment 1") — unlike
 * ReferenceImagesUpload, these images are meant to be sent to the model as
 * literal generation inputs, not just style/mood context.
 */
export function AttachmentsUpload({
  attachments,
  onChange,
  onInsertLabel,
  maxAttachments = 6,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;
    const room = maxAttachments - attachments.length;
    if (room <= 0) {
      setError(`You can add up to ${maxAttachments} attachments.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const added: Attachment[] = [];
    let nextIndex = attachments.length + 1;
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_BYTES) {
        setError("One or more files were too large (max 8MB each) and were skipped.");
        continue;
      }
      try {
        const image = await readFileAsDataUrl(file);
        added.push({
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `att-${Date.now()}-${nextIndex}`,
          label: `Attachment ${nextIndex}`,
          image,
        });
        nextIndex += 1;
      } catch {
        setError("Could not read one of the files — try again.");
      }
    }
    if (added.length > 0) onChange([...attachments, ...added]);
  };

  const updateLabel = (id: string, label: string) => {
    onChange(attachments.map((a) => (a.id === id ? { ...a, label } : a)));
  };

  const remove = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="block text-sm">
      <span className="kal-label">Attachments to include (optional)</span>
      <p className="mb-2 text-xs text-ink/45">
        Sent directly to the model as generation inputs — give each one a
        short label, then call it out in your prompt (e.g. &quot;place the
        logo from Attachment 1 in the top-right corner&quot;). Click
        &quot;Insert&quot; to drop a label into the prompt at the end.
      </p>

      {attachments.length > 0 && (
        <div className="mb-2 space-y-2">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-xl border-2 border-ink/15 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.image}
                alt={a.label}
                className="h-12 w-12 shrink-0 rounded-lg border-2 border-ink object-cover"
              />
              <input
                type="text"
                value={a.label}
                onChange={(e) => updateLabel(a.id, e.target.value)}
                className="kal-input !py-1.5"
                placeholder="Label"
              />
              <button
                type="button"
                onClick={() => onInsertLabel(a.label)}
                className="kal-btn-ghost shrink-0 !px-2.5 !py-1.5 text-xs"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.label}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white hover:bg-ink/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {attachments.length < maxAttachments && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="kal-btn-ghost"
        >
          + Add attachment
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-purple">{error}</p>}
    </div>
  );
}
