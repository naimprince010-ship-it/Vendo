import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionAdvance,
  collectionAllocation,
  lineReturnableQuantity,
  returnRefundable,
} from './finance';

test('collection preview allocates outstanding first and preserves residual advance', () => {
  assert.equal(collectionAllocation('1400.0000', '1000.0000'), '1000.0000');
  assert.equal(collectionAdvance('1400.0000', '1000.0000'), '400');
});

test('return quantity uses the immutable original conversion factor', () => {
  assert.equal(lineReturnableQuantity('8.000000', '4.0000000000'), '2');
});

test('refund capacity excludes due reduction, exchange credit and prior refunds', () => {
  assert.equal(
    returnRefundable({
      totalCredit: '3000.0000',
      receivableApplied: '1000.0000',
      exchange: { creditApplied: '500.0000' },
      refunds: [{ amount: '250.0000' }],
    } as never),
    '1250',
  );
});
