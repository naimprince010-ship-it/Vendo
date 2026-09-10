import assert from 'node:assert/strict';
import test from 'node:test';
import {
  baseQuantityForLine,
  checkoutPreview,
  convertedQuantity,
  decimalAdd,
  decimalDivide,
  decimalMultiply,
} from './decimal';
import type { CartLine, PaymentMethod, PosProduct } from './types';

const unit = (id: string, code: string) => ({ id, code, name: code });
const product: PosProduct = {
  id: 'tile',
  sku: 'TILE-001',
  name: 'Floor Tile',
  type: 'TILE',
  model: null,
  primaryBarcode: null,
  scannedUnitId: 'box',
  baseUnit: unit('pcs', 'PCS'),
  units: [
    { unit: unit('pcs', 'PCS'), factorToBase: '1' },
    { unit: unit('box', 'BOX'), factorToBase: '4' },
    { unit: unit('sqft', 'SQFT'), factorToBase: '0.25' },
  ],
  prices: [],
  batchTracking: true,
  trackInventory: true,
  availability: [],
  tile: { displaySize: '24×24', color: null },
};

const line: CartLine = {
  product,
  unitId: 'box',
  batchId: '',
  quantity: '2',
  unitPrice: '1850',
  discount: '50',
  tax: '0',
  overrideReason: '',
};

test('POS decimal helpers preserve tile conversion precision without Number arithmetic', () => {
  assert.equal(baseQuantityForLine(line), '8');
  assert.equal(convertedQuantity('8', '0.25'), '32');
  assert.equal(decimalMultiply('2.67', '6'), '16.02');
  assert.equal(decimalDivide('16.02', '6'), '2.67');
  assert.equal(decimalAdd('0.1', '0.2'), '0.3');
});

test('checkout preview separates applied cash, due, and tendered change', () => {
  const methods: PaymentMethod[] = [
    { id: 'cash', code: 'CASH', name: 'Cash', isCash: true },
    { id: 'card', code: 'CARD', name: 'Card', isCash: false },
  ];
  const preview = checkoutPreview(
    [line],
    '100',
    '0',
    [
      { methodId: 'cash', amount: '2000', tendered: '2050' },
      { methodId: 'card', amount: '1000', tendered: '' },
    ],
    methods,
  );
  assert.deepEqual(preview, {
    subtotal: '3700',
    lineDiscount: '50',
    lineTax: '0',
    total: '3550',
    paid: '3000',
    due: '550',
    change: '50',
  });
});
