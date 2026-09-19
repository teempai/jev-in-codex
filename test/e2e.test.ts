import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const project = fileURLToPath(new URL('..', import.meta.url));
const fakeKey = 'local-test-key-not-a-secret';
type RequestBody = {
  model: string;
  state: { objective: string; candidates: { id: string; text: string }[] };
  questions: Record<string, { type: string; instructions: string }>;
};
type Reply = { status?: number; payload?: unknown; raw?: string; stall?: boolean };
type Handler = (body: RequestBody) => Reply;

function scored(body: RequestBody, score: (id: string, text: string) => number): Reply {
  return { payload: {
    model: 'jev-simulated',
    answers: Object.fromEntries(body.state.candidates.map((item, i) =>
      [`q${i}`, { type: 'noul', noul: score(item.id, item.text) }])),
    usage: { input_tokens: 100, output_tokens: 20 },
  } };
}

function validateRequest(req: IncomingMessage, body: RequestBody) {
  assert.equal(req.method, 'POST');
  assert.equal(req.url, '/v1/systemone');
  assert.equal(req.headers.authorization, `Bearer ${fakeKey}`);
  assert.equal(req.headers['content-type'], 'application/json');
  assert.equal(body.model, 'jev-test-requested');
  assert.ok(body.state.objective.length > 0);
  assert.ok(body.state.candidates.length >= 1 && body.state.candidates.length <= 4);
  assert.deepEqual(Object.keys(body.questions), body.state.candidates.map((_, i) => `q${i}`));
  body.state.candidates.forEach((candidate, i) => {
    assert.equal(typeof candidate.id, 'string');
    assert.equal(typeof candidate.text, 'string');
    assert.equal(body.questions[`q${i}`].type, 'noul');
    assert.ok(body.questions[`q${i}`].instructions.includes(`state.candidates[${i}].text`));
  });
}

