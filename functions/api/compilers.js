const WANDBOX = 'https://wandbox.org/api';
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

// GET /api/compilers -> [{ name, label }] of C++ compilers on Wandbox (edge-cached 1 day)
export async function onRequestGet() {
  try {
    const r = await fetch(`${WANDBOX}/list.json`, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const list = (await r.json())
      .filter((c) => c.language === 'C++')
      .map((c) => ({ name: c.name, label: `${c['display-name']} ${c.version}` }));
    return json(list, 200, { 'cache-control': 'public, max-age=3600' });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
}
