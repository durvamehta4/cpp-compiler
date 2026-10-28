const GODBOLT = 'https://godbolt.org/api';
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

// Used if the Compiler Explorer list can't be fetched
const FALLBACK = [
  { name: 'g162', label: 'GCC 16.2' },
  { name: 'clang2310', label: 'Clang 23.1.0' },
];
const PER_FAMILY = 8;

// GET /api/compilers -> [{ name, label }], newest GCC first, then newest Clang (edge-cached 1 day)
export async function onRequestGet() {
  try {
    const r = await fetch(`${GODBOLT}/compilers/c++?fields=id,name,supportsExecute`, {
      headers: { accept: 'application/json', 'user-agent': 'cpp-compiler-pages' },
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const fams = { gcc: [], clang: [] };
    for (const c of await r.json()) {
      const m = c.supportsExecute && /^x86-64 (gcc|clang) (\d+)\.(\d+)(?:\.(\d+))?$/.exec(c.name);
      if (m) fams[m[1]].push({ name: c.id, label: `${m[1] === 'gcc' ? 'GCC' : 'Clang'} ${c.name.split(' ').pop()}`, v: [+m[2], +m[3], +(m[4] || 0)] });
    }
    const top = (l) => l.sort((a, b) => b.v[0] - a.v[0] || b.v[1] - a.v[1] || b.v[2] - a.v[2])
      .slice(0, PER_FAMILY).map(({ name, label }) => ({ name, label }));
    const list = [...top(fams.gcc), ...top(fams.clang)];
    if (!list.length) throw new Error('empty list');
    return json(list, 200, { 'cache-control': 'public, max-age=3600' });
  } catch {
    return json(FALLBACK, 200, { 'cache-control': 'public, max-age=300' });
  }
}
