import assert from 'node:assert/strict';
import { test } from 'node:test';
import { iconRegistry } from './icon';

test('keeps the production Lucide registry to 83 required keys plus approved pilot and used optional keys', () => {
  assert.equal(Object.keys(iconRegistry).length, 85);
  assert.equal('settings' in iconRegistry, true);
  assert.equal('lowStock' in iconRegistry, true);
});
