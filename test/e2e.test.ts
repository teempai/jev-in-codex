import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

test('compiled MCP exposes only labelling and writes actual simulated Choice answers', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'jev-label-e2e-')); let requests = 0;
  const http = createServer(async (request, response) => {
    let text = ''; for await (const chunk of request) text += chunk;
    const body = JSON.parse(text); requests++;
    assert.equal(request.url, '/v1/systemone'); assert.equal(request.headers.authorization, 'Bearer test-only-key');
    assert.equal(body.model, 'jev-1.13.0'); assert.equal(body.questions.q0.type, 'choice');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ answers: Object.fromEntries(Object.keys(body.questions).map(id => [id, {
      type: 'choice', choice: Object.keys(body.questions[id].criteria)[0], confidence: .95, probabilities: Object.fromEntries(Object.keys(body.questions[id].criteria).map((k, i) => [k, i === 0 ? .95 : .05 / (Object.keys(body.questions[id].criteria).length - 1)])),
    }])) }));
  });
  await new Promise<void>(resolve => http.listen(0, '127.0.0.1', resolve));
  const port = (http.address() as { port: number }).port;
  const env = { ...process.env, TYPESAFE_API_KEY: 'test-only-key', JEV_TEST_TYPESAFE_URL: `http://127.0.0.1:${port}/v1/systemone` } as Record<string, string>;
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', path.resolve('test/fixtures/local-typesafe.mjs'), path.resolve('dist/index.js'), '--root', root], env, stderr: 'pipe' });
  const client = new Client({ name: 'labelling-e2e', version: '0.2.0' });
  t.after(async () => { await client.close(); await transport.close(); await new Promise<void>(resolve => http.close(() => resolve())); await rm(root, { recursive: true, force: true }); });
  await writeFile(path.join(root, 'items.jsonl'), Array.from({ length: 64 }, (_, i) => JSON.stringify({ id: `r${i}`, text: 'Please change the fee policy.' })).join('\n'));
  await client.connect(transport);
  const { tools } = await client.listTools(); assert.deepEqual(tools.map(tool => tool.name), ['jev_label']); assert.equal(tools[0].annotations?.readOnlyHint, false);
  const result = await client.callTool({ name: 'jev_label', arguments: { path: 'items.jsonl' } }); assert.ok(!result.isError);
  const payload = JSON.parse((result.content[0] as { text: string }).text); assert.equal(payload.method, 'jev'); assert.equal(payload.api_requests, 8); assert.equal(requests, 8);
  const rows = (await readFile(path.join(root, 'decisions.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line)); assert.equal(rows.length, 64); assert.ok(rows.every(row => row.label === 'reliability'));
  const duplicate = await client.callTool({ name: 'jev_label', arguments: { path: 'items.jsonl' } }); assert.ok(duplicate.isError); assert.equal(requests, 8);
  const custom = await client.callTool({ name: 'jev_label', arguments: { path: 'items.jsonl', output_path: 'custom.jsonl', policy: { question: 'Which group?', criteria: { accept: 'Matches', other: 'Does not match' } } } });
  assert.ok(!custom.isError); assert.equal(requests, 16);
  const customRows = (await readFile(path.join(root, 'custom.jsonl'), 'utf8')).trim().split('\n').map(line => JSON.parse(line));
  assert.equal(customRows.length, 64); assert.ok(customRows.every(row => row.label === 'accept'));
  const invalid = await client.callTool({ name: 'jev_label', arguments: { path: 'items.jsonl', policy: { question: 'Q', criteria: { only: 'one label' } } } }).catch(() => ({ isError: true }));
  assert.ok(invalid.isError); assert.equal(requests, 16);
  const removed = await client.callTool({ name: 'jev_search', arguments: { question: 'anything' } }).catch(() => ({ isError: true })); assert.ok(removed.isError);
});
