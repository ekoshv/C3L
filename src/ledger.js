export function createLedger() {
  const entries = new Map();

  return {
    post(entry) {
      if (typeof entry !== 'object' || typeof entry.account !== 'string') {
        throw new TypeError('entry must be { account: string, amount: number }');
      }
      if (typeof entry.amount !== 'number') {
        throw new TypeError('amount must be a number');
      }
      if (!Number.isInteger(entry.amount)) {
        throw new TypeError('amount must be an integer in cents');
      }

      const account = entry.account;
      if (!entries.has(account)) entries.set(account, 0);
      entries.set(account, entries.get(account) + entry.amount);
    },

    balanceOf(account) {
      return entries.get(account) ?? 0;
    },
  };
}
