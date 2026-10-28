const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

const MAX = 20 * 1024 * 1024; // KV values can be up to 25 MiB
const TTL = 30 * 24 * 3600;    // links expire after 30 days

const cleanName = (n) => {
  let s = String(n || '').trim().replace(/[^\w.+-]/g, '_').replace(/^\.+/, '').slice(0, 100);
  if (!s) s = 'main.cpp';
  return /\.\w+$/.test(s) ? s : s + '.cpp';
};

// POST /api/save { code, name } -> { id, url } ; stores the file in KV (binding: FILES)
export async function onRequestPost({ request, env }) {
  if (!env.FILES) return json({ error: 'Storage is not set up yet: add a KV namespace binding named FILES (see README).' }, 501);
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const code = String(b.code ?? ''), name = cleanName(b.name);
  const bytes = new TextEncoder().encode(code);
  if (!bytes.length) return json({ error: 'Nothing to save' }, 400);
  if (bytes.length > MAX) return json({ error: 'File too large (20 MB max)' }, 413);

  // Same name + code -> same id, so repeat saves cost a KV read instead of a write
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name + '\0' + code));
  const id = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 12);
  if ((await env.FILES.get(id, { type: 'stream' })) === null) {
    await env.FILES.put(id, bytes, { expirationTtl: TTL, metadata: { name } });
  }
  return json({ id, url: `${new URL(request.url).origin}/d/${id}`, name, days: TTL / 86400 });
}
