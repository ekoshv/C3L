// Parse health output and resolve which milestone is active.

export function parseFailingTests(output) {
  const found = new Set();
  const text = output || '';
  for (const m of text.matchAll(/test at (tests[^\s:]+\.test\.js)/gi)) {
    found.add(m[1].replace(/\\/g, '/'));
  }
  for (const m of text.matchAll(/\/(tests\/[^\s:]+\.test\.js)/gi)) {
    found.add(m[1].replace(/\\/g, '/'));
  }
  return [...found];
}

export function milestoneForPath(milestones, filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return (
    milestones.find((m) =>
      m.files.some((f) => {
        const p = f.replace(/\\/g, '/');
        return p === norm || norm.endsWith('/' + p) || norm.endsWith(p);
      })
    ) || null
  );
}

export function activeMilestone(root, milestones, healthOutput, healthOk, nextIncomplete) {
  if (!healthOk) {
    for (const f of parseFailingTests(healthOutput)) {
      const m = milestoneForPath(milestones, f);
      if (m) return m;
    }
    return nextIncomplete(root, milestones) || milestones.at(-1);
  }
  return nextIncomplete(root, milestones);
}

export function scopeLines(milestone) {
  if (!milestone) return '';
  const mode = milestone.mode === 'pure-logic' ? 'PURE LOGIC — no DOM/browser/canvas/Three.js/jsdom.' : '';
  const files = milestone.files.map((f) => `- ${f}`).join('\n');
  return `Active milestone: ${milestone.id} (${milestone.title})${mode ? '\n' + mode : ''}\nScope — edit ONLY:\n${files}`;
}
