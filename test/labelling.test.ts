import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { labelFile } from '../src/labelling.js';
import { Workspace } from '../src/workspace.js';
import { feedbackPolicy } from '../src/policy.js';

async function fixture(t: test.TestContext, count = 1) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jev-label-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'items.jsonl'), Array.from({ length: count }, (_, i) => JSON.stringify({ id: `r${i}`, text: 'Original synthetic evidence.' })).join('\n'));
  return { root, workspace: await Workspace.create(root) };
}
function response(body: string, confidence = .7) {
  const request = JSON.parse(body);
  return { answers: Object.fromEntries(Object.keys(request.questions).map(id => [id, {
    type: 'choice', choice: 'feature', confidence,
    probabilities: { feature: .7, pricing: .1, usability: .1, reliability: .1 },
  }])) };
}

test('64 records delegate to eight concurrent requests; full file and uncertain evidence survive', async t => {
  const { root, workspace } = await fixture(t, 64); let calls = 0, active = 0, peak = 0;
  const mock = (async (url, init) => {
    assert.equal(url, 'https://api.typesafe.ai/v1/systemone'); assert.equal(init?.redirect, 'error');
    const body = String(init?.body), request = JSON.parse(body);
    assert.equal(request.model, 'jev-1.13.0'); assert.equal(request.state.items.length, 8);
    assert.deepEqual(request.questions.q0.criteria, feedbackPolicy.criteria);
    assert.ok(request.questions.q7.instructions.includes('state.items[7].text'));
    assert.ok(Buffer.byteLength(body) <= 28000);
    calls++; active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 10)); active--;
    await writeFile(path.join(root, 'items.jsonl'), 'changed after snapshot');
    return Response.json(response(body));
  }) as typeof fetch;
  const result = await labelFile(workspace, 'items.jsonl', undefined, { apiKey: 'test-only', fetch: mock });
  assert.equal(calls, 8); assert.equal(peak, 8); assert.equal(result.api_requests, 8);
  assert.equal(result.method, 'jev'); assert.equal(result.review.length, 64);
  assert.ok(result.review.every(item => item.text === 'Original synthetic evidence.'));
  const rows = (await readFile(path.join(root, 'decisions.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(rows, Array.from({ length: 64 }, (_, i) => ({ id: `r${i}`, label: 'feature' })));
});

test('missing credentials and malformed input fail without output or a provider call', async t => {
  const { root, workspace } = await fixture(t); let calls = 0;
  const options = { apiKey: 'test-only', fetch: (async () => { calls++; throw Error('should not call'); }) as typeof fetch };
  await assert.rejects(labelFile(workspace, 'items.jsonl', undefined, {}), /not configured/);
  for (const content of ['', '{}', '{', '{"id":"x","text":"a","secret":"extra"}', '{"id":"x","text":""}', '{"id":"x","text":"a"}\n{"id":"x","text":"b"}']) {
    await writeFile(path.join(root, 'items.jsonl'), content);
    await assert.rejects(labelFile(workspace, 'items.jsonl', undefined, options));
  }
  assert.equal(calls, 0); await assert.rejects(readFile(path.join(root, 'decisions.jsonl')));
});

test('path boundaries and existing output are rejected before requests', async t => {
  const { root, workspace } = await fixture(t); const outside = await mkdtemp(path.join(os.tmpdir(), 'jev-outside-')); t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'other.jsonl'), '{"id":"x","text":"external"}');
  await symlink(outside, path.join(root, 'escape')); await writeFile(path.join(root, '.env'), 'private');
  let calls = 0; const options = { apiKey: 'test-only', fetch: (async () => { calls++; throw Error('should not call'); }) as typeof fetch };
  for (const file of ['../other.jsonl', '/etc/passwd', 'escape/other.jsonl', '.env']) await assert.rejects(labelFile(workspace, file, undefined, options));
  for (const output of ['../out.jsonl', '/tmp/out.jsonl', 'escape/out.jsonl', '.env', 'missing/out.jsonl']) await assert.rejects(labelFile(workspace, 'items.jsonl', output, options));
  await symlink(path.join(outside, 'not-created'), path.join(root, 'decisions.jsonl'));
  await assert.rejects(labelFile(workspace, 'items.jsonl', undefined, options), /exists/);
  assert.equal(calls, 0); await assert.rejects(readFile(path.join(outside, 'not-created')));
});

test('provider errors, missing labels and malformed confidence fail closed and sanitize errors', async t => {
  const { root, workspace } = await fixture(t);
  const mocks: typeof fetch[] = [
    async () => new Response('remote secret', { status: 429 }),
    async () => { throw Error('remote secret'); },
    async () => new Response('{'),
    async () => Response.json({ answers: {} }),
    async (_url, init) => { const x = response(String(init?.body)); x.answers.q0.choice = 'not-a-label'; return Response.json(x); },
    async (_url, init) => Response.json(response(String(init?.body), 2)),
    async (_url, init) => { const x = response(String(init?.body)); x.answers.q0.probabilities.feature = -1; return Response.json(x); },
  ];
  for (const mock of mocks) {
    await assert.rejects(labelFile(workspace, 'items.jsonl', undefined, { apiKey: 'test-only', fetch: mock }), error => {
      assert.ok(error instanceof Error); assert.match(error.message, /No output/); assert.ok(!error.message.includes('secret')); return true;
    });
    await assert.rejects(readFile(path.join(root, 'decisions.jsonl')));
  }
});

test('partial batch failure writes nothing; successful nested output is never overwritten', async t => {
  const { root, workspace } = await fixture(t, 9); let calls = 0;
  const failing = (async (_url, init) => ++calls === 2 ? new Response('', { status: 500 }) : Response.json(response(String(init?.body), .9))) as typeof fetch;
  await assert.rejects(labelFile(workspace, 'items.jsonl', undefined, { apiKey: 'test-only', fetch: failing }), /No output/);
  await assert.rejects(readFile(path.join(root, 'decisions.jsonl')));
  await mkdir(path.join(root, 'output'));
  const mock = (async (_url, init) => Response.json(response(String(init?.body), .9))) as typeof fetch;
  const result = await labelFile(workspace, 'items.jsonl', 'output/labels.jsonl', { apiKey: 'test-only', fetch: mock });
  assert.equal(result.output_path, 'output/labels.jsonl'); assert.deepEqual(result.review, []);
  const original = await readFile(path.join(root, 'output/labels.jsonl'));
  await assert.rejects(labelFile(workspace, 'items.jsonl', 'output/labels.jsonl', { apiKey: 'test-only', fetch: failing }), /exists/);
  assert.deepEqual(await readFile(path.join(root, 'output/labels.jsonl')), original);
});
