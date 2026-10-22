-- Ilana Cares D1 staging schema, based on drizzle/schema.ts.
-- Create-only. Existing MySQL records must be imported separately after backup.
-- Keep schema data-free in Git; never commit customer records or SQL dumps.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  loginMethod TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  lastSignedIn TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  startTime TEXT NOT NULL,
  duration INTEGER NOT NULL,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  numChildren INTEGER NOT NULL,
  additionalInfo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  publicName TEXT NOT NULL,
  email TEXT,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reply TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notificationSentAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_reviews_status_created ON reviews(status, createdAt);
