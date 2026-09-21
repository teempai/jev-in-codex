import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { feedbackPolicy } from '../src/policy.js';

test('admitted source and policy match measured release; recorded MCP calls succeeded', async () => {
  const base = 'benchmarks/results/custom';
  const frozen = JSON.parse(await readFile(base + '/freeze.json', 'utf8')) as Record<string, string>;
  const source = (await readdir('src')).map(file => 'src/' + file).sort();
  assert.deepEqual(source, Object.keys(frozen).filter(file => file.startsWith('src/')).sort());
  for (const file of source) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), frozen[file], `${file}: rerun benchmark for changed capability implementation`);
  for (const [file, hash] of Object.entries(frozen)) {
    if (file.startsWith('benchmarks/') && !file.endsWith('/README.md')) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), hash, `${file}: frozen benchmark material changed`);
  }
  const tasks = JSON.parse(await readFile('benchmarks/custom/tasks.json', 'utf8'));
  assert.deepEqual(JSON.parse(await readFile(base + '/tasks.json', 'utf8')), tasks);
  const exported = JSON.parse(await readFile(base + '/export.json', 'utf8'));
  for (const [file, hash] of Object.entries(exported.sha256)) assert.equal(createHash('sha256').update(await readFile(base + '/' + file)).digest('hex'), hash, `Export integrity: ${file}`);
  assert.deepEqual(tasks.map((x: { id: string }) => x.id), ['action_needed', 'sentiment', 'document_route', 'feedback_theme']);
  const policy = JSON.parse(await readFile('benchmarks/fixtures/policy.json', 'utf8'));
  assert.deepEqual(feedbackPolicy.criteria, policy.criteria); assert.equal(feedbackPolicy.question, policy.question);
  for (const task of tasks) for (let rep = 0; rep < 4; rep++) {
    const events = (await readFile(`${base}/${task.id}-${rep}-N/events.jsonl`, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const calls = events.filter(x => x.type === 'item.completed' && x.item.type === 'mcp_tool_call').map(x => x.item);
    assert.equal(calls.length, 1); assert.equal(calls[0].tool, 'jev_label'); assert.equal(calls[0].status, 'completed'); assert.equal(calls[0].error, null);
    const result = JSON.parse(calls[0].result.content[0].text); assert.equal(result.method, 'jev'); assert.equal(result.api_requests, 8); assert.equal(result.records, 64);
    if (task.id !== 'feedback_theme') { assert.deepEqual(result.policy.criteria, task.policy.criteria); assert.equal(result.policy.question, task.policy.question); }
  }
});

test('benchmark gate recomputes success and rejects a corrupted complete artifact', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jev-benchmark-grade-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp('benchmarks/results/custom', root, { recursive: true });
  const run = () => spawnSync(process.execPath, ['benchmarks/analyze.mjs', root, '--require-pass'], { encoding: 'utf8' });
  const good = run(); assert.equal(good.status, 0, good.stderr);
  const file = path.join(root, 'action_needed-0-N/decisions.jsonl'); const rows = (await readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line)); rows[0].label = 'invalid';
  await writeFile(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n'); assert.equal(run().status, 1);
});

test('original release remains admitted under the recomputed complete-output gate', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jev-original-grade-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp('benchmarks/results/release', root, { recursive: true });
  const result = spawnSync(process.execPath, ['benchmarks/analyze.mjs', root, '--require-pass'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
