import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Alert,
  BarcodeSearchInput,
  Button,
  Checkbox,
  FormField,
  MoneyDisplay,
  QuantityDisplay,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './index';

test('button exposes disabled loading semantics and semantic classes', () => {
  const markup = renderToStaticMarkup(<Button loading>Save</Button>);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /bg-primary/);
});

test('persistent form label, required marker, and validation message render together', () => {
  const markup = renderToStaticMarkup(
    <FormField htmlFor="sku" label="SKU" required error="SKU is required">
      <BarcodeSearchInput id="sku" invalid />
    </FormField>,
  );
  assert.match(markup, /for="sku"/);
  assert.match(markup, /aria-invalid="true"/);
  assert.match(markup, /role="alert"/);
});

test('native checkbox retains label and disabled semantics', () => {
  const markup = renderToStaticMarkup(<Checkbox label="Track stock" disabled />);
  assert.match(markup, /type="checkbox"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /Track stock/);
});

test('status, alert, and display primitives are presentation-only and deterministic', () => {
  const markup = renderToStaticMarkup(
    <>
      <StatusBadge tone="success">Active</StatusBadge>
      <Alert tone="warning" title="Review">
        Check the quantity
      </Alert>
      <MoneyDisplay value="1250.5" />
      <QuantityDisplay value="8.0000" unit="PCS" />
    </>,
  );
  assert.match(markup, /bg-success-soft/);
  assert.match(markup, /role="status"/);
  assert.match(markup, /1,250\.50/);
  assert.match(markup, /8\.0000/);
});

test('table primitives preserve semantic table markup and numeric alignment', () => {
  const markup = renderToStaticMarkup(
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead numeric>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow data-selected="true">
          <TableCell numeric>500</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  assert.match(markup, /<table/);
  assert.match(markup, /<th/);
  assert.match(markup, /tabular-nums/);
  assert.match(markup, /data-selected="true"/);
});
