import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDecimal,
  documentStatusTone,
  friendlyPurchaseError,
  invoiceFinancials,
  lineDraftIssues,
  orderStatusLabel,
  paymentAllocationSummary,
  productBaseUnitCode,
  receivingProgress,
} from './presentation';

test('purchasing Decimal helpers avoid floating-point totals', () => {
  assert.equal(addDecimal('0.1', '0.2', '1000.0001'), '1000.3001');
  assert.deepEqual(receivingProgress('6', '10'), { ordered: '10', received: '6', remaining: '4' });
});

test('invoice and payment summaries preserve payable semantics', () => {
  assert.deepEqual(
    invoiceFinancials('1000', [{ amount: '300.25' }], [{ financialTotal: '99.75' }]),
    {
      paid: '300.25',
      credited: '99.75',
      outstanding: '600',
    },
  );
  assert.deepEqual(paymentAllocationSummary('500', [{ amount: '350' }]), {
    allocated: '350',
    unapplied: '150',
  });
});

test('backend statuses map to clear purchasing language', () => {
  assert.equal(orderStatusLabel('APPROVED'), 'Confirmed');
  assert.equal(orderStatusLabel('PARTIALLY_RECEIVED'), 'Partially received');
  assert.equal(documentStatusTone('PAID'), 'success');
  assert.equal(documentStatusTone('CANCELLED'), 'danger');
});

test('line validation and capacity errors are human readable', () => {
  assert.deepEqual(
    lineDraftIssues([{ productId: '', unitId: '', quantity: '0', unitCost: '-1' }]),
    [
      'Line 1: select a product.',
      'Line 1: select a unit.',
      'Line 1: quantity must be greater than zero.',
      'Line 1: unit cost must be zero or greater.',
    ],
  );
  assert.match(friendlyPurchaseError('Cannot over-receive remaining quantity'), /exceeds/);
});

test('purchase details tolerate the intentionally narrow backend product projection', () => {
  assert.equal(productBaseUnitCode('tile-1', [{ id: 'tile-1' }]), 'BASE');
  assert.equal(productBaseUnitCode('tile-1', [{ id: 'tile-1', baseUnit: { code: 'PCS' } }]), 'PCS');
});
