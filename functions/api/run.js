const GODBOLT = 'https://godbolt.org/api';
const WANDBOX = 'https://wandbox.org/api';
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

const STDS = new Set(['c++11', 'c++14', 'c++17', 'c++20', 'c++23', 'c++2c', 'gnu++20', 'gnu++23']);
const OPTS = new Set(['-O0', '-O1', '-O2', '-O3', '-Os']);
const MAX = 64 * 1024;

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
const lines = (a) => stripAnsi((a || []).map((l) => l.text).join('\n'));

// Compiler Explorer (primary): fast, current compilers
async function godbolt({ compiler, code, stdin, std, opt }) {
  const r = await fetch(`${GODBOLT}/compiler/${compiler}/compile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', 'user-agent': 'cpp-compiler-pages' },
    body: JSON.stringify({
      source: code,
      lang: 'c++',
      options: {
        userArguments: `${opt} -std=${std} -Wall -Wextra`,
        executeParameters: { args: [], stdin },
        compilerOptions: { executorRequest: true },
        filters: { execute: true },
        tools: [],
        libraries: [],
      },
      allowStoreCodeDebug: false,
    }),
  });
  if (!r.ok) throw new Error(`Compiler Explorer ${r.status}`);
  const d = await r.json();
  const b = d.buildResult || {};
  // When the program didn't run, the top-level stdout/stderr carry the reason (e.g. "Build failed")
  const compile = [lines(b.stdout), lines(b.stderr), d.didExecute ? '' : lines(d.stdout), d.didExecute ? '' : lines(d.stderr)]
    .filter(Boolean).join('\n');
  if (!d.didExecute && !compile) throw new Error(`Compiler Explorer returned no result (code ${d.code})`);
  return {
    status: String(d.didExecute ? d.code : (b.code ?? d.code)),
    signal: d.timedOut ? 'Timed out' : '',
    compile,
    stdout: d.didExecute ? lines(d.stdout) : '',
    stderr: d.didExecute ? lines(d.stderr) : '',
    engine: 'Compiler Explorer',
  };
}

// Wandbox (fallback)
async function wandbox({ compiler, code, stdin, std, opt }) {
  const r = await fetch(`${WANDBOX}/compile.json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      compiler: compiler.startsWith('clang') ? 'clang-17.0.1' : 'gcc-13.2.0',
      code, stdin,
      options: 'warning',
      'compiler-option-raw': `${opt}\n-std=${std}`,
    }),
  });
  if (!r.ok) throw new Error(`Wandbox ${r.status}`);
  const d = await r.json();
  return {
    status: d.status ?? null,
    signal: d.signal || '',
    compile: d.compiler_message || '',
    stdout: d.program_output || '',
    stderr: d.program_error || '',
    engine: 'Wandbox',
  };
}

// POST /api/run { code, stdin, compiler, std, opt } -> { status, signal, compile, stdout, stderr, ms, engine }
export async function onRequestPost({ request }) {
  let b;
  try { b = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const job = {
    code: String(b.code ?? ''),
    stdin: String(b.stdin ?? ''),
    compiler: String(b.compiler || 'g162'),
    std: STDS.has(b.std) ? b.std : 'c++20',
    opt: OPTS.has(b.opt) ? b.opt : '-O2',
  };
  if (!job.code.trim()) return json({ error: 'No code' }, 400);
  if (job.code.length > MAX || job.stdin.length > MAX) return json({ error: 'Input too large (64 KB max)' }, 413);
  if (!/^[\w.+-]{1,64}$/.test(job.compiler)) return json({ error: 'Bad compiler name' }, 400);
  // Old Wandbox-style names (e.g. "gcc-head") from a cached compiler list -> newest Compiler Explorer build
  if (!/^(g|clang)\d+$/.test(job.compiler)) job.compiler = job.compiler.startsWith('clang') ? 'clang2310' : 'g162';

  const t0 = Date.now();
  const errors = [];
  for (const engine of [godbolt, wandbox]) {
    try {
      return json({ ...(await engine(job)), ms: Date.now() - t0 });
    } catch (e) {
      errors.push(e.message || String(e));
    }
  }
  return json({ error: `Compiler services unavailable: ${errors.join('; ')}` }, 502);
}
