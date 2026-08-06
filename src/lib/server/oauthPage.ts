export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal standalone HTML page (no Next.js layout/Tailwind build available from a raw Route Handler response). */
export function renderOAuthPage(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #faf6ec;
    color: #14141a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 24px;
  }
  .card {
    width: 100%;
    max-width: 420px;
    background: #fff;
    border: 2px solid #14141a;
    border-radius: 16px;
    box-shadow: 4px 4px 0 0 #14141a;
    padding: 24px;
  }
  h1 { font-size: 1.25rem; font-weight: 800; margin: 0 0 12px; }
  p { font-size: 0.9rem; line-height: 1.5; color: rgba(20,20,26,0.7); margin: 0 0 12px; }
  .account { font-weight: 700; color: #14141a; }
  .actions { display: flex; gap: 10px; margin-top: 20px; }
  button, .btn {
    flex: 1;
    text-align: center;
    border-radius: 999px;
    padding: 10px 16px;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    border: 2px solid transparent;
    text-decoration: none;
  }
  .btn-primary { background: #7c5cfc; color: #fff; border-color: #7c5cfc; }
  .btn-primary:hover { background: #6142e8; }
  .btn-ghost { background: #fff; color: #7c5cfc; border-color: #7c5cfc; }
  .btn-ghost:hover { background: rgba(124,92,252,0.08); }
</style>
</head>
<body>
  <div class="card">${bodyHtml}</div>
</body>
</html>`;
}
