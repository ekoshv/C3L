// Match common local-model mistakes in health output; inject targeted fix hints.

const RULES = [
  {
    test: /assert\.approximateEqual is not a function/i,
    hint:
      'Node assert has NO approximateEqual. Import { approximateEqual } from ' +
      './test-utils.js (or ../test-utils.js) or use assert.ok(Math.abs(a - b) < 1e-6).',
  },
  {
    test: /SyntaxError.*describe|failing tests:/i,
    hint:
      'Assertions belong inside it()/test() callbacks, never in describe() body.',
  },
  {
    test: /Duplicate export|already been declared/i,
    hint:
      'Remove duplicate class/function/export — keep one definition per symbol in one file.',
  },
  {
    test: /Cannot find module|ERR_MODULE_NOT_FOUND/i,
    hint:
      'Fix the import path or add the missing file. Use .js extensions in ESM imports.',
  },
  {
    test: /assert\.\w+ is not a function/i,
    hint:
      'Do not invent assert helpers. Use node:assert/strict or tests/test-utils.js.',
  },
  {
    test: /isABSActive|slipRatio|lockup flag/i,
    hint:
      'Tests may set slipRatio directly but update() recalculates from omega values — ' +
      'set omega_wheel/omega_vehicle in tests or fix update()/lockup clear logic.',
  },
  {
    test: /FAST_CYCLE|valveState|Modulator toggles/i,
    hint:
      'Keep FAST_CYCLE as the active mode while toggling OPEN/CLOSED sub-states; ' +
      'do not replace FAST_CYCLE with OPEN/CLOSED on the mode field.',
  },
  {
    test: /window\.|jsdom|Cannot set properties of undefined/i,
    hint:
      'Tests must ESM-import from src/: import { X } from "../src/module.js". ' +
      'No window globals, jsdom, document, canvas, or Three.js in Node tests.',
  },
  {
    test: /triggerUncaughtException|AssertionError[\s\S]*app\.test|at file:\/\/.*\.test\.js:\d+:\d+\s*$/m,
    hint:
      'Assertions at module top level crash the test runner. Wrap EVERY check in ' +
      'test("name", () => { ... }) or it("name", () => { ... }).',
  },
];

export function errorHints(output) {
  const text = output || '';
  const matched = RULES.filter((r) => r.test.test(text)).map((r) => `- ${r.hint}`);
  if (!matched.length) return '';
  return '\nAuto-detected patterns (apply these first):\n' + matched.join('\n');
}
