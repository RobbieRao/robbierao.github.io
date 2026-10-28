-- Rolling 30 days; IPs and visitor identifiers stay out of this summary.
SELECT date(occurred_at / 1000, 'unixepoch', '+8 hours') AS hong_kong_date,
       COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS unique_browsers,
       COUNT(DISTINCT session_id) AS sessions
FROM pageviews WHERE is_bot = 0 AND occurred_at >= (unixepoch() - 30 * 86400) * 1000
GROUP BY hong_kong_date ORDER BY hong_kong_date;

-- Unique browsers over the whole window are distinct here, not sums of daily uniques.
SELECT COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS unique_browsers,
       COUNT(DISTINCT session_id) AS sessions
FROM pageviews WHERE is_bot = 0 AND occurred_at >= (unixepoch() - 30 * 86400) * 1000;

SELECT path, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS unique_browsers
FROM pageviews WHERE is_bot = 0 AND occurred_at >= (unixepoch() - 30 * 86400) * 1000
GROUP BY path ORDER BY pageviews DESC;

SELECT referrer_host, COUNT(*) AS pageviews
FROM pageviews WHERE is_bot = 0 AND occurred_at >= (unixepoch() - 30 * 86400) * 1000
GROUP BY referrer_host ORDER BY pageviews DESC;
