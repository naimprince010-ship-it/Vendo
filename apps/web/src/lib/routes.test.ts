import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAllPermissions, hasAnyPermission } from './permissions';
import { routeForPath, visibleRoutes } from './routes';

test('permission helpers preserve any/all semantics', () => {
  const permissions = ['sale.create', 'inventory.view'];
  assert.equal(hasAnyPermission(permissions, ['sale.create', 'sale.view']), true);
  assert.equal(hasAnyPermission(permissions, ['customer.view']), false);
  assert.equal(hasAllPermissions(permissions, ['sale.create', 'inventory.view']), true);
  assert.equal(hasAllPermissions(permissions, ['sale.create', 'sale.view']), false);
});

test('navigation hides modules without an applicable permission', () => {
  const routes = visibleRoutes(['sale.create']).map((route) => route.href);
  assert.deepEqual(routes, ['/app/pos']);
});

test('nested paths resolve to their closest module route', () => {
  assert.equal(routeForPath('/app/settings/branches')?.href, '/app/settings');
  assert.equal(routeForPath('/app/sales/123')?.href, '/app/sales');
  assert.equal(routeForPath('/login'), undefined);
});
