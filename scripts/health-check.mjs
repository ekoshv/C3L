import { spawnSync } from 'node:child_process';

const tiers = {
  quick: ['npm test'],
  full: ['npm test', 'npm run build --if-present']
};

const tier = process.argv[2] ?? 'quick';
const steps = tiers[tier];

if (!steps) {
  console.error(`Unknown tier "${tier}". Use: quick | full`);
  process.exit(1);
}

console.log(`[health-check] tier=${tier} steps=${steps.length}`);

for (const cmd of steps) {
  console.log(`[health-check] running: ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`[health-check] FAILED at: ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

console.log('[health-check] all steps passed');