test('compiled MCP server ↔ local simulated TypeSafe HTTP provider', { timeout: 30000 }, async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'jev-e2e-'));
  const requests: RequestBody[] = [];
  const providerErrors: unknown[] = [];
  let handler: Handler = body => scored(body, () => 0.9);
  const provider = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const raw = Buffer.concat(chunks);
      assert.ok(raw.length <= 28000);
      const body: RequestBody = JSON.parse(raw.toString('utf8'));
      validateRequest(req, body);
      requests.push(body);
      const reply = handler(body);
      if (reply.stall) return; // Exercise the production fetch timeout and abort.
      res.writeHead(reply.status ?? 200, { 'content-type': 'application/json' });
      res.end(reply.raw ?? JSON.stringify(reply.payload));
    } catch (error) {
      providerErrors.push(error);
      res.writeHead(500).end('Test provider rejected the request.');
    }
  });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  const address = provider.address();
  assert.ok(address && typeof address === 'object');
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', path.join(project, 'test/fixtures/local-typesafe.mjs'),
      path.join(project, 'dist/index.js'), '--root', root],
    // Explicit allowlist: never inherit a real key or the user's NODE_OPTIONS.
    env: { PATH: process.env.PATH ?? '', TYPESAFE_API_KEY: fakeKey,
      JEV_MODEL: 'jev-test-requested', JEV_TEST_TYPESAFE_URL: `http://127.0.0.1:${address.port}/v1/systemone` },
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += chunk.toString(); });
  const client = new Client({ name: 'jev-local-e2e', version: '1.0.0' });
  t.after(async () => {
    try { await client.close(); await transport.close(); }
    finally {
      provider.closeAllConnections();
      await new Promise<void>((resolve, reject) => provider.close(error => error ? reject(error) : resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });
  const call = async (name: string, args: Record<string, unknown>) => {
    const response = await client.callTool({ name, arguments: args });
    assert.ok(!response.isError, JSON.stringify(response));
    const content = response.content as { type: string; text: string }[];
    assert.equal(content[0].type, 'text');
    return JSON.parse(content[0].text);
  };
  const catalog = Array.from({ length: 6 }, (_, i) => ({ id: `tool-${i}`, kind: 'tool', description: 'Inspect database state' }));
  await client.connect(transport);

  await t.test('handshake exposes all three tools', async () => {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['jev_search', 'jev_select_capability', 'jev_triage']);
    assert.equal(requests.length, 0);
  });

  await t.test('capability ranking combines two HTTP batches and uses provider scores', async () => {
    handler = body => scored(body, id => [0.1, 0.2, 0.3, 0.4, 0.7, 0.99][Number(id.at(-1))]);
    const before = requests.length;
    const result = await call('jev_select_capability', { objective: 'Inspect database state', candidates: catalog, limit: 6 });
    assert.equal(result.method, 'jev');
    assert.equal(result.score_kind, 'noul');
    assert.equal(result.model, 'jev-simulated');
    assert.equal(result.recommendation, 'tool-5');
    assert.deepEqual(result.results.map((item: { id: string; score: number }) => [item.id, item.score]), [['tool-5', 0.99], ['tool-4', 0.7]]);
    assert.equal(result.api_requests, 2);
    assert.deepEqual(requests.slice(before).map(body => body.state.candidates.length), [4, 2]);
  });

  await t.test('search sends real local excerpts and preserves ranked source lines', async () => {
    await mkdir(path.join(root, 'src'));
    await writeFile(path.join(root, 'src/a.ts'), '// database routine\n');
    await writeFile(path.join(root, 'src/b.ts'), '// database transaction rollback\n');
    handler = body => scored(body, id => id.startsWith('src/b.ts:') ? 0.98 : 0.12);
    const before = requests.length;
    const result = await call('jev_search', { question: 'database', scope: ['src'], limit: 2 });
    assert.equal(result.method, 'jev');
    assert.equal(result.results[0].path, 'src/b.ts');
    assert.equal(result.results[0].text, '// database transaction rollback');
    assert.equal(result.results[0].start_line, 1);
    assert.equal(result.results[0].end_line, 1);
    assert.equal(result.results[0].score, 0.98);
    assert.equal(result.coverage.files_scanned, 2);
    assert.equal(requests.length - before, 1);
    assert.ok(requests.at(-1)!.state.candidates.some(item => item.text.includes('// database transaction rollback')));
  });

  await t.test('triage ranks actual saved output and preserves evidence and coverage', async () => {
    const lines = [...Array(30).fill('database progress'), ...Array(30).fill('transaction rollback failure')];
    await writeFile(path.join(root, 'output.txt'), lines.join('\n') + '\n');
    handler = body => scored(body, (_id, text) => text.includes('rollback failure') ? 0.97 : 0.05);
    const result = await call('jev_triage', { question: 'database', artifact_path: 'output.txt', limit: 1 });
    assert.equal(result.method, 'jev');
    assert.equal(result.results[0].start_line, 31);
    assert.equal(result.results[0].end_line, 60);
    assert.equal(result.results[0].text, lines.slice(30).join('\n'));
    assert.equal(result.results[0].score, 0.97);
    assert.equal(result.coverage.total_lines, 60);
    assert.equal(result.coverage.chunks_evaluated, 2);
    assert.equal(result.omitted_results, 1);
  });

  await t.test('provider can reject every capability', async () => {
    handler = body => scored(body, () => 0.1);
    const result = await call('jev_select_capability', { objective: 'database', candidates: catalog.slice(0, 2) });
    assert.equal(result.method, 'jev');
    assert.equal(result.recommendation, null);
    assert.deepEqual(result.results, []);
  });

  await t.test('HTTP 429 after a successful batch falls back for the whole ranking', async () => {
    let batch = 0;
    handler = body => ++batch === 1 ? scored(body, () => 0.999) : { status: 429, raw: `Sensitive provider detail: ${fakeKey}` };
    const result = await call('jev_select_capability', { objective: 'database', candidates: catalog, limit: 6 });
    assert.equal(result.method, 'local_fallback');
    assert.equal(result.score_kind, 'lexical_overlap');
    assert.equal(result.api_requests, 2);
    assert.match(result.fallback_reason, /HTTP 429/);
    assert.ok(result.results.every((item: { score: number }) => item.score === 1));
    assert.ok(!JSON.stringify(result).includes(fakeKey));
  });

  for (const [name, reply] of [
    ['invalid JSON', { raw: '{broken' }],
    ['invalid score', { payload: { answers: { q0: { type: 'noul', noul: 9 } } } }],
    ['missing answer', { payload: { answers: {} } }],
  ] satisfies [string, Reply][]) {
    await t.test(`${name} produces explicit fallback over MCP`, async () => {
      handler = () => reply;
      const result = await call('jev_select_capability', { objective: 'database', candidates: catalog.slice(0, 1) });
      assert.equal(result.method, 'local_fallback');
      assert.equal(result.api_requests, 1);
      assert.equal(result.recommendation, 'tool-0');
    });
  }

  await t.test('invalid paths fail before any provider request', async () => {
    const before = requests.length;
    const result = await client.callTool({ name: 'jev_triage', arguments: { question: 'database', artifact_path: '../outside' } });
    assert.equal(result.isError, true);
    assert.equal(requests.length, before);
  });

  await t.test('a stalled HTTP provider triggers the real production timeout', async () => {
    handler = () => ({ stall: true });
    const result = await call('jev_select_capability', { objective: 'database', candidates: catalog.slice(0, 1) });
    assert.equal(result.method, 'local_fallback');
    assert.equal(result.api_requests, 1);
    assert.match(result.fallback_reason, /timed out/);
  });

  await t.test('server remains usable after failures', async () => {
    handler = body => scored(body, () => 0.88);
    const result = await call('jev_select_capability', { objective: 'database', candidates: catalog.slice(0, 1) });
    assert.equal(result.method, 'jev');
    assert.equal(result.results[0].score, 0.88);
    assert.equal(stderr, '');
    assert.deepEqual(providerErrors, []);
  });
});
