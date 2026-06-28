import { readFileSync, appendFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseFailingTests } from './active.mjs';
import { errorHints } from './hints.mjs';

const FAIL = 'failure_journal.log';
const SKILLS = 'learned_skills.log';

function tail(text, n = 30) {
  return (text || '').trim().split('\n').slice(-n).join('\n');
}

export function readFailureJournal(root, lines = 40) {
  const p = join(root, FAIL);
  return existsSync(p) ? tail(readFileSync(p, 'utf8'), lines) : '(empty)';
}

export function readLearnedSkills(root, lines = 25) {
  const p = join(root, SKILLS);
  return existsSync(p) ? tail(readFileSync(p, 'utf8'), lines) : '(empty)';
}

export function completedJournalBlocks(text, limit = 3) {
  return (text || '')
    .split(/\n---\n/)
    .filter((block) => /root_cause:/i.test(block) && /do_not_repeat:/i.test(block))
    .slice(-limit);
}

export function journalContextFromText(failText, skillsText = '') {
  const completed = completedJournalBlocks(failText, 3).join('\n---\n') || '(empty)';
  return (
    `--- completed failure analyses ---\n${completed}\n\n` +
    `--- learned_skills.log ---\n${skillsText || '(empty)'}`
  );
}

export function latestAnalysisComplete(text) {
  const blocks = (text || '').split(/\n---\n/).filter((b) => b.includes('[orchestrator]'));
  const latest = blocks.at(-1) || '';
  return /root_cause:/i.test(latest) && /do_not_repeat:/i.test(latest);
}

export function failureJournalText(root) {
  const p = join(root, FAIL);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

export function markAnalysisMissing(root) {
  appendFileSync(join(root, FAIL), 'analysis_missing: true\n');
}

function firstErrorLine(output) {
  const m = (output || '').match(/^(✖ .+|Error:.+|AssertionError.+|TypeError.+)/m);
  return m ? m[1].trim() : 'unknown error';
}

export function parseFailCount(output) {
  const m = (output || '').match(/ℹ fail (\d+)/);
  return m ? Number(m[1]) : output?.includes('FAILURES') ? 1 : 0;
}

export function appendOrchestratorFailure(root, entry) {
  const tests = parseFailingTests(entry.output).join(', ') || 'unknown';
  const block =
    `\n---\n[orchestrator] ${entry.time || new Date().toISOString()}\n` +
    `phase: ${entry.phase}\n` +
    `milestone: ${entry.milestone?.id || '?'} (${entry.milestone?.title || '?'})\n` +
    `fingerprint: ${entry.fingerprint}\n` +
    `failing_tests: ${tests}\n` +
    `first_error: ${firstErrorLine(entry.output)}\n` +
    `hints: ${errorHints(entry.output).replace(/\n/g, ' ').trim() || 'none'}\n` +
    `[model: append below with root_cause and do_not_repeat]\n`;
  appendFileSync(join(root, FAIL), block);
}

export function appendLearnedSkill(root, text, milestone) {
  const block =
    `\n---\n[${new Date().toISOString()}] milestone: ${milestone?.id || '?'}\n` +
    `${text.trim()}\n`;
  appendFileSync(join(root, SKILLS), block);
}

export function clearJournals(root) {
  for (const f of [FAIL, SKILLS]) {
    const p = join(root, f);
    if (existsSync(p)) rmSync(p);
  }
}

export function journalContext(root) {
  return journalContextFromText(failureJournalText(root), readLearnedSkills(root, 20));
}
