import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, cp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { feedbackPolicy } from '../src/policy.js';

test('admitted source and policy match measured release; recorded MCP calls succeeded', async () => {
  const base = 'benchmarks/results/release';
  const frozen = JSON.parse(await readFile(base + '/freeze.json', 'utf8')) as Record<string, string>;
  const source = (await readdir('src')).map(file => 'src/' + file).sort();
  assert.deepEqual(source, Object.keys(frozen).filter(file => file.startsWith('src/')).sort());
  for (const file of source) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'), frozen[file], `${file}: rerun benchmark for changed capability implementation`);
  const policy = JSON.parse(await readFile('benchmarks/fixtures/policy.json', 'utf8'));
  assert.deepEqual(feedbackPolicy.criteria, policy.criteria); assert.equal(feedbackPolicy.question, policy.question);
  for (let rep = 0; rep < 4; rep++) {
    const events = (await readFile(`${base}/feedback_theme-${rep}-N/events.jsonl`, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
    const calls = events.filter(x => x.type === 'item.completed' && x.item.type === 'mcp_tool_call').map(x => x.item);
    assert.equal(calls.length, 1); assert.equal(calls[0].tool, 'jev_label'); assert.equal(calls[0].status, 'completed'); assert.equal(calls[0].error, null);
    const result = JSON.parse(calls[0].result.content[0].text); assert.equal(result.method, 'jev'); assert.equal(result.api_requests, 8); assert.equal(result.records, 64);
  }
});

test('benchmark gate recomputes success and rejects a corrupted complete artifact', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jev-benchmark-grade-')); t.after(() => rm(root, { recursive: true, force: true }));
  await cp('benchmarks/results/release', root, { recursive: true });
  const run = () => spawnSync(process.execPath, ['benchmarks/analyze.mjs', root, '--require-pass'], { encoding: 'utf8' });
  const good = run(); assert.equal(good.status, 0, good.stderr);
  const file = path.join(root, 'feedback_theme-0-N/decisions.jsonl'); const rows = (await readFile(file, 'utf8')).trim().split('\n').map(line => JSON.parse(line)); rows[0].label = 'invalid';
  await writeFile(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n'); assert.equal(run().status, 1);
});
