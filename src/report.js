export function totalsByCategory(entries) {
  const sums = new Map();

  for (const entry of entries) {
    if (!entry.category || typeof entry.category !== 'string' || entry.category.trim() === '') {
      throw new Error('Entry has empty or missing category');
    }

    const current = sums.get(entry.category) ?? 0;
    sums.set(entry.category, current + entry.amount);
  }

  return Object.fromEntries(sums);
}
