"use client";

interface Props {
  url: string | null;
  generating: boolean;
  filename: string;
}

export function ResultPreview({ url, generating, filename }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="aspect-[4/5] w-full overflow-hidden rounded-xl border-2 border-ink bg-ink/5">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Recreated slide preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-ink/40">
            {generating ? "Generating…" : "No preview yet"}
          </div>
        )}
      </div>
      {url && (
        <a
          href={url}
          download={filename}
          className="text-xs font-bold text-purple underline underline-offset-2"
        >
          Download PNG
        </a>
      )}
    </div>
  );
}
