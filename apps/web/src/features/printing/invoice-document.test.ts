import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatDecimalForPrint, InvoiceDocument, type InvoiceData } from './invoice-document';

const invoice: InvoiceData = {
  company: {
    name: 'Vendo UAT',
    legalName: null,
    phone: '01700000000',
    email: 'accounts@example.invalid',
    address: 'Dhaka',
    currencyCode: 'BDT',
    timezone: 'Asia/Dhaka',
  },
  branch: { name: 'Main Branch', phone: null, address: null },
  invoice: {
    invoiceNumber: 'INV-0001',
    completedAt: '2026-09-13T10:00:00.000Z',
    pricingMode: 'RETAIL',
    status: 'COMPLETED',
    notes: 'Deliver carefully',
  },
  register: { name: 'Main Register', code: 'REG-01' },
  customer: { code: 'CUS-01', name: 'Test Customer', phone: null, address: null },
  cashier: { name: 'Owner', email: 'owner@example.invalid' },
  items: [
    {
      id: 'line-1',
      productName: 'Carrara White 24×24',
      sku: 'TILE-01',
      tileSize: '24×24 inch',
      batchNumber: 'B001',
      shade: 'A1',
      quantity: '2.000000',
      unit: 'BOX',
      baseQuantity: '8.000000',
      unitPrice: '1000.0000',
      discount: '100.0000',
      tax: '0.0000',
      lineTotal: '1900.0000',
    },
  ],
  totals: {
    subtotal: '2000.0000',
    discount: '100.0000',
    tax: '0.0000',
    total: '1900.0000',
    paid: '1500.0000',
    returnCredits: '0.0000',
    refunded: '0.0000',
    outstanding: '400.0000',
    change: '0.0000',
  },
  payments: [{ number: 'PAY-01', method: 'Cash', amount: '1500.0000', reference: null }],
  returns: [],
};

test('thermal invoice preserves historical tile, payment, due, and accessible table context', () => {
  const html = renderToStaticMarkup(
    createElement(InvoiceDocument, { data: invoice, mode: 'thermal' }),
  );

  assert.match(html, /aria-label="Thermal receipt INV-0001"/);
  assert.match(html, /Carrara White 24×24/);
  assert.match(html, /Batch B001 \/ Shade A1/);
  assert.match(html, /2 BOX/);
  assert.match(html, /Due/);
  assert.match(html, /400.00 BDT/);
  assert.match(html, /<caption class="sr-only">Invoice items<\/caption>/);
});

test('print formatting groups and trims Decimal strings without arithmetic', () => {
  assert.equal(formatDecimalForPrint('0004450.0000', 2), '4,450.00');
  assert.equal(formatDecimalForPrint('1.250000'), '1.25');
  assert.equal(formatDecimalForPrint('-0.5000', 2), '-0.50');
  assert.equal(formatDecimalForPrint('not-a-decimal', 2), 'not-a-decimal');
});

test('A4 invoice exposes professional metadata and immutable financial snapshots', () => {
  const html = renderToStaticMarkup(createElement(InvoiceDocument, { data: invoice, mode: 'a4' }));

  assert.match(html, /aria-label="A4 invoice INV-0001"/);
  assert.match(html, /Tax invoice/);
  assert.match(html, /Main Branch/);
  assert.match(html, /Test Customer/);
  assert.match(html, /Discount/);
  assert.match(html, /Payment summary/);
  assert.match(html, /Generated from the immutable historical sale record/);
});
