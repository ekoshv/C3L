// Shared test helpers. Node assert has no approximateEqual — use this instead.

export function approximateEqual(actual, expected, message = '', epsilon = 1e-6) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(
      message || `Expected ${expected} but got ${actual} (±${epsilon})`
    );
  }
}
