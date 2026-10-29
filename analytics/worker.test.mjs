import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from './worker.mjs';
const SITE_ORIGIN = 'https://robbierao.github.io';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
function database() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  const DB = { prepare(sql) { return { bind(...args) { return { async run() { return sqlite.prepare(sql).run(...args); }, async all() { return { results: sqlite.prepare(sql).all(...args) }; } }; } }; } };
  return { sqlite, env: { DB, RETENTION_DAYS: '365' } };
}
function event(extra = {}) {
  return { event_id: crypto.randomUUID(), visitor_id: crypto.randomUUID(), session_id: crypto.randomUUID(),
    path: '/', referrer: 'https://example.org/private/path?email=hidden', language: 'en-US', ...extra };
}
function request(payload, extra = {}) {
  const req = new Request('https://collector.example/collect', { method: 'POST', headers: {
    Origin: SITE_ORIGIN, 'Content-Type': 'text/plain;charset=UTF-8',
    'CF-Connecting-IP': '192.0.2.24', 'User-Agent': 'ExampleBrowser/1.0', ...extra,
  }, body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  Object.defineProperty(req, 'cf', { value: { country: 'HK', city: 'Hong Kong', asn: 64500, asOrganization: 'Example Network' } });
  return req;
}

test('a recorded view uses server time/IP and discards referrer paths; retries are idempotent', async () => {
  const { sqlite, env } = database();
  const value = event({ ip_address: '203.0.113.99', occurred_at: 1 });
  const before = Date.now();
  const response = await worker.fetch(request(value), env);
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), SITE_ORIGIN);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const row = sqlite.prepare('SELECT * FROM pageviews').get();
  assert.equal(row.ip_address, '192.0.2.24');
  assert.equal(row.referrer_host, 'example.org');
  assert.ok(row.occurred_at >= before);
  assert.equal(row.country, 'HK');
  assert.equal(await response.text(), '');
  assert.equal((await worker.fetch(request(value), env)).status, 204);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n, 1);
  sqlite.close();
});

test('repeat views share a visitor while distinct browsers behind one IP stay distinct', async () => {
  const { sqlite, env } = database();
  const first = event();
  await worker.fetch(request(first), env);
  await worker.fetch(request(event({ visitor_id: first.visitor_id, session_id: first.session_id, path: '/cv/' })), env);
  await worker.fetch(request(event()), env);
  const counts = sqlite.prepare('SELECT COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv, COUNT(DISTINCT session_id) AS sessions FROM pageviews').get();
  assert.deepEqual({ ...counts }, { pv: 3, uv: 2, sessions: 2 });
  sqlite.close();
});

test('unknown origins, malformed/oversized events and unknown pages cannot write logs', async () => {
  const { sqlite, env } = database();
  assert.equal((await worker.fetch(request(event(), { Origin: 'https://unrelated.example' }), env)).status, 403);
  assert.equal((await worker.fetch(request(event(), { Origin: 'null' }), env)).status, 403);
  assert.equal((await worker.fetch(request('{bad json'), env)).status, 400);
  assert.equal((await worker.fetch(request(event({ visitor_id: "'; DROP TABLE pageviews;--" })), env)).status, 400);
  assert.equal((await worker.fetch(request(event({ path: '/unknown/?token=hidden' })), env)).status, 400);
  assert.equal((await worker.fetch(request('x'.repeat(3000)), env)).status, 413);
  assert.equal((await worker.fetch(request(event(), { 'Content-Type': 'application/octet-stream' }), env)).status, 415);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n, 0);
  sqlite.close();
});

test('privacy signals skip collection and no public request can read/export stored data', async () => {
  const { sqlite, env } = database();
  assert.equal((await worker.fetch(request(event(), { DNT: '1' }), env)).status, 204);
  assert.equal((await worker.fetch(request(event(), { 'Sec-GPC': '1' }), env)).status, 204);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n, 0);
  for (const path of ['/collect', '/export', '/logs', '/admin', '/pageviews']) {
    const response = await worker.fetch(new Request('https://collector.example' + path, { headers: { Origin: SITE_ORIGIN } }), env);
    assert.ok([404, 405].includes(response.status));
    assert.ok(!(await response.text()).includes('192.0.2.24'));
  }
  sqlite.close();
});

