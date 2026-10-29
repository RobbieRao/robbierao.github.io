import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../site/assets/visitor-countries.js', import.meta.url), 'utf8');
function element() {
  return { children: [], textContent: '', hidden: true, dataset: {},
    append(...nodes) { this.children.push(...nodes); }, addEventListener() {}, setAttribute() {}, remove() {} };
}
async function render(data, ok = true) {
  const ids = new Map(['visitor-origins', 'visitor-status', 'visitor-total', 'visitor-locations', 'visitor-countries',
    'visitor-more', 'visitor-more-label', 'visitor-other-countries'].map(id => [id, element()]));
  ids.get('visitor-origins').dataset.endpoint = 'https://robbierao-visitor-analytics.fengguirao.workers.dev/summary';
  const requests = [];
  await runInNewContext(source, { Intl, URL, AbortSignal,
    document: { getElementById: id => ids.get(id), createElement: () => element() },
    fetch: async (url, options) => { requests.push({ url, options }); return { ok, json: async () => data }; },
  });
  return { ids, requests };
}

test('country summary renders local flags and expands the remainder without collecting another visit', async () => {
  const countries = ['JP', 'SG', 'HK', 'US', 'GB', 'CN', 'FR', 'DE', 'AU'].map(code => ({ code, visitors: 1 }));
  const { ids, requests } = await render({ periodDays: 365, totalVisitors: 9, countries });
  assert.equal(ids.get('visitor-total').textContent, '9');
  assert.equal(ids.get('visitor-locations').textContent, '9');
  assert.equal(ids.get('visitor-countries').children.length, 8);
  assert.equal(ids.get('visitor-other-countries').children.length, 1);
  assert.equal(ids.get('visitor-more').hidden, false);
  assert.equal(ids.get('visitor-countries').children[0].children[0].src, '/assets/flags/jp.svg');
  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.endsWith('/summary'));
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.body, undefined);
});

test('invalid totals and failed requests show unavailable instead of a false zero', async () => {
  for (const [data, ok] of [[{ periodDays: 365, totalVisitors: 2, countries: [{ code: 'JP', visitors: 1 }] }, true], [{}, false]]) {
    const { ids } = await render(data, ok);
    assert.equal(ids.get('visitor-status').textContent, 'Visitor statistics are temporarily unavailable.');
    assert.equal(ids.get('visitor-total').textContent, '');
    assert.equal(ids.get('visitor-countries').children.length, 0);
  }
  const { ids } = await render({ periodDays: 365, totalVisitors: 0, countries: [] });
  assert.equal(ids.get('visitor-total').textContent, '0');
  assert.equal(ids.get('visitor-status').textContent, 'No visits recorded yet.');
});
