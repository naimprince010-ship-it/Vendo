import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { createAuthRevisionGuard, createSessionRestorer } from './session-restoration';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('shares one refresh rotation across concurrent session restoration calls', async () => {
  let requests = 0;
  let release: (() => void) | undefined;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  globalThis.fetch = async () => {
    requests += 1;
    await waiting;
    return new Response(JSON.stringify({ accessToken: 'redacted' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const restore = createSessionRestorer<{ accessToken: string }>('http://local.test/refresh');
  const first = restore();
  const second = restore();
  assert.equal(requests, 1);
  release?.();
  assert.deepEqual(await first, { accessToken: 'redacted' });
  assert.deepEqual(await second, { accessToken: 'redacted' });

  await restore();
  assert.equal(requests, 2);
});

test('rejects stale authentication responses after login or logout advances state', () => {
  const revision = createAuthRevisionGuard();
  const restoration = revision.capture();

  assert.equal(revision.isCurrent(restoration), true);
  const login = revision.advance();
  assert.equal(revision.isCurrent(restoration), false);
  assert.equal(revision.isCurrent(login), true);
  revision.advance();
  assert.equal(revision.isCurrent(login), false);
});
