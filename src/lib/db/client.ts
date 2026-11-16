import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "campaigns.sqlite");

let sqlite: Database.Database | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

const DDL = `
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product TEXT NOT NULL,
  goal TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  market TEXT NOT NULL DEFAULT 'SE',
  region TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TEXT,
  ends_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_sec REAL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_variants (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  locale TEXT NOT NULL DEFAULT 'sv-SE',
  channel_hint TEXT,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  cta TEXT,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  channel TEXT NOT NULL,
  external_id TEXT,
  content_variant_id TEXT,
  material_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  publish_mode TEXT NOT NULL DEFAULT 'manual',
  confirmation_kind TEXT,
  post_url TEXT,
  campaign_link_id TEXT,
  last_attempt_id TEXT,
  published_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_attempts (
  id TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL REFERENCES publications(id),
  mode TEXT NOT NULL,
  outcome TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_message TEXT,
  response_json TEXT NOT NULL DEFAULT '{}',
  platform_post_id TEXT,
  platform_post_url TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  reconciled_from_attempt_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_handoffs (
  id TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL REFERENCES publications(id),
  campaign_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  post_url TEXT,
  platform_post_id TEXT,
  campaign_link_id TEXT,
  confirmation_kind TEXT NOT NULL,
  handed_off_at TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  publication_id TEXT,
  destination_url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  label TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversion_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT,
  link_id TEXT,
  publication_id TEXT,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  publication_id TEXT,
  metric TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  window_start TEXT,
  window_end TEXT,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

/** Additive migrations for DBs created by the skeleton before agent 3 columns. */
const MIGRATIONS = [
  `ALTER TABLE publications ADD COLUMN scheduled_at TEXT`,
  `ALTER TABLE publications ADD COLUMN publish_mode TEXT NOT NULL DEFAULT 'manual'`,
  `ALTER TABLE publications ADD COLUMN confirmation_kind TEXT`,
  `ALTER TABLE publications ADD COLUMN post_url TEXT`,
  `ALTER TABLE publications ADD COLUMN campaign_link_id TEXT`,
  `ALTER TABLE publications ADD COLUMN last_attempt_id TEXT`,
];

function columnExists(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return rows.some((r) => r.name === column);
}

function runMigrations(db: Database.Database) {
  for (const sql of MIGRATIONS) {
    const match = /ALTER TABLE (\w+) ADD COLUMN (\w+)/.exec(sql);
    if (!match) continue;
    const [, table, column] = match;
    if (columnExists(db, table, column)) continue;
    try {
      db.exec(sql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/duplicate column/i.test(message)) throw err;
    }
  }
}

export function getDbPath() {
  return DB_PATH;
}

export function getSqlite() {
  if (sqlite) return sqlite;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(DDL);
  runMigrations(sqlite);
  return sqlite;
}

export function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getSqlite(), { schema });
  return dbInstance;
}

export type AppDb = ReturnType<typeof getDb>;
