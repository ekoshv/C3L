import assert from 'node:assert/strict';
import { strict as assertStrict } from 'node:assert/strict';
import test from 'node:test';
import { createLedger } from '../src/ledger.js';

// Basic posting and balance queries
await test('post adds amounts to an account', async (t) => {
  const ledger = createLedger();
  ledger.post({ account: 'alice', amount: 100 });
  assert.strictEqual(ledger.balanceOf('alice'), 100);
});

await test('post handles negative amounts', async (t) => {
  const ledger = createLedger();
  ledger.post({ account: 'bob', amount: -50 });
  assert.strictEqual(ledger.balanceOf('bob'), -50);
});

await test('balanceOf returns 0 for unknown accounts', async (t) => {
  const ledger = createLedger();
  assert.strictEqual(ledger.balanceOf('unknown'), 0);
});

// Multiple postings accumulate correctly
await test('multiple posts accumulate correctly', async (t) => {
  const ledger = createLedger();
  ledger.post({ account: 'charlie', amount: 100 });
  ledger.post({ account: 'charlie', amount: -30 });
  assert.strictEqual(ledger.balanceOf('charlie'), 70);
});

// Error cases for post
await test('post throws on non-object entry', async (t) => {
  const ledger = createLedger();
  assert.throws(() => ledger.post({ account: 'alice' }), TypeError, 'missing amount');
});

await test('post throws on missing account field', async (t) => {
  const ledger = createLedger();
  assert.throws(() => ledger.post({ amount: 100 }), TypeError);
});

await test('post throws on non-string account', async (t) => {
  const ledger = createLedger();
  assert.throws(() => ledger.post({ account: 123, amount: 100 }), TypeError);
});

await test('post throws on non-number amount', async (t) => {
  const ledger = createLedger();
  assert.throws(() => ledger.post({ account: 'alice', amount: '100' }), TypeError);
});

await test('post throws on non-integer amount', async (t) => {
  const ledger = createLedger();
  assert.throws(() => ledger.post({ account: 'alice', amount: 99.99 }), TypeError);
});

// Edge cases
await test('post handles zero amounts', async (t) => {
  const ledger = createLedger();
  ledger.post({ account: 'dave', amount: 0 });
  assert.strictEqual(ledger.balanceOf('dave'), 0);
});

await test('post handles large integer amounts', async (t) => {
  const ledger = createLedger();
  ledger.post({ account: 'eve', amount: -999999 });
  assert.strictEqual(ledger.balanceOf('eve'), -999999);
});