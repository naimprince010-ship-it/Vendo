import assert from 'node:assert/strict';
import test from 'node:test';
import {
  friendlyInventoryError,
  movementLabel,
  movementTone,
  multiplyDecimal,
  selectProductForLine,
  signedQuantity,
  stockLineIssues,
  subtractDecimal,
} from './presentation';
import type { Product, StockLineDraft } from './types';

test('inventory decimal helpers preserve exact quantity precision', () => {
  assert.equal(multiplyDecimal('6', '2.6700000000'), '16.02');
  assert.equal(subtractDecimal('76.000000', '20.125'), '55.875');
  assert.equal(subtractDecimal('3', '4.5'), '-1.5');
  assert.equal(signedQuantity('4.000000'), '+4');
});

test('movement presentation preserves inbound and outbound semantics', () => {
  assert.equal(movementLabel('TRANSFER_OUT'), 'Transfer out');
  assert.equal(movementTone('SALE'), 'danger');
  assert.equal(movementTone('PURCHASE_RECEIPT'), 'success');
});

test('stale count errors are translated into an actionable message', () => {
  assert.match(friendlyInventoryError('Inventory snapshot version changed'), /Refresh or reopen/);
});

const baseProduct: Product = {
  id: 'product-1',
  sku: 'TEST-1',
  name: 'Test product',
  type: 'GENERAL',
  model: null,
  isActive: true,
  trackInventory: true,
  batchTracking: false,
  baseUnit: { id: 'unit-pcs', code: 'PCS', name: 'Pieces' },
  tileProfile: null,
};

test('product selection synchronizes the base unit before async detail loads', () => {
  const line: StockLineDraft = {
    key: 'line-1',
    productId: '',
    unitId: '',
    batchId: 'stale-batch',
    quantity: '5',
  };
  assert.deepEqual(selectProductForLine(line, baseProduct), {
    key: 'line-1',
    productId: 'product-1',
    unitId: 'unit-pcs',
    batchId: '',
    quantity: '',
  });
});

test('mutation validation explains missing unit and required batch', () => {
  const tile = { ...baseProduct, id: 'tile-1', batchTracking: true };
  assert.deepEqual(
    stockLineIssues(
      [{ key: 'line-1', productId: tile.id, unitId: '', batchId: '', quantity: '1' }],
      [tile],
    ),
    ['Line 1: select a unit.', 'Line 1: select the required batch and shade.'],
  );
});

test('physical count validation accepts zero but rejects negative and invalid decimals', () => {
  const line = selectProductForLine(
    { key: 'line-1', productId: '', unitId: '', batchId: '', quantity: '' },
    baseProduct,
  );
  assert.deepEqual(stockLineIssues([{ ...line, quantity: '0' }], [baseProduct], true), []);
  assert.deepEqual(stockLineIssues([{ ...line, quantity: '2.5' }], [baseProduct], true), []);
  assert.match(
    stockLineIssues([{ ...line, quantity: '-1' }], [baseProduct], true)[0]!,
    /non-negative/,
  );
  assert.match(
    stockLineIssues([{ ...line, quantity: 'not-a-number' }], [baseProduct], true)[0]!,
    /non-negative/,
  );
  assert.match(stockLineIssues([{ ...line, quantity: '0' }], [baseProduct])[0]!, /positive/);
  assert.equal(
    friendlyInventoryError('items.0.Counted quantity must be zero or greater.'),
    'Counted quantity must be zero or greater.',
  );
});
