import type { EncryptedSyncRow } from './syncTypes.ts';

export interface MergePlan {
  pushToRemote: EncryptedSyncRow[];
  applyToLocal: EncryptedSyncRow[];
  unchanged: number;
}

export class SyncConflictError extends Error {
  readonly recordId: string;

  constructor(recordId: string) {
    super(`Encrypted sync conflict for record ${recordId}`);
    this.name = 'SyncConflictError';
    this.recordId = recordId;
  }
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(',')}}`;
}

function rowsEqual(left: EncryptedSyncRow, right: EncryptedSyncRow): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

export function buildMergePlan(localRows: EncryptedSyncRow[], remoteRows: EncryptedSyncRow[]): MergePlan {
  const remoteById = new Map(remoteRows.map(row => [row.id, row]));
  const localIds = new Set(localRows.map(row => row.id));
  const pushToRemote: EncryptedSyncRow[] = [];
  const applyToLocal: EncryptedSyncRow[] = [];
  let unchanged = 0;

  for (const localRow of localRows) {
    const remoteRow = remoteById.get(localRow.id);
    if (!remoteRow) {
      pushToRemote.push(localRow);
      continue;
    }
    if (rowsEqual(localRow, remoteRow)) {
      unchanged += 1;
      continue;
    }
    if (localRow.updated_at > remoteRow.updated_at) {
      pushToRemote.push(localRow);
    } else if (localRow.updated_at < remoteRow.updated_at) {
      applyToLocal.push(remoteRow);
    } else {
      throw new SyncConflictError(localRow.id);
    }
  }

  for (const remoteRow of remoteRows) {
    if (!localIds.has(remoteRow.id)) applyToLocal.push(remoteRow);
  }

  return { pushToRemote, applyToLocal, unchanged };
}
