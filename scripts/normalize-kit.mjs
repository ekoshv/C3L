import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else {
      let b = readFileSync(f);
      if (b.length > 1 && b[1] === 0) b = Buffer.from(b.toString('utf16le'), 'utf8');
      let t = b.toString('utf8');
      if (f.endsWith('project_description.md') && !t.includes('analyze_turns:')) {
        t = t.replace(/(recovery_turns: \d+\r?\n)/, '$1analyze_turns: 8\n');
      }
      writeFileSync(f, t, 'utf8');
    }
  }
}

walk('_kit');
console.log('normalize done');
