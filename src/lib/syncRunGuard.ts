export interface SyncRunGuard {
  begin(): number;
  invalidate(): void;
  isCurrent(runId: number): boolean;
}

export function createSyncRunGuard(): SyncRunGuard {
  let generation = 0;
  return {
    begin() {
      generation += 1;
      return generation;
    },
    invalidate() {
      generation += 1;
    },
    isCurrent(runId) {
      return runId === generation;
    },
  };
}
