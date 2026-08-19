import assert from 'node:assert/strict';
import test from 'node:test';
import { startSyncScheduler } from '../src/lib/syncScheduler.ts';
import { SYNC_INTERVAL_MS } from '../src/lib/sync.ts';

test('uses the 30-minute interval and prevents overlapping runs', async () => {
  let resolveFirst: (() => void) | undefined;
  let calls = 0;
  let cleared = false;
  const scheduled: (() => void)[] = [];
  const stop = startSyncScheduler(
    async () => {
      calls += 1;
      if (calls === 1) await new Promise<void>(resolve => { resolveFirst = resolve; });
    },
    {
      setInterval: (handler, delay) => {
        assert.equal(delay, SYNC_INTERVAL_MS);
        scheduled.push(handler);
        return 1;
      },
      clearInterval: () => { cleared = true; },
    },
  );

  scheduled[0]();
  scheduled[0]();
  await Promise.resolve();
  assert.equal(calls, 1);
  resolveFirst?.();
  await Promise.resolve();
  stop();
  assert.equal(cleared, true);
});

test('stopping the scheduler prevents a future callback from starting work', async () => {
  let calls = 0;
  let callback: (() => void) | undefined;
  const stop = startSyncScheduler(
    async () => { calls += 1; },
    {
      setInterval: handler => { callback = handler; return 1; },
      clearInterval: () => {},
    },
  );
  stop();
  callback?.();
  await Promise.resolve();
  assert.equal(calls, 0);
});
