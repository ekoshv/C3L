export function toCents(dollars) {
  if (typeof dollars !== 'number') throw new TypeError('dollars must be a number');
  return Math.round(dollars * 100);
}

export function formatCents(cents) {
  if (typeof cents !== 'number') throw new TypeError('cents must be a number');
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const fraction = String(abs % 100).padStart(2, '0');
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${dollars}.${fraction}`;
}

export function addCents(...amounts) {
  if (amounts.length === 0) throw new TypeError('at least one amount required');
  for (const a of amounts) {
    if (typeof a !== 'number') throw new TypeError(`amount must be a number, got ${a}`);
    if (!Number.isInteger(a)) throw new TypeError(`cents must be an integer, got ${a}`);
  }
  return amounts.reduce((sum, a) => sum + a, 0);
}
