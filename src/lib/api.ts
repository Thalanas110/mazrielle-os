import { getDb, genId, now } from './db';
import { logActivity } from './seed';
import type { Folder, Credential, Note, Task, Income, ActivityLog, AppSettings } from './types';
import { DEFAULT_SETTINGS as DEFAULTS } from './types';
import { queryRows } from './queryRows';

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const res = await db.query('SELECT * FROM app_settings WHERE id = 1');
  const rows = queryRows(res as { rows: Record<string, unknown>[] });
  if (rows.length === 0) return { ...DEFAULTS };
  const r = rows[0];
  return {
    display_name: String(r.display_name),
    theme: String(r.theme) as AppSettings['theme'],
    accent_color: String(r.accent_color),
    font_size: String(r.font_size) as AppSettings['font_size'],
    auto_lock: Boolean(r.auto_lock),
    clipboard_clear: Boolean(r.clipboard_clear),
    show_website_icons: Boolean(r.show_website_icons),
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const db = await getDb();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.query(
    `UPDATE app_settings SET display_name=$1, theme=$2, accent_color=$3, font_size=$4, auto_lock=$5, clipboard_clear=$6, show_website_icons=$7 WHERE id=1`,
    [next.display_name, next.theme, next.accent_color, next.font_size, next.auto_lock, next.clipboard_clear, next.show_website_icons]
  );
}

export async function getFolders(type?: string): Promise<Folder[]> {
  const db = await getDb();
  const res = type
    ? await db.query<Record<string, unknown>>('SELECT * FROM folders WHERE type=$1 ORDER BY favorite DESC, name ASC', [type])
    : await db.query<Record<string, unknown>>('SELECT * FROM folders ORDER BY favorite DESC, name ASC');
  return queryRows(res).map(parseFolder);
}

export async function createFolder(name: string, type: string, color: string): Promise<Folder> {
  const db = await getDb();
  const id = genId();
  const t = now();
  await db.query(
    `INSERT INTO folders (id, name, type, color, favorite, created_at, updated_at) VALUES ($1,$2,$3,$4,false,$5,$5)`,
    [id, name, type, color, t]
  );
  await logActivity('Folders', 'Created', name);
  return { id, name, type: type as Folder['type'], color, favorite: false, created_at: t, updated_at: t };
}

