CREATE TABLE IF NOT EXISTS pageviews (
  event_id TEXT PRIMARY KEY,
  occurred_at INTEGER NOT NULL,
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer_host TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  asn INTEGER,
  network TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  device TEXT NOT NULL,
  language TEXT NOT NULL,
  is_bot INTEGER NOT NULL CHECK (is_bot IN (0, 1))
);
CREATE INDEX IF NOT EXISTS pageviews_time ON pageviews(occurred_at, event_id);
CREATE INDEX IF NOT EXISTS pageviews_visitor_time ON pageviews(visitor_id, occurred_at);
CREATE INDEX IF NOT EXISTS pageviews_path_time ON pageviews(path, occurred_at);
