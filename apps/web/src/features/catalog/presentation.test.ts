import test from 'node:test';
import assert from 'node:assert/strict';

import { baseUnitLabel, productSubtitle, productTypeTone } from './presentation';

test('catalog product type tone keeps tile and sanitary visually distinct', () => {
  assert.equal(productTypeTone('TILE'), 'info');
  assert.equal(productTypeTone('SANITARY'), 'success');
  assert.equal(productTypeTone('ACCESSORY'), 'neutral');
  assert.equal(productTypeTone('GENERAL'), 'neutral');
});

test('catalog base unit label falls back to name when API code is omitted', () => {
  assert.equal(baseUnitLabel({ code: 'PCS', name: 'Pieces' }), 'PCS');
  assert.equal(baseUnitLabel({ name: 'Square Feet' }), 'Square Feet');
});

test('catalog subtitle includes SKU, tile size, and model without empty separators', () => {
  assert.equal(
    productSubtitle({ sku: 'TILE-001', model: 'P24', tileProfile: { displaySize: '24 x 24' } }),
    'TILE-001 · 24 x 24 · P24',
  );
  assert.equal(productSubtitle({ sku: 'GEN-001', model: null, tileProfile: null }), 'GEN-001');
});