export async function updateFolder(id: string, patch: Partial<Folder>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (['name', 'color', 'favorite'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      values.push(v);
      idx++;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at=$${idx}`);
  values.push(now());
  values.push(id);
  await db.query(`UPDATE folders SET ${fields.join(', ')} WHERE id=$${idx + 1}`, values);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM folders WHERE id=$1', [id]);
  await logActivity('Folders', 'Deleted', id);
}

export async function getCredentials(folderId?: string | null): Promise<Credential[]> {
  const db = await getDb();
  const res = folderId !== undefined
    ? await db.query<Record<string, unknown>>('SELECT * FROM credentials WHERE folder_id IS NOT DISTINCT FROM $1 ORDER BY favorite DESC, title ASC', [folderId])
    : await db.query<Record<string, unknown>>('SELECT * FROM credentials ORDER BY favorite DESC, title ASC');
  return queryRows(res).map(parseCredential);
}

export async function createCredential(data: Partial<Credential>): Promise<Credential> {
  const db = await getDb();
  const id = genId();
  const t = now();
  await db.query(
    `INSERT INTO credentials (id, folder_id, title, username, password, website, notes, tags, favorite, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
    [id, data.folder_id ?? null, data.title ?? '', data.username ?? '', data.password ?? '', data.website ?? '', data.notes ?? '', data.tags ?? '', data.favorite ?? false, t]
  );
  await logActivity('Vault', 'Created', data.title ?? 'Credential');
  return { id, folder_id: data.folder_id ?? null, title: data.title ?? '', username: data.username ?? '', password: data.password ?? '', website: data.website ?? '', notes: data.notes ?? '', tags: data.tags ?? '', favorite: data.favorite ?? false, created_at: t, updated_at: t };
}

export async function updateCredential(id: string, patch: Partial<Credential>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (['folder_id', 'title', 'username', 'password', 'website', 'notes', 'tags', 'favorite'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      values.push(v);
      idx++;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at=$${idx}`);
  values.push(now());
  values.push(id);
  await db.query(`UPDATE credentials SET ${fields.join(', ')} WHERE id=$${idx + 1}`, values);
  await logActivity('Vault', 'Updated', patch.title ?? id);
}

export async function deleteCredential(id: string): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM credentials WHERE id=$1', [id]);
  await logActivity('Vault', 'Deleted', id);
}

export async function getNotes(folderId?: string | null): Promise<Note[]> {
  const db = await getDb();
  const res = folderId !== undefined
    ? await db.query<Record<string, unknown>>('SELECT * FROM notes WHERE folder_id IS NOT DISTINCT FROM $1 ORDER BY favorite DESC, updated_at DESC', [folderId])
    : await db.query<Record<string, unknown>>('SELECT * FROM notes ORDER BY favorite DESC, updated_at DESC');
  return queryRows(res).map(parseNote);
}

export async function createNote(data: Partial<Note>): Promise<Note> {
  const db = await getDb();
  const id = genId();
  const t = now();
  await db.query(
    `INSERT INTO notes (id, folder_id, title, content, favorite, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$6)`,
    [id, data.folder_id ?? null, data.title ?? 'Untitled', data.content ?? '', data.favorite ?? false, t]
  );
  await logActivity('Notes', 'Created', data.title ?? 'Untitled');
  return { id, folder_id: data.folder_id ?? null, title: data.title ?? 'Untitled', content: data.content ?? '', favorite: data.favorite ?? false, created_at: t, updated_at: t };
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (['folder_id', 'title', 'content', 'favorite'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      values.push(v);
      idx++;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at=$${idx}`);
  values.push(now());
  values.push(id);
  await db.query(`UPDATE notes SET ${fields.join(', ')} WHERE id=$${idx + 1}`, values);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM notes WHERE id=$1', [id]);
  await logActivity('Notes', 'Deleted', id);
}

export async function getTasks(status?: string): Promise<Task[]> {
  const db = await getDb();
  const res = status
    ? await db.query<Record<string, unknown>>('SELECT * FROM tasks WHERE status=$1 ORDER BY due_date ASC', [status])
    : await db.query<Record<string, unknown>>('SELECT * FROM tasks ORDER BY CASE priority WHEN \'high\' THEN 1 WHEN \'medium\' THEN 2 ELSE 3 END, due_date ASC NULLS LAST');
  return queryRows(res).map(parseTask);
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const db = await getDb();
  const id = genId();
  const t = now();
  await db.query(
    `INSERT INTO tasks (id, title, description, status, priority, due_date, tags, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
    [id, data.title ?? '', data.description ?? '', data.status ?? 'todo', data.priority ?? 'medium', data.due_date ?? null, data.tags ?? '', t]
  );
  await logActivity('Tasks', 'Created', data.title ?? 'Task');
  return { id, title: data.title ?? '', description: data.description ?? '', status: data.status ?? 'todo', priority: data.priority ?? 'medium', due_date: data.due_date ?? null, tags: data.tags ?? '', created_at: t, updated_at: t };
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (['title', 'description', 'status', 'priority', 'due_date', 'tags'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      values.push(v);
      idx++;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at=$${idx}`);
  values.push(now());
  values.push(id);
  await db.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id=$${idx + 1}`, values);
  if (patch.status) await logActivity('Tasks', 'Updated', patch.title ?? id);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM tasks WHERE id=$1', [id]);
  await logActivity('Tasks', 'Deleted', id);
}

export async function getIncome(): Promise<Income[]> {
  const db = await getDb();
  const res = await db.query<Record<string, unknown>>('SELECT * FROM income ORDER BY date DESC');
  return queryRows(res).map(parseIncome);
}

export async function createIncome(data: Partial<Income>): Promise<Income> {
  const db = await getDb();
  const id = genId();
  const t = now();
  await db.query(
    `INSERT INTO income (id, source, amount, currency, category, date, notes, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
    [id, data.source ?? '', data.amount ?? 0, data.currency ?? 'PHP', data.category ?? '', data.date ?? now().slice(0, 10), data.notes ?? '', t]
  );
  await logActivity('Income', 'Created', data.source ?? 'Income');
  return { id, source: data.source ?? '', amount: data.amount ?? 0, currency: data.currency ?? 'PHP', category: data.category ?? '', date: data.date ?? t.slice(0, 10), notes: data.notes ?? '', created_at: t, updated_at: t };
}

export async function updateIncome(id: string, patch: Partial<Income>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [k, v] of Object.entries(patch)) {
    if (['source', 'amount', 'currency', 'category', 'date', 'notes'].includes(k)) {
      fields.push(`${k}=$${idx}`);
      values.push(v);
      idx++;
    }
  }
  if (fields.length === 0) return;
  fields.push(`updated_at=$${idx}`);
  values.push(now());
  values.push(id);
  await db.query(`UPDATE income SET ${fields.join(', ')} WHERE id=$${idx + 1}`, values);
}

export async function deleteIncome(id: string): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM income WHERE id=$1', [id]);
  await logActivity('Income', 'Deleted', id);
}

export async function getActivityLog(): Promise<ActivityLog[]> {
  const db = await getDb();
  const res = await db.query<Record<string, unknown>>('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 200');
  return queryRows(res).map(parseActivity);
}

export async function clearActivityLog(): Promise<void> {
  const db = await getDb();
  await db.query('DELETE FROM activity_log');
}

function parseFolder(r: Record<string, unknown>): Folder {
  return { id: String(r.id), name: String(r.name), type: String(r.type) as Folder['type'], color: String(r.color), favorite: Boolean(r.favorite), created_at: String(r.created_at), updated_at: String(r.updated_at) };
}
function parseCredential(r: Record<string, unknown>): Credential {
  return { id: String(r.id), folder_id: r.folder_id ? String(r.folder_id) : null, title: String(r.title), username: String(r.username), password: String(r.password), website: String(r.website), notes: String(r.notes), tags: String(r.tags), favorite: Boolean(r.favorite), created_at: String(r.created_at), updated_at: String(r.updated_at) };
}
function parseNote(r: Record<string, unknown>): Note {
  return { id: String(r.id), folder_id: r.folder_id ? String(r.folder_id) : null, title: String(r.title), content: String(r.content), favorite: Boolean(r.favorite), created_at: String(r.created_at), updated_at: String(r.updated_at) };
}
function parseTask(r: Record<string, unknown>): Task {
  return { id: String(r.id), title: String(r.title), description: String(r.description), status: String(r.status) as Task['status'], priority: String(r.priority) as Task['priority'], due_date: r.due_date ? String(r.due_date) : null, tags: String(r.tags), created_at: String(r.created_at), updated_at: String(r.updated_at) };
}
function parseIncome(r: Record<string, unknown>): Income {
  return { id: String(r.id), source: String(r.source), amount: Number(r.amount), currency: String(r.currency), category: String(r.category), date: String(r.date), notes: String(r.notes), created_at: String(r.created_at), updated_at: String(r.updated_at) };
}
function parseActivity(r: Record<string, unknown>): ActivityLog {
  return { id: String(r.id), module: String(r.module), action: String(r.action), item_name: String(r.item_name), created_at: String(r.created_at) };
}
