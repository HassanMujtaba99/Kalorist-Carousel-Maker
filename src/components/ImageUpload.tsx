"use client";

import { useRef, useState } from "react";

interface Props {
  label: string;
  photo: string | null;
  onChange: (dataUrl: string | null) => void;
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

export function ImageUpload({ label, photo, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 8MB).");
      return;
    }
    try {
      onChange(await readFileAsDataUrl(file));
    } catch {
      setError("Could not read that file — try again.");
    }
  };

  return (
    <div className="block text-sm">
      <span className="kal-label">{label}</span>
      {photo ? (
        <div className="relative overflow-hidden rounded-xl border-2 border-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={label} className="max-h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-ink px-2 py-1 text-xs font-bold text-white hover:bg-ink/80"
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-4 text-center text-xs font-semibold text-ink/50 transition-colors ${
            dragOver ? "border-purple bg-purple/10" : "border-ink/25 hover:border-ink/50"
          }`}
        >
          <span>Click to upload or drag a photo here</span>
          <span className="text-[10px] font-normal text-ink/35">PNG or JPG, up to 8MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      {error && <p className="mt-1 text-xs font-semibold text-purple">{error}</p>}
    </div>
  );
}
