const SITE_ORIGIN = 'https://robbierao.github.io';
const CONTENT_PATHS = new Set([
  '/', '/cv/', '/design/liangzhu/', '/design/artisense/',
  '/design/swim-the-world/', '/design/digital-human/', '/design/water-shadows/',
  '/design/lightspoken/', '/design/lost-homeland/', '/design/multifunctional-cart/',
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 2048;
const BOT = /bot\b|spider|crawl|headless|preview|facebookexternalhit|slurp|wget|curl/i;

function text(value, limit = 128) {
  return typeof value === 'string' ? value.replace(/[\x00-\x1f\x7f]/g, '').slice(0, limit) : '';
}

function headers(origin) {
  const result = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
  if (origin === SITE_ORIGIN) result['Access-Control-Allow-Origin'] = SITE_ORIGIN;
  return result;
}

async function readEvent(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) throw 413;
  if (!request.body) throw 400;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); throw 413; }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  let event;
  try { event = JSON.parse(body); } catch { throw 400; }
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw 400;
  if (!UUID.test(event.event_id) || !UUID.test(event.visitor_id) || !UUID.test(event.session_id)) throw 400;
  if (!CONTENT_PATHS.has(event.path)) throw 400;
  let referrer = '';
  if (event.referrer) {
    try {
      const url = new URL(event.referrer);
      if (url.protocol === 'https:' || url.protocol === 'http:') referrer = text(url.hostname, 253);
    } catch { /* Missing or hidden referrers remain unknown. */ }
  }
  return { ...event, referrer };
}

function retentionDays(env) {
  const days = Number(env.RETENTION_DAYS || 365);
  if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Invalid retention period');
  return days;
}

const SUMMARY_DAYS = 365;
const SUMMARY_SQL = `WITH normalized AS (
  SELECT visitor_id, event_id, occurred_at,
    CASE WHEN UPPER(country) GLOB '[A-Z][A-Z]' AND UPPER(country) NOT IN ('XX', 'T1', 'ZZ')
      THEN UPPER(country) ELSE 'ZZ' END AS code
  FROM pageviews WHERE is_bot = 0 AND occurred_at >= ? AND occurred_at <= ?
), ranked AS (
  SELECT code, ROW_NUMBER() OVER (
    PARTITION BY visitor_id ORDER BY CASE WHEN code = 'ZZ' THEN 1 ELSE 0 END, occurred_at, event_id
  ) AS position FROM normalized
)
SELECT code, COUNT(*) AS visitors FROM ranked WHERE position = 1
GROUP BY code ORDER BY visitors DESC, code ASC`;

async function summary(request, env, ctx) {
  const url = new URL(request.url);
  const publicHeaders = {
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=300, s-maxage=900',
  };
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  // This fixed aggregate accepts no filters or identifiers and never returns raw records.
  if (url.search) return new Response('No query parameters supported', { status: 400 });
  if (!env.DB) return new Response('Unavailable', { status: 503 });
  try {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    const key = new Request(url.origin + '/summary-cache-v1');
    const cached = cache ? await cache.match(key) : null;
    if (cached) return cached;
    const now = Date.now();
    const rows = await env.DB.prepare(SUMMARY_SQL).bind(now - SUMMARY_DAYS * 86400000, now).all();
    const countries = rows.results.map(row => ({ code: row.code, visitors: Number(row.visitors) }));
    const response = Response.json({
      periodDays: SUMMARY_DAYS, trackingStarted: '2026-10-28',
      totalVisitors: countries.reduce((sum, row) => sum + row.visitors, 0),
      countryCount: countries.filter(row => row.code !== 'ZZ').length, countries,
    }, { headers: publicHeaders });
    if (cache && ctx) ctx.waitUntil(cache.put(key, response.clone()).catch(() => {}));
    return response;
  } catch {
    return new Response('Unavailable', { status: 503, headers: { ...publicHeaders, 'Cache-Control': 'no-store' } });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const responseHeaders = headers(origin);
    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({ ok: Boolean(env.DB) }, { status: env.DB ? 200 : 503, headers: responseHeaders });
    }
    if (url.pathname === '/summary') return summary(request, env, ctx);
    // Raw read/query/export access stays in the Cloudflare account.
    if (url.pathname !== '/collect') return new Response('Not found', { status: 404, headers: responseHeaders });
    if (origin !== SITE_ORIGIN) return new Response('Forbidden', { status: 403, headers: responseHeaders });
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        ...responseHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400',
      } });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: responseHeaders });
    if (!/^(application\/json|text\/plain)(;|$)/i.test(request.headers.get('Content-Type') || '')) {
      return new Response('Unsupported media type', { status: 415, headers: responseHeaders });
    }
    // Honour the browser's request not to be tracked, including direct collection requests.
    if (request.headers.get('DNT') === '1' || request.headers.get('Sec-GPC') === '1') {
      return new Response(null, { status: 204, headers: responseHeaders });
    }
    let event;
    try { event = await readEvent(request); }
    catch (status) { return new Response('Invalid event', { status: Number.isInteger(status) ? status : 400, headers: responseHeaders }); }
    if (!env.DB) return new Response('Unavailable', { status: 503, headers: responseHeaders });
    const cf = request.cf || {};
    const ua = text(request.headers.get('User-Agent'), 512);
    const ip = text(request.headers.get('CF-Connecting-IPv6') || request.headers.get('CF-Connecting-IP'), 64);
    try {
      await env.DB.prepare(`INSERT INTO pageviews
        (event_id, occurred_at, visitor_id, session_id, path, referrer_host,
         ip_address, country, region, city, asn, network, user_agent, device, language, is_bot)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_id) DO NOTHING`).bind(
        event.event_id.toLowerCase(), Date.now(), event.visitor_id.toLowerCase(), event.session_id.toLowerCase(),
        event.path, event.referrer, ip, text(cf.country, 2), text(cf.region), text(cf.city),
        Number.isInteger(cf.asn) ? cf.asn : null, text(cf.asOrganization), ua,
        /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop/other',
        text(event.language, 32), BOT.test(ua) || cf.botManagement?.verifiedBot ? 1 : 0,
      ).run();
      return new Response(null, { status: 204, headers: responseHeaders });
    } catch {
      // Never echo an IP, event payload, database error, or credential to the public endpoint.
      return new Response('Unavailable', { status: 503, headers: responseHeaders });
    }
  },
  async scheduled(_controller, env, ctx) {
    const cutoff = Date.now() - retentionDays(env) * 86400000;
    ctx.waitUntil(env.DB.prepare('DELETE FROM pageviews WHERE occurred_at < ?').bind(cutoff).run());
  },
};
