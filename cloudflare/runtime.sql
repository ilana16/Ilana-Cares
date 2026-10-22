CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  recordId INTEGER NOT NULL,
  payload TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  nextAttemptAt INTEGER NOT NULL DEFAULT 0,
  leaseUntil INTEGER NOT NULL DEFAULT 0,
  sentAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(sentAt,nextAttemptAt);
CREATE TABLE IF NOT EXISTS submission_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);
