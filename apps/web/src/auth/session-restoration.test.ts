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

test('fails closed and releases a stalled session restoration request', async () => {
  let requests = 0;
  globalThis.fetch = async (_input, init) => {
    requests += 1;
    if (requests > 1) return new Response(null, { status: 401 });
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    });
  };

  const restore = createSessionRestorer<{ accessToken: string }>('http://local.test/refresh', 10);
  assert.equal(await restore(), null);
  assert.equal(await restore(), null);
  assert.equal(requests, 2);
});
