import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalsByCategory } from '../src/report.js';

const validEntries = [
  { category: 'Food', amount: 100 },
  { category: 'Transportation', amount: 250 },
  { category: 'Food', amount: 300 },
  { category: 'Utilities', amount: 150 },
];

const emptyCategoryEntries = [
  { category: '', amount: 100 },
  { category: 'Transportation', amount: 250 },
];

const missingCategoryEntries = [
  { category: null, amount: 100 },
  { category: 'Food', amount: 300 },
];

const undefinedCategoryEntries = [
  { category: undefined, amount: 100 },
  { category: 'Food', amount: 300 },
];

const zeroAmountEntries = [
  { category: 'Food', amount: 0 },
  { category: 'Transportation', amount: 250 },
];

const whitespaceCategoryEntries = [
  { category: '   ', amount: 100 },
  { category: 'Transportation', amount: 250 },
];

test('totalsByCategory sums amounts by category', () => {
  const result = totalsByCategory(validEntries);

  assert.deepStrictEqual(result, {
    Food: 400,
    Transportation: 250,
    Utilities: 150,
  });
});

test('totalsByCategory throws on empty category', () => {
  assert.throws(() => totalsByCategory(emptyCategoryEntries), /empty or missing category/);
});

test('totalsByCategory throws on null category', () => {
  assert.throws(() => totalsByCategory(missingCategoryEntries), /empty or missing category/);
});

test('totalsByCategory throws on undefined category', () => {
  assert.throws(() => totalsByCategory(undefinedCategoryEntries), /empty or missing category/);
});

test('totalsByCategory throws on whitespace-only category', () => {
  assert.throws(() => totalsByCategory(whitespaceCategoryEntries), /empty or missing category/);
});

test('totalsByCategory handles zero amounts correctly', () => {
  const result = totalsByCategory(zeroAmountEntries);

  assert.deepStrictEqual(result, {
    Food: 0,
    Transportation: 250,
  });
});

