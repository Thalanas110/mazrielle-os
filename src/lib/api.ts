import { getDb, getVaultOwner } from './db';
import { getVaultCryptoProvider } from './platformCrypto';
import { createOwnerSettingsId } from './vault';
import { clearRecords, getRecord, insertRecord, insertSettings, listRecords, softDeleteRecord, updateRecord } from './encryptedRepository';
import type { ActivityLog, AppSettings, Credential, Folder, Income, Note, Task, TaskStatus } from './types';
import { DEFAULT_SETTINGS as DEFAULTS } from './types';
import { settingsFromRow } from './settings';
import { normalizeTaskStatus } from './taskStatuses.ts';

function withMetadata<T extends object>(record: { id: string; folder_id: string | null; created_at: string; updated_at: string; value: T }): T & Pick<typeof record, 'id' | 'folder_id' | 'created_at' | 'updated_at'> {
  return { ...record.value, id: record.id, folder_id: record.folder_id, created_at: record.created_at, updated_at: record.updated_at };
}

function sortBy<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return items.sort(compare);
}

export async function getSettings(): Promise<AppSettings> {
  const ownerId = (await getVaultCryptoProvider(), getVaultOwner());
  const db = await getDb();
  const result = await db.query<Record<string, unknown>>('SELECT id, payload, created_at, updated_at FROM app_settings WHERE id=$1 AND deleted_at IS NULL', [createOwnerSettingsId(ownerId)]);
  const row = result.rows[0];
  if (!row) {
    await insertSettings(DEFAULTS, createOwnerSettingsId(ownerId));
    return settingsFromRow(undefined);
  }
  const record = await getRecord<AppSettings>('app_settings', String(row.id));
  return settingsFromRow(record?.value as Record<string, unknown> | undefined);
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const ownerId = getVaultOwner();
  const id = createOwnerSettingsId(ownerId);
  const current = await getSettings();
  const next = { ...current, ...patch };
  const existing = await getRecord<AppSettings>('app_settings', id);
  if (existing) await updateRecord('app_settings', id, next);
  else await insertSettings(next, id);
}

