# C++ Online Compiler

A tiny online C++ compiler for Cloudflare Pages. It is one static HTML file (~10 KB, no frameworks, no build step) plus two Pages Functions that send code to the free [Compiler Explorer](https://godbolt.org) API, falling back to [Wandbox](https://wandbox.org) if it is down.

```
public/index.html          editor + UI (inline CSS/JS)
public/_headers            security headers
functions/api/run.js       POST /api/run       -> Compiler Explorer (Wandbox fallback)
functions/api/compilers.js GET  /api/compilers -> latest GCC/Clang list (edge-cached)
functions/api/save.js      POST /api/save      -> stores the file in KV for the QR link
functions/d/[id].js        GET  /d/:id         -> downloads a stored file (what the QR points to)
public/qr.js               QR generator (qrcode-generator 1.4.4, MIT), loaded only when needed
wrangler.toml
```

Features: GCC/Clang version picker, C++11 to C++2c, -O0 to -O3, stdin, line numbers, auto-indent, Tab/Shift+Tab, Ctrl/Cmd+Enter to run, autosave, Download button (Ctrl+S), "To phone" QR code that downloads the file on a phone (files up to 20 MB, links last 30 days), dark mode, mobile layout.

## Enable "To phone" (free Workers KV)

1. Cloudflare dashboard → **Storage & databases** → **Workers KV** → **Create instance** (any name, e.g. `cpp-files`).
2. Copy its **ID**.
3. In `wrangler.toml`, remove the `#` from the three `kv_namespaces` lines and paste the ID.
4. Commit. Cloudflare redeploys, and the QR button starts working.

Free plan: 1,000 new files per day, 100,000 downloads per day, 1 GB total.

## Deploy (free)

Drag-and-drop upload in the dashboard does **not** run the `functions/` folder, so use one of these:

**Wrangler CLI:**
```bash
npx wrangler login
```
```bash
npx wrangler pages deploy
```

**GitHub:** push this folder to a repo, then in Cloudflare go to Workers & Pages → Create → Pages → Connect to Git. Leave the build command empty and set the output directory to `public`.

**Local dev:**
```bash
npx wrangler pages dev
```
