import { PGlite } from '@electric-sql/pglite';
import { queryRows } from './queryRows';

let dbInstance: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (dbInstance) return dbInstance;
  dbInstance = new PGlite('idb://keepr-db');
  await initSchema(dbInstance);
  return dbInstance;
}

async function initSchema(db: PGlite) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'password',
      color TEXT NOT NULL DEFAULT '#6b7280',
      favorite BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      username TEXT DEFAULT '',
      password TEXT DEFAULT '',
      website TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      favorite BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      favorite BOOLEAN NOT NULL DEFAULT false,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      tags TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PHP',
      category TEXT DEFAULT '',
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      item_name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      display_name TEXT NOT NULL DEFAULT 'Ren',
      theme TEXT NOT NULL DEFAULT 'dark',
      accent_color TEXT NOT NULL DEFAULT '#3b82f6',
      font_size TEXT NOT NULL DEFAULT 'medium',
      auto_lock BOOLEAN NOT NULL DEFAULT true,
      clipboard_clear BOOLEAN NOT NULL DEFAULT true,
      show_website_icons BOOLEAN NOT NULL DEFAULT true
    );
  `);

  const settings = await db.query<Record<string, unknown>>('SELECT id FROM app_settings WHERE id = 1');
  if (queryRows(settings).length === 0) {
    await db.query(
      `INSERT INTO app_settings (id, display_name, theme, accent_color, font_size, auto_lock, clipboard_clear, show_website_icons)
       VALUES (1, 'Ren', 'dark', '#3b82f6', 'medium', true, true, true)`
    );
  }
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function now(): string {
  return new Date().toISOString();
}
