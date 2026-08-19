import { SYNC_INTERVAL_MS } from './sync.ts';

export interface SchedulerTimers {
  setInterval(handler: () => void, delay: number): unknown;
  clearInterval(handle: unknown): void;
}

const browserTimers: SchedulerTimers = {
  setInterval: (handler, delay) => globalThis.setInterval(handler, delay),
  clearInterval: handle => globalThis.clearInterval(handle as number),
};

export function startSyncScheduler(
  syncNow: () => Promise<void>,
  timers: SchedulerTimers = browserTimers,
  intervalMs = SYNC_INTERVAL_MS,
): () => void {
  let active = true;
  let inFlight = false;
  const run = () => {
    if (!active || inFlight) return;
    inFlight = true;
    void syncNow().catch(() => undefined).finally(() => {
      inFlight = false;
    });
  };
  const handle = timers.setInterval(run, intervalMs);
  return () => {
    active = false;
    timers.clearInterval(handle);
  };
}
