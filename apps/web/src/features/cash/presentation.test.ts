import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareMoney,
  friendlyCashError,
  movementDirection,
  movementLabel,
  signedMovement,
  subtractMoney,
  variancePresentation,
} from './presentation';

test('cash presentation preserves exact Decimal arithmetic', () => {
  assert.equal(subtractMoney('4850.0000', '4800'), '50');
  assert.equal(subtractMoney('4800', '4850.0000'), '-50');
  assert.equal(compareMoney('0.0000'), 0);
  assert.equal(compareMoney('5000.0001', '5000'), 1);
});

test('cash movement direction and labels match the immutable journal semantics', () => {
  assert.equal(movementDirection('CASH_SALE'), 'in');
  assert.equal(movementDirection('CASH_REFUND'), 'out');
  assert.equal(signedMovement('EXPENSE', '250.0000'), '-250.0000');
  assert.equal(movementLabel('CUSTOMER_COLLECTION'), 'Customer collection');
});

test('variance uses actual minus expected semantics', () => {
  assert.deepEqual(variancePresentation('50.0000'), {
    label: 'Over',
    tone: 'warning',
    value: '50.0000',
  });
  assert.equal(variancePresentation('-50.0000').label, 'Short');
  assert.equal(variancePresentation('0.0000').label, 'Balanced');
});

test('backend errors are translated into operational guidance', () => {
  assert.match(
    friendlyCashError('No open cash shift exists for this register'),
    /Open a cash shift/,
  );
  assert.match(friendlyCashError('serialization failure'), /Refresh and review/);
});
