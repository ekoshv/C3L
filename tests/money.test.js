import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
  toCents,
  formatCents,
  addCents,
} from '../src/money.js';

describe('toCents', () => {
  it('converts dollars to integer cents', () => {
    assert.strictEqual(toCents(1), 100);
    assert.strictEqual(toCents(0.5), 50);
    assert.strictEqual(toCents(0.01), 1);
    assert.strictEqual(toCents(123.456), 12346); // rounds
  });

  it('rejects non-numbers', () => {
    for (const v of [null, undefined, '', '1', [], {}, true]) {
      assert.throws(() => toCents(v), /dollars must be a number/);
    }
  });
});

describe('formatCents', () => {
  it('formats positive cents correctly', () => {
    assert.strictEqual(formatCents(0), '$0.00');
    assert.strictEqual(formatCents(123456789), '$1234567.89');
    assert.strictEqual(formatCents(100), '$1.00');
    assert.strictEqual(formatCents(99), '$0.99');
  });

  it('formats negative cents correctly', () => {
    assert.strictEqual(formatCents(-50), '-$0.50');
    assert.strictEqual(formatCents(-123456789), '-$1234567.89');
  });

  it('rejects non-numbers', () => {
    for (const v of [null, undefined, '', '1', [], {}, true]) {
      assert.throws(() => formatCents(v), /cents must be a number/);
    }
  });
});

describe('addCents', () => {
  it('sums multiple amounts correctly', () => {
    assert.strictEqual(addCents(100, 200), 300);
    assert.strictEqual(addCents(-50, 100), 50);
    assert.strictEqual(addCents(100, -100, 200), 200);
    assert.strictEqual(addCents(0), 0);
  });

  it('rejects non-numbers', () => {
    for (const v of [null, undefined, '', '1', [], {}, true]) {
      assert.throws(() => addCents(v), /amount must be a number/);
    }
  });

  it('rejects non-integer cents', () => {
    assert.throws(() => addCents(100, 50.5), /cents must be an integer/);
    assert.throws(() => addCents(-100.33, 200), /cents must be an integer/);
  });

  it('rejects empty arguments', () => {
    assert.throws(() => addCents(), /at least one amount required/);
  });
});

describe('round-trip', () => {
  it('formats round-tripped dollar values', () => {
    for (const d of [0, 1, -1, 123.456, -987.654]) {
      const cents = toCents(d);
      const sign = d < 0 ? '-' : '';
      const expected = `${sign}$${Math.abs(d).toFixed(2)}`;
      assert.strictEqual(formatCents(cents), expected);
    }
  });
});
