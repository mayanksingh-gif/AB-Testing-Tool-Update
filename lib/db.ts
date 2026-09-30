import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

let db: DatabaseSync | null = null;

// Reuse a single connection across hot-reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __sqliteDb: DatabaseSync | undefined;
}

export function getDb(): DatabaseSync {
  if (global.__sqliteDb) {
    db = global.__sqliteDb;
    return db;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const instance = new DatabaseSync(DB_PATH);
  instance.exec("PRAGMA journal_mode = WAL");
  instance.exec("PRAGMA foreign_keys = ON");

  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  instance.exec(schema);
  migrate(instance);

  db = instance;
  global.__sqliteDb = instance;
  return instance;
}

// `CREATE TABLE IF NOT EXISTS` (above) never alters a table that already
// exists, so a pre-existing data/app.db from before a column was added to
// schema.sql needs an explicit, guarded ALTER TABLE. Safe to run on every
// startup: each ALTER is skipped once the column is present.
function migrate(instance: DatabaseSync): void {
  const hasColumn = (table: string, column: string): boolean => {
    const rows = instance.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return rows.some((r) => r.name === column);
  };

  if (!hasColumn("tests", "device_type")) {
    instance.exec(
      `ALTER TABLE tests ADD COLUMN device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile'))`
    );
  }
  if (!hasColumn("tests", "template_id")) {
    instance.exec(`ALTER TABLE tests ADD COLUMN template_id TEXT`);
  }
  if (!hasColumn("sessions", "device_type")) {
    instance.exec(
      `ALTER TABLE sessions ADD COLUMN device_type TEXT NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('desktop', 'mobile'))`
    );
  }
  if (!hasColumn("tests", "post_test_question")) {
    instance.exec(`ALTER TABLE tests ADD COLUMN post_test_question TEXT`);
  }
  if (!hasColumn("usability_studies", "final_question")) {
    instance.exec(`ALTER TABLE usability_studies ADD COLUMN final_question TEXT`);
  }
}

// Allows running `npm run db:init` directly to create the DB file.
if (require.main === module) {
  getDb();
  console.log(`SQLite database initialized at ${DB_PATH}`);
}
