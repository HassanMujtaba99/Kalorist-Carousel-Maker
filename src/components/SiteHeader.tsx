export function SiteHeader() {
  return (
    <header className="bg-ink">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-lime text-sm">
            🥑
          </span>
          <span className="font-extrabold tracking-tight text-white">Kalorist</span>
          <span className="hidden text-sm text-white/50 sm:inline">
            Carousel Maker
          </span>
        </div>
        <a
          href="https://kalorist.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-purple px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-purple-dark"
        >
          kalorist.com
        </a>
      </div>
    </header>
  );
}
