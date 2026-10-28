const WANDBOX = 'https://wandbox.org/api';
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

const STDS = new Set(['c++11', 'c++14', 'c++17', 'c++20', 'c++23', 'c++2c', 'gnu++20', 'gnu++23']);
const OPTS = new Set(['-O0', '-O1', '-O2', '-O3', '-Os']);
const MAX = 64 * 1024;

// POST /api/run { code, stdin, compiler, std, opt } -> Wandbox result
export async function onRequestPost({ request }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const code = String(b.code ?? ''), stdin = String(b.stdin ?? '');
  const compiler = String(b.compiler || 'gcc-head');
  const std = STDS.has(b.std) ? b.std : 'c++20';
  const opt = OPTS.has(b.opt) ? b.opt : '-O2';

  if (!code.trim()) return json({ error: 'No code' }, 400);
  if (code.length > MAX || stdin.length > MAX) return json({ error: 'Input too large (64 KB max)' }, 413);
  if (!/^[\w.+-]{1,64}$/.test(compiler)) return json({ error: 'Bad compiler name' }, 400);

  const t0 = Date.now();
  try {
    const r = await fetch(`${WANDBOX}/compile.json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        compiler, code, stdin,
        options: 'warning',
        'compiler-option-raw': `${opt}\n-std=${std}`,
      }),
    });
    if (!r.ok) return json({ error: `Compiler service error (${r.status}): ${(await r.text()).slice(0, 500)}` }, 502);
    const d = await r.json();
    return json({
      status: d.status ?? null,
      signal: d.signal || '',
      compile: d.compiler_message || '',
      stdout: d.program_output || '',
      stderr: d.program_error || '',
      ms: Date.now() - t0,
    });
  } catch (e) {
    return json({ error: `Compiler service unreachable: ${e.message || e}` }, 502);
  }
}
