CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE, password_hash TEXT,
  is_guest INTEGER NOT NULL DEFAULT 0, email_verified INTEGER NOT NULL DEFAULT 0, verify_hash TEXT, verify_expires TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));
CREATE TABLE IF NOT EXISTS ratings (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, control TEXT CHECK (control IN ('bullet','blitz','rapid')),
  rating REAL NOT NULL DEFAULT 400, rd REAL NOT NULL DEFAULT 350, vol REAL NOT NULL DEFAULT 0.06, games INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, control));
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT, white_id INTEGER REFERENCES users(id), black_id INTEGER REFERENCES users(id), bot_id TEXT,
  control TEXT NOT NULL, rated INTEGER NOT NULL DEFAULT 0, pgn TEXT NOT NULL, result TEXT NOT NULL,
  played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));
CREATE TABLE IF NOT EXISTS analyses (game_id INTEGER PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE, moves TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')));
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, lesson_id TEXT, step INTEGER, solved INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, lesson_id, step));
CREATE INDEX IF NOT EXISTS games_white_idx ON games (white_id);
CREATE INDEX IF NOT EXISTS games_black_idx ON games (black_id);