test('bots are marked and only expired records are pruned by the configured retention', async () => {
  const { sqlite, env } = database();
  const old = event();
  await worker.fetch(request(old, { 'User-Agent': 'ExampleBot/1.0' }), env);
  assert.equal(sqlite.prepare('SELECT is_bot FROM pageviews WHERE event_id=?').get(old.event_id).is_bot, 1);
  sqlite.prepare('UPDATE pageviews SET occurred_at=? WHERE event_id=?').run(Date.now() - 366 * 86400000, old.event_id);
  await worker.fetch(request(event()), env);
  let scheduled;
  await worker.scheduled({}, env, { waitUntil(promise) { scheduled = promise; } });
  await scheduled;
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n, 1);
  sqlite.close();
});

test('public summary deduplicates browsers across pages and locations, excludes bots and expired/future views', async () => {
  const { sqlite, env } = database();
  const first = event();
  await worker.fetch(request(first), env);
  await worker.fetch(request(event({ visitor_id: first.visitor_id, path: '/cv/' })), env);
  const secondLocation = event({ visitor_id: first.visitor_id });
  await worker.fetch(request(secondLocation), env);
  sqlite.prepare('UPDATE pageviews SET country=?, occurred_at=? WHERE event_id=?').run('US', Date.now() - 1000, secondLocation.event_id);
  sqlite.prepare('UPDATE pageviews SET occurred_at=? WHERE event_id=?').run(Date.now() - 20000, first.event_id);
  const other = event(); await worker.fetch(request(other), env);
  sqlite.prepare('UPDATE pageviews SET country=? WHERE event_id=?').run('SG', other.event_id);
  const unknown = event(); await worker.fetch(request(unknown), env);
  sqlite.prepare('UPDATE pageviews SET country=? WHERE event_id=?').run('', unknown.event_id);
  await worker.fetch(request(event(), { 'User-Agent': 'ExampleBot/1.0' }), env);
  const expired = event(); await worker.fetch(request(expired), env);
  sqlite.prepare('UPDATE pageviews SET occurred_at=? WHERE event_id=?').run(Date.now() - 366 * 86400000, expired.event_id);
  const future = event(); await worker.fetch(request(future), env);
  sqlite.prepare('UPDATE pageviews SET occurred_at=? WHERE event_id=?').run(Date.now() + 86400000, future.event_id);
  const response = await worker.fetch(new Request('https://collector.example/summary'), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(response.headers.get('Cache-Control'), /s-maxage=900/);
  assert.deepEqual(await response.json(), { periodDays: 365, trackingStarted: '2026-10-28', totalVisitors: 3, countryCount: 2,
    countries: [{ code: 'HK', visitors: 1 }, { code: 'SG', visitors: 1 }, { code: 'ZZ', visitors: 1 }] });
  const body = await (await worker.fetch(new Request('https://collector.example/summary'), env)).text();
  for (const privateValue of ['192.0.2.24', first.visitor_id, first.event_id, 'example.org', 'Hong Kong']) assert.ok(!body.includes(privateValue));
  sqlite.close();
});

test('public summary has no filters or writes and empty/unavailable results stay distinct', async () => {
  const { sqlite, env } = database();
  const empty = await worker.fetch(new Request('https://collector.example/summary'), env);
  assert.equal((await empty.json()).totalVisitors, 0);
  assert.equal((await worker.fetch(new Request('https://collector.example/summary?visitor_id=anything'), env)).status, 400);
  assert.equal((await worker.fetch(new Request('https://collector.example/summary', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://collector.example/summary'), {})).status, 503);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM pageviews').get().n, 0);
  sqlite.close();
});
