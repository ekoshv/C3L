import { existsSync } from 'node:fs';
import { join } from 'node:path';

export function milestoneFilesPresent(root, milestone) {
  return milestone.files.filter((f) => existsSync(join(root, f))).length;
}

export function milestoneComplete(root, milestone) {
  return milestoneFilesPresent(root, milestone) === milestone.files.length;
}

export function nextIncomplete(root, milestones) {
  return milestones.find((m) => !milestoneComplete(root, m)) || null;
}

export function allComplete(root, milestones) {
  return milestones.every((m) => milestoneComplete(root, m));
}
