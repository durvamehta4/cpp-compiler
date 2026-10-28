// GET /d/:id -> downloads the stored file (what the QR code points to)
export async function onRequestGet({ params, env }) {
  const text = (msg, status) => new Response(msg, { status, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (!env.FILES) return text('Storage is not set up yet.', 501);
  const id = String(params.id);
  if (!/^[\w-]{6,32}$/.test(id)) return text('Not found.', 404);

  const { value, metadata } = await env.FILES.getWithMetadata(id, { type: 'stream' });
  if (value === null) return text('This link has expired or does not exist.', 404);
  const name = metadata?.name || 'main.cpp';
  return new Response(value, {
    headers: {
      'content-type': 'text/x-c++src; charset=utf-8',
      'content-disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
