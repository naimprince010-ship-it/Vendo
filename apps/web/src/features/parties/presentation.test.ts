import assert from 'node:assert/strict';
import test from 'node:test';
import {
  absoluteDecimal,
  availableCredit,
  compareDecimal,
  financialPosition,
  friendlyPartyError,
  ledgerTypeLabel,
  subtractDecimal,
} from './presentation';

test('party Decimal helpers preserve four-place balances without Number arithmetic', () => {
  assert.equal(compareDecimal('0.0000'), 0);
  assert.equal(compareDecimal('-0.0001'), -1);
  assert.equal(absoluteDecimal('-12500.1250'), '12500.125');
  assert.equal(subtractDecimal('10000.0000', '1200.1250'), '8799.875');
  assert.equal(availableCredit('1000.0000', '-250.1250'), '1250.125');
  assert.equal(availableCredit('100.0000', '120.0000'), '0');
});

test('customer and supplier signs are interpreted semantically', () => {
  assert.deepEqual(financialPosition('125.25', 'customer'), {
    label: 'Customer receivable',
    amount: '125.25',
    tone: 'warning',
    explanation: 'Positive balance means the customer owes the company.',
  });
  assert.equal(financialPosition('-25.25', 'customer').label, 'Customer advance');
  assert.equal(financialPosition('25.25', 'supplier').label, 'Supplier payable');
  assert.equal(financialPosition('-25.25', 'supplier').label, 'Supplier advance');
});

test('ledger labels and common API errors remain human readable', () => {
  assert.equal(ledgerTypeLabel('PURCHASE_INVOICE'), 'Purchase invoice');
  assert.equal(ledgerTypeLabel('CUSTOM_EVENT'), 'Custom event');
  assert.equal(
    friendlyPartyError('Opening balance has already been posted'),
    'An opening balance has already been posted. Use a correction instead.',
  );
});
