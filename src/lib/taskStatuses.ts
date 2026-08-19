import type { TaskStatus } from './types.ts';

export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'future_plans', 'current_sprint', 'to_do', 'doing', 'on_hold', 'blocked', 'done',
];

export function normalizeTaskStatus(status: string | null | undefined): TaskStatus {
  switch (status) {
    case 'future_plans': case 'current_sprint': case 'to_do': case 'doing':
    case 'on_hold': case 'blocked': case 'done': return status;
    case 'todo': return 'to_do';
    case 'in_progress': return 'doing';
    case 'completed': return 'done';
    default: return 'to_do';
  }
}
