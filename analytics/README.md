# Private visitor analytics

The website stays on GitHub Pages. A small Cloudflare Worker accepts page-view events and writes to a private D1 database. There is no public log-reading, dashboard, or export endpoint. A fixed `GET /summary` exposes only country/region aggregate counts for the homepage footer. The owner uses the Cloudflare dashboard or Wrangler account login to read records and export CSV.

## Production deployment

The collector is deployed at `https://robbierao-visitor-analytics.fengguirao.workers.dev`, bound to the private D1 database `robbierao-visitor-analytics`. The ten content pages use its `/collect` endpoint. Account/database IDs remain in the ignored `wrangler.local.jsonc`; reuse this config for updates rather than recreating the database. `GET /health` checks the binding. The production verification confirmed three views from two browser IDs, duplicate-event handling, connection IP recording, origin/privacy controls, private read boundaries, and CSV export; its synthetic rows were removed afterward.

Cloudflare may reject Python's default `urllib` user agent on `workers.dev` with error 1010 before a request reaches the Worker. For CLI diagnostics, send a descriptive application User-Agent; normal browser requests supply their own. See [Cloudflare's explanation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/). Do not change security settings to work around a diagnostic client header.

## Counting and data

- One event is one content-page load. The homepage, CV, and eight design pages are eligible. Hash changes, redirect pages, local previews, and the privacy page do not create extra views.
- A random first-party browser ID persists in localStorage. Repeated page loads share this ID; another browser/device or cleared storage produces another ID. A 30-minute gap between recorded page views starts a new session. Disabled storage limits deduplication.
- IPs come from Cloudflare's connection headers, never from a client-supplied event field. Country, region, city, ASN and network metadata are approximate. Browser headers, device category, language, time, page path, and referring host are also recorded. URL queries/fragments and referring paths are not recorded.
- IPs are not person identifiers. Shared IPs do not merge distinct browser IDs. Uniqueness across a date range must use `COUNT(DISTINCT visitor_id)` for the entire range, not the sum of daily unique counts.
- Global Privacy Control, Do Not Track, and the privacy-page opt-out disable collection. The existing Hits badge is a separate public PV service and is not controlled by this setting.
- Simple bot detection marks suspected bots; reports exclude marked bots by default. It is a heuristic, not proof that all remaining traffic is human.
- Raw records have a 365-day retention period, pruned daily at 18:00 UTC / 02:00 Hong Kong time. Private exports may be retained separately by the owner. This is not indefinite raw-log retention.

## Initial deployment

Wrangler is pinned to the verified CLI version. Reuse an existing login or have the owner complete the Cloudflare login/consent flow. No Cloudflare credential belongs in this repository or the frontend.

```sh
npx --yes wrangler@4.154.0 login --scopes account:read user:read workers_scripts:write d1:write
cp analytics/wrangler.jsonc analytics/wrangler.local.jsonc
npx --yes wrangler@4.154.0 d1 create robbierao-visitor-analytics --location apac --binding DB --update-config --config analytics/wrangler.local.jsonc
npx --yes wrangler@4.154.0 d1 execute DB --remote --config analytics/wrangler.local.jsonc --file analytics/schema.sql
npx --yes wrangler@4.154.0 deploy --config analytics/wrangler.local.jsonc
```

Use the actual deployed `workers.dev` address. Check its `/health` endpoint and verify a write privately, then activate the website:

```sh
python3 analytics/install.py https://ACTUAL-WORKER.ACTUAL-SUBDOMAIN.workers.dev/collect
python3 scripts/check_site.py
```

The uppercase URL above is an example, not a configured endpoint. `install.py` adds the same real endpoint to ten content pages and links the privacy page from their footers. Deploy the website through its normal pull-request and Pages workflow only after the collector is ready. The base `wrangler.jsonc` deliberately has no production database binding; the account/database configuration is kept in the ignored local config.

## Inspect and export

Use the D1 database's Console / Explore view while logged into the owner's Cloudflare account. Aggregated queries in `report.sql` show daily views, unique browsers, sessions, top content, and referring sites without exposing raw IPs in the summary.

```sh
npx --yes wrangler@4.154.0 d1 execute DB --remote --config analytics/wrangler.local.jsonc --file analytics/report.sql
python3 analytics/export.py --since 2026-10-28 --until 2026-11-01
```

Export dates use Hong Kong local midnight: `--since` is inclusive and `--until` is exclusive. The CSV includes full IPs and uses keyset pagination, including when several events share a timestamp. Output files are created with mode 0600 in the ignored `analytics/exports/` directory, are never overwritten, and are escaped against spreadsheet formulas. The command prints row count and path, not visitor records. `--local` and `--config` support a test database. Do not add raw logs or exports to the public site/repository.

## Validation

```sh
node --test analytics/worker.test.mjs analytics/client.test.mjs analytics/visitor-countries.test.mjs
python3 -m unittest discover -s analytics -p 'test_*.py'
python3 scripts/check_site.py
npx --yes wrangler@4.154.0 deploy --dry-run --config analytics/wrangler.jsonc
```

The worker tests use real in-memory SQLite for inserts, constraints, deduplication queries, invalid requests, private read access, and retention. Client tests cover browser/session reuse, local/redirect exclusions, privacy signals, and storage failures. Collection requests are untrusted public input; the origin check, strict path/UUID/body validation and prepared SQL protect data boundaries, but an origin header is not a secret or complete anti-spam protection. Caching, browser privacy settings, blocked scripts, and network failures can make analytics undercount.

## Official references

- [D1 prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare client IP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
- [Worker request metadata](https://developers.cloudflare.com/workers/runtime-apis/request/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)

## Public country/region summary

`GET /summary` returns `periodDays`, `trackingStarted`, `totalVisitors`, `countryCount`, and `countries` (`code`, `visitors`). It accepts no query parameters, custom filters, writes, or identifiers. No raw IP, browser ID, event ID, time, browsing path, referrer, city, or network is returned. Raw read/export access remains account-only.

The SQL ranks each browser's records across a rolling 365-day window, excluding marked bots, expired records, and future timestamps. Each browser is assigned once to its earliest known country/region within that window; if all locations are unknown it belongs to `ZZ`. Country counts therefore sum to the overall unique-browser total. This is browser deduplication, not a count of identified people or nationality. The summary has a five-minute browser cache and fifteen-minute edge cache with one fixed cache key; failed queries return unavailable rather than a fabricated zero.

The homepage's `visitor-countries.js` fetches this read-only summary without cookies and renders up to eight locations, with an expandable remainder. Loading, no-data, and unavailable states are distinct. It does not create a page-view event or read browser identifiers. The existing collection script and Hits badge keep their separate behavior. Flags are hosted locally from the MIT-licensed `flag-icons` 7.6.0 package; no flag-image third party receives visitors' requests. The package license and source hash are in `site/assets/flags/`.

Validation includes real SQLite deduplication across pages/countries, bot/date filtering, no private fields, no query filters, and no summary writes. Deploy Worker changes with the existing ignored config before publishing frontend changes:

```sh
npx --yes wrangler@4.154.0 deploy --config analytics/wrangler.local.jsonc
```
