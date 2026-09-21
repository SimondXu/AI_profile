import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getDatabasePath } from "./config";

declare global {
  var trackingDatabase: Database.Database | undefined;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tracking_sessions (
      id TEXT PRIMARY KEY,
      ip_hash TEXT NOT NULL,
      ip_ciphertext TEXT NOT NULL,
      country_code TEXT,
      country_name TEXT,
      asn TEXT,
      as_name TEXT,
      as_domain TEXT,
      attribution_confidence TEXT NOT NULL DEFAULT 'low',
      device_type TEXT,
      browser_family TEXT,
      first_seen_at INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      is_bot INTEGER NOT NULL DEFAULT 0,
      is_internal INTEGER NOT NULL DEFAULT 0
    );
  `);
  // Event types are validated in TypeScript (see ./events.ts). Earlier schemas
  // carried a CHECK constraint that SQLite cannot alter, so a table that still
  // has it, or lacks the target/detail columns, is rebuilt once transactionally.
  const existingEventTable = database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tracking_events'")
    .get() as { sql: string } | undefined;
  const eventTableSql = `
    CREATE TABLE tracking_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      pathname TEXT NOT NULL,
      referrer_host TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      prompt_ciphertext TEXT,
      prompt_length INTEGER,
      chat_outcome TEXT,
      target TEXT,
      detail TEXT,
      occurred_at INTEGER NOT NULL
    );
  `;

  if (!existingEventTable) {
    database.exec(eventTableSql);
  } else if (existingEventTable.sql.includes("CHECK") || !existingEventTable.sql.includes("target")) {
    database.transaction(() => {
      database.exec(`
        DROP INDEX IF EXISTS tracking_events_occurred_at;
        DROP INDEX IF EXISTS tracking_events_type_time;
        DROP INDEX IF EXISTS tracking_events_session_time;
        ALTER TABLE tracking_events RENAME TO tracking_events_legacy;
        ${eventTableSql}
        INSERT INTO tracking_events (
          id, session_id, event_type, pathname, referrer_host, utm_source, utm_medium,
          utm_campaign, prompt_ciphertext, prompt_length, chat_outcome, occurred_at
        ) SELECT
          id, session_id, event_type, pathname, referrer_host, utm_source, utm_medium,
          utm_campaign, prompt_ciphertext, prompt_length, chat_outcome, occurred_at
        FROM tracking_events_legacy;
        DROP TABLE tracking_events_legacy;
      `);
    })();
  }

  database.exec(`
    CREATE INDEX IF NOT EXISTS tracking_events_occurred_at ON tracking_events(occurred_at);
    CREATE INDEX IF NOT EXISTS tracking_events_type_time ON tracking_events(event_type, occurred_at);
    CREATE INDEX IF NOT EXISTS tracking_events_session_time ON tracking_events(session_id, occurred_at);
    CREATE INDEX IF NOT EXISTS tracking_events_target ON tracking_events(event_type, target);
    CREATE INDEX IF NOT EXISTS tracking_sessions_ip_hash ON tracking_sessions(ip_hash);
    CREATE INDEX IF NOT EXISTS tracking_sessions_as_domain ON tracking_sessions(as_domain);
  `);
}

export function getTrackingDatabase() {
  if (global.trackingDatabase) return global.trackingDatabase;
  const path = getDatabasePath();
  mkdirSync(dirname(path), { recursive: true });
  const database = new Database(path);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 3000");
  migrate(database);
  global.trackingDatabase = database;
  return database;
}
