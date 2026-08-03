"use client";

import { useRef, useState } from "react";

interface Props {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
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

/** Multi-image picker for reference/inspiration photos (as opposed to ImageUpload, which is a single required-or-optional slot). */
export function ReferenceImagesUpload({ images, onChange, maxImages = 4 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    setError(null);
    if (!files || files.length === 0) return;
    const room = maxImages - images.length;
    if (room <= 0) {
      setError(`You can attach up to ${maxImages} reference images.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    const added: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_BYTES) {
        setError("One or more images were too large (max 8MB each) and were skipped.");
        continue;
      }
      try {
        added.push(await readFileAsDataUrl(file));
      } catch {
        setError("Could not read one of the files — try again.");
      }
    }
    if (added.length > 0) onChange([...images, ...added]);
  };

  return (
    <div className="block text-sm">
      <span className="kal-label">Reference images (optional)</span>
      <div className="flex flex-wrap gap-2">
        {images.map((img, i) => (
          <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border-2 border-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={`Reference ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              aria-label={`Remove reference image ${i + 1}`}
              className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-bl bg-ink text-[10px] font-bold text-white hover:bg-ink/80"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-ink/25 text-xs font-bold text-ink/40 hover:border-ink/50"
          >
            +
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error && <p className="mt-1 text-xs font-semibold text-purple">{error}</p>}
    </div>
  );
}
