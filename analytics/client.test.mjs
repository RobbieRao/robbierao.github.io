import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { randomUUID } from 'node:crypto';

const source = readFileSync(new URL('../site/assets/analytics.js', import.meta.url), 'utf8');
function visit(storage, { path = '/', origin = 'https://robbierao.github.io', now = Date.now(), privacy = false, brokenStorage = false } = {}) {
  const requests = [];
  const clock = class extends Date { static now() { return now; } };
  const context = {
    window: {}, location: { origin, pathname: path }, Date: clock, URL,
    navigator: { language: 'en-US', globalPrivacyControl: privacy }, crypto: { randomUUID },
    document: { currentScript: { dataset: { endpoint: 'https://example.workers.dev/collect' } },
      referrer: 'https://example.org/research?email=private', getElementById() { return null; } },
    localStorage: { getItem(k) { if (brokenStorage) throw new Error('Unavailable'); return storage.get(k) ?? null; },
      setItem(k, v) { if (brokenStorage) throw new Error('Unavailable'); storage.set(k, v); }, removeItem(k) { storage.delete(k); } },
    fetch(url, options) { requests.push({ url, ...options, event: JSON.parse(options.body) }); return Promise.resolve({ status: 204 }); },
  };
  runInNewContext(source, context);
  return { requests, context };
}

test('refreshes and CV navigation reuse browser/session IDs; 30 minute gaps start a new session', () => {
  const storage = new Map();
  const now = Date.now();
  const first = visit(storage, { now }).requests[0].event;
  const second = visit(storage, { path: '/cv/', now: now + 1000 }).requests[0].event;
  const later = visit(storage, { now: now + 31 * 60 * 1000 }).requests[0].event;
  assert.equal(first.visitor_id, second.visitor_id);
  assert.equal(first.session_id, second.session_id);
  assert.notEqual(first.event_id, second.event_id);
  assert.equal(first.visitor_id, later.visitor_id);
  assert.notEqual(first.session_id, later.session_id);
  assert.equal(first.referrer, 'https://example.org');
  assert.equal(first.ip_address, undefined);
  assert.notEqual(first.visitor_id, visit(new Map()).requests[0].event.visitor_id);
});

test('local previews, redirect/privacy pages, opt-outs and privacy signals never send events', () => {
  assert.equal(visit(new Map(), { origin: 'http://127.0.0.1:4178' }).requests.length, 0);
  assert.equal(visit(new Map(), { path: '/privacy/' }).requests.length, 0);
  assert.equal(visit(new Map(), { path: '/publications/' }).requests.length, 0);
  assert.equal(visit(new Map(), { privacy: true }).requests.length, 0);
  assert.equal(visit(new Map([['rr-analytics-optout', '1']])).requests.length, 0);
});

test('storage denial and duplicate script inclusion do not break a page or double count its view', () => {
  const first = visit(new Map(), { brokenStorage: true });
  assert.equal(first.requests.length, 1);
  assert.equal(first.requests[0].credentials, 'omit');
  runInNewContext(source, first.context);
  assert.equal(first.requests.length, 1);
});