export async function getFolders(type?: string): Promise<Folder[]> {
  const records = await listRecords<Folder>('folders');
  return sortBy(records.filter(r => !type || r.value.type === type).map(withMetadata), (a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
}

export async function createFolder(name: string, type: string, color: string): Promise<Folder> {
  const record = await insertRecord('folders', { name, type: type as Folder['type'], color, favorite: false });
  const folder = withMetadata(record);
  await logActivity('Folders', 'Created', name);
  return folder;
}

export async function updateFolder(id: string, patch: Partial<Folder>): Promise<void> {
  const record = await getRecord<Folder>('folders', id);
  if (!record) return;
  const valuePatch = {
    name: patch.name ?? record.value.name,
    type: record.value.type,
    color: patch.color ?? record.value.color,
    favorite: patch.favorite ?? record.value.favorite,
  };
  await updateRecord('folders', id, valuePatch);
}

export async function deleteFolder(id: string): Promise<void> {
  await softDeleteRecord('folders', id);
  await logActivity('Folders', 'Deleted', id);
}

export async function getCredentials(folderId?: string | null): Promise<Credential[]> {
  const records = await listRecords<Credential>('credentials', folderId);
  return sortBy(records.map(withMetadata), (a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title));
}

export async function createCredential(data: Partial<Credential>): Promise<Credential> {
  const value: Credential = {
    id: '', folder_id: data.folder_id ?? null, title: data.title ?? '', username: data.username ?? '', password: data.password ?? '', website: data.website ?? '', notes: data.notes ?? '', tags: data.tags ?? '', favorite: data.favorite ?? false, created_at: '', updated_at: '',
  };
  const record = await insertRecord('credentials', value, value.folder_id);
  const credential = withMetadata(record);
  await logActivity('Vault', 'Created', credential.title);
  return credential;
}

export async function updateCredential(id: string, patch: Partial<Credential>): Promise<void> {
  const record = await getRecord<Credential>('credentials', id);
  if (!record) return;
  const next = { ...record.value, ...patch, folder_id: patch.folder_id === undefined ? record.folder_id : patch.folder_id };
  await updateRecord('credentials', id, next, next.folder_id);
  await logActivity('Vault', 'Updated', patch.title ?? id);
}

export async function deleteCredential(id: string): Promise<void> {
  await softDeleteRecord('credentials', id);
  await logActivity('Vault', 'Deleted', id);
}

export async function getNotes(folderId?: string | null): Promise<Note[]> {
  const records = await listRecords<Note>('notes', folderId);
  return sortBy(records.map(withMetadata), (a, b) => Number(b.favorite) - Number(a.favorite) || b.updated_at.localeCompare(a.updated_at));
}

export async function createNote(data: Partial<Note>): Promise<Note> {
  const value: Note = { id: '', folder_id: data.folder_id ?? null, title: data.title ?? 'Untitled', content: data.content ?? '', favorite: data.favorite ?? false, created_at: '', updated_at: '' };
  const record = await insertRecord('notes', value, value.folder_id);
  const note = withMetadata(record);
  await logActivity('Notes', 'Created', note.title);
  return note;
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<void> {
  const record = await getRecord<Note>('notes', id);
  if (!record) return;
  const next = { ...record.value, ...patch, folder_id: patch.folder_id === undefined ? record.folder_id : patch.folder_id };
  await updateRecord('notes', id, next, next.folder_id);
}

export async function deleteNote(id: string): Promise<void> {
  await softDeleteRecord('notes', id);
  await logActivity('Notes', 'Deleted', id);
}

export async function getTasks(status?: TaskStatus): Promise<Task[]> {
  const records = await listRecords<Task>('tasks');
  const tasks = records.map(record => ({
    ...withMetadata(record),
    status: normalizeTaskStatus(String(record.value.status ?? '')),
  }));
  return sortBy(
    tasks.filter(task => !status || task.status === status),
    (a, b) => ({ high: 1, medium: 2, low: 3 }[a.priority] - ({ high: 1, medium: 2, low: 3 }[b.priority]) || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')),
  );
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const value: Task = { id: '', title: data.title ?? '', description: data.description ?? '', status: data.status ?? 'to_do', priority: data.priority ?? 'medium', due_date: data.due_date ?? null, tags: data.tags ?? '', created_at: '', updated_at: '' };
  const record = await insertRecord('tasks', value);
  const task = withMetadata(record);
  await logActivity('Tasks', 'Created', task.title);
  return task;
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  const record = await getRecord<Task>('tasks', id);
  if (!record) return;
  await updateRecord('tasks', id, { ...record.value, ...patch });
  if (patch.status) await logActivity('Tasks', 'Updated', patch.title ?? id);
}

export async function deleteTask(id: string): Promise<void> {
  await softDeleteRecord('tasks', id);
  await logActivity('Tasks', 'Deleted', id);
}

export async function getIncome(): Promise<Income[]> {
  const records = await listRecords<Income>('income');
  return sortBy(records.map(withMetadata), (a, b) => b.date.localeCompare(a.date));
}

export async function createIncome(data: Partial<Income>): Promise<Income> {
  const value: Income = { id: '', source: data.source ?? '', amount: data.amount ?? 0, currency: data.currency ?? 'PHP', category: data.category ?? '', date: data.date ?? new Date().toISOString().slice(0, 10), notes: data.notes ?? '', created_at: '', updated_at: '' };
  const record = await insertRecord('income', value);
  const income = withMetadata(record);
  await logActivity('Income', 'Created', income.source);
  return income;
}

export async function updateIncome(id: string, patch: Partial<Income>): Promise<void> {
  const record = await getRecord<Income>('income', id);
  if (record) await updateRecord('income', id, { ...record.value, ...patch });
}

export async function deleteIncome(id: string): Promise<void> {
  await softDeleteRecord('income', id);
  await logActivity('Income', 'Deleted', id);
}

export async function getActivityLog(): Promise<ActivityLog[]> {
  const records = await listRecords<ActivityLog>('activity_log');
  return sortBy(records.map(withMetadata), (a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 200);
}

export async function clearActivityLog(): Promise<void> {
  await clearRecords('activity_log');
}

export async function logActivity(module: string, action: string, itemName: string): Promise<void> {
  await insertRecord('activity_log', { module, action, item_name: itemName });
}
