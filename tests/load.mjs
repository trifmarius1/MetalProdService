/**
 * Concurrency + short stress probe against the preview server.
 */
const BASE = process.env.LOAD_URL || "http://127.0.0.1:4173/";
const USERS = Number(process.env.LOAD_USERS || 80);
const ROUNDS = Number(process.env.LOAD_ROUNDS || 4);
const PATHS = ["/", "/favicon.svg", "/images/FactoryPhoto.JPG", "/images/Factory_Interior.JPG"];

async function hit(path) {
  const t0 = performance.now();
  const res = await fetch(new URL(path, BASE));
  const buf = await res.arrayBuffer();
  return { ok: res.ok, ms: performance.now() - t0, bytes: buf.byteLength, status: res.status, path };
}

const results = [];
for (let round = 0; round < ROUNDS; round++) {
  const jobs = [];
  for (let i = 0; i < USERS; i++) jobs.push(hit(PATHS[i % PATHS.length]));
  results.push(...(await Promise.all(jobs)));
}

const failed = results.filter((r) => !r.ok);
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const p99 = times[Math.min(times.length - 1, Math.floor(times.length * 0.99))];
const avg = times.reduce((a, b) => a + b, 0) / times.length;

console.log(
  JSON.stringify(
    {
      users: USERS,
      rounds: ROUNDS,
      total: results.length,
      failed: failed.length,
      avgMs: +avg.toFixed(1),
      p99Ms: +p99.toFixed(1),
    },
    null,
    2,
  ),
);
if (failed.length) {
  console.error(failed.slice(0, 5));
  process.exit(1);
}
if (p99 > 1500) {
  console.error("p99 too high for local static serve:", p99);
  process.exit(1);
}
