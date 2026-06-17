import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

// Keeps the quick health check green on a brand-new project so the orchestrator
// proceeds to implement milestone 1 instead of entering the fix path. Safe to
// keep or delete once you have real tests.
test('project scaffold present', () => {
  assert.ok(existsSync('project_description.md'), 'project_description.md missing');
});
