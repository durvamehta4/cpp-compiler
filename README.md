# C++ Online Compiler

A tiny online C++ compiler for Cloudflare Pages. It is one static HTML file (~10 KB, no frameworks, no build step) plus two Pages Functions that send code to the free [Compiler Explorer](https://godbolt.org) API, falling back to [Wandbox](https://wandbox.org) if it is down.

```
public/index.html          editor + UI (inline CSS/JS)
public/_headers            security headers
functions/api/run.js       POST /api/run       -> Compiler Explorer (Wandbox fallback)
functions/api/compilers.js GET  /api/compilers -> latest GCC/Clang list (edge-cached)
wrangler.toml
```

Features: GCC/Clang version picker, C++11 to C++2c, -O0 to -O3, stdin, line numbers, auto-indent, Tab/Shift+Tab, Ctrl/Cmd+Enter to run, autosave, shareable links (code is compressed into the URL hash, no database), dark mode, mobile layout.

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
