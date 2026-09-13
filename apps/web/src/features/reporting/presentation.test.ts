import assert from 'node:assert/strict';
import test from 'node:test';
import { objectLabel, reportForSegment, reportPath, reportQuery, titleCase } from './presentation';

test('maps route segments to the supported server report endpoint', () => {
  assert.equal(reportForSegment('financial').endpoint, 'financial-summary');
  assert.equal(reportForSegment('inventory').permission, 'report.view_inventory');
  assert.equal(reportForSegment('unknown').kind, 'sales');
  assert.equal(reportPath('products'), '/app/reports/products');
});

test('builds bounded server query without empty filters', () => {
  assert.equal(
    reportQuery({ from: '2026-09-01', to: '2026-09-13', search: ' tile ', page: 2, limit: 25 }),
    'page=2&limit=25&from=2026-09-01&to=2026-09-13&search=tile',
  );
  assert.equal(
    reportQuery({ from: '', to: '', search: '', page: 1, limit: 25 }),
    'page=1&limit=25',
  );
});

test('renders stable labels without exposing object JSON', () => {
  assert.equal(objectLabel({ name: 'Main Branch', id: 'hidden' }), 'Main Branch');
  assert.equal(objectLabel(null), '—');
  assert.equal(titleCase('returnCredits'), 'Return Credits');
});
