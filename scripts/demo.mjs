// Demonstrates real compiled-server MCP calls with synthetic local data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const { values } = parseArgs({ options: { record: { type: 'string' } } });
const project = fileURLToPath(new URL('..', import.meta.url));
const root = await mkdtemp(path.join(tmpdir(), 'jev-demo-'));
const scenes = [];
let httpRequests = 0;
let providerError;
function show(title, lines) {
  scenes.push({ title, lines });
  console.log(`\n${title}\n${lines.join('\n')}`);
}
const provider = createServer(async (req, res) => {
  try {
    assert.equal(req.url, '/v1/systemone');
    assert.equal(req.method, 'POST');
    assert.equal(req.headers.authorization, 'Bearer synthetic-demo-key');
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    httpRequests++;
    const answers = Object.fromEntries(body.state.candidates.map((candidate, i) => {
      assert.equal(body.questions[`q${i}`].type, 'noul');
      let score = 0.08;
      if (candidate.id === 'exec_command') score = 0.96;
      else if (candidate.id.startsWith('src/db.ts:')) score = 0.98;
      else if (candidate.text.includes('Error: connection refused')) score = 0.99;
      return [`q${i}`, { type: 'noul', noul: score }];
    }));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ model: 'jev-simulated', answers, usage: { input_tokens: 100, output_tokens: 20 } }));
  } catch (error) {
    providerError = error;
    res.writeHead(500).end('Invalid demo request');
  }
});
provider.listen(0, '127.0.0.1');
await once(provider, 'listening');
const port = provider.address().port;
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--import', path.join(project, 'test/fixtures/local-typesafe.mjs'),
    path.join(project, 'dist/index.js'), '--root', root],
  env: { PATH: process.env.PATH ?? '', TYPESAFE_API_KEY: 'synthetic-demo-key',
    JEV_TEST_TYPESAFE_URL: `http://127.0.0.1:${port}/v1/systemone` },
  stderr: 'pipe',
});
let stderr = '';
transport.stderr.on('data', data => { stderr += data.toString(); });
const client = new Client({ name: 'jev-demo', version: '1.0.0' });
async function call(name, args) {
  const response = await client.callTool({ name, arguments: args });
  assert.ok(!response.isError, JSON.stringify(response));
  const result = JSON.parse(response.content[0].text);
  assert.equal(result.method, 'jev');
  assert.equal(result.model, 'jev-simulated');
  return result;
}
try {
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/db.ts'), [
    'export async function connectDatabase(client) {',
    '  // TODO: retry transient connection failures.',
    '  return client.connect();',
    '}',
  ].join('\n') + '\n');
  await writeFile(path.join(root, 'src/cache.ts'), '// Retry cache connection after eviction.\n');
  const lines = [...Array.from({ length: 120 }, (_, i) => `PASS unit/case-${i + 1}`),
    'FAIL database reconnects after a transient error', 'Error: connection refused',
    'Expected retry attempts: 3', 'Received: 1'];
  await writeFile(path.join(root, 'test-output.txt'), lines.join('\n') + '\n');
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  show('Connected to the real MCP server', [
    '$ npm run demo', '', 'Task: investigate a failing database reconnect test.', '',
    'Compiled server connected over stdio.', `${tools.length} tools discovered:`, ...tools.map(tool => `  ${tool.name}`),
  ]);
  const selection = await call('jev_select_capability', {
    objective: 'Investigate a failing database reconnect test in local source and logs.',
    candidates: [
      { id: 'web__run', kind: 'tool', description: 'Search public documentation and web pages.' },
      { id: 'exec_command', kind: 'tool', description: 'Inspect local source and logs and run repository tests.' },
      { id: 'image_gen__imagegen', kind: 'tool', description: 'Generate or edit images.' },
    ], limit: 3,
  });
  assert.equal(selection.recommendation, 'exec_command');
  show('1 / Choose a useful capability', [
    '> jev_select_capability', '', 'Example shortlist: web search, shell, image generation',
    `${selection.candidates_evaluated} candidates evaluated`, '',
    `Recommended: ${selection.recommendation}`, `Relevance score: ${selection.results[0].score}`, '',
    'The caller keeps control of execution.',
  ]);
  const search = await call('jev_search', {
    question: 'Where should database connection retry behavior be implemented?',
    query_terms: ['connection', 'retry'], scope: ['src'], limit: 1,
  });
  const hit = search.results[0];
  assert.equal(hit.path, 'src/db.ts');
  show('2 / Find the relevant code', [
    '> jev_search', '', `${search.coverage.files_scanned} files scanned; ${search.coverage.excerpts_shortlisted} excerpts ranked`,
    `Top match: ${hit.path}:${hit.start_line}-${hit.end_line}  [${hit.score}]`, '',
    ...hit.text.split('\n'),
  ]);
  const triage = await call('jev_triage', {
    question: 'Why did the database reconnect test fail?', artifact_path: 'test-output.txt', limit: 1,
  });
  const failure = triage.results[0];
  assert.equal(failure.start_line, 121);
  assert.equal(failure.end_line, 124);
  assert.equal(triage.coverage.total_lines, 124);
  show('3 / Find the useful part of a long log', [
    '> jev_triage', '', `${triage.coverage.total_lines} log lines; ${triage.coverage.chunks_evaluated} chunks evaluated`,
    `Top excerpt: ${failure.path}:${failure.start_line}-${failure.end_line}`, '',
    ...failure.text.split('\n'),
  ]);
  assert.equal(httpRequests, 4);
  assert.equal(stderr, '');
  assert.equal(providerError, undefined);
  show('Evidence ready for the coding agent', [
    'Suggested capability: exec_command', 'Relevant source: src/db.ts:1-4',
    'Failure evidence: test-output.txt:121-124', '',
    '3 real MCP tool calls completed.', `${httpRequests} HTTP requests served by the local simulator.`,
    'Original files and full output remain available.', '',
    'Synthetic fixture scores; no live Jev prediction.',
  ]);
  if (values.record) {
    await writeFile(values.record, JSON.stringify({
      title: 'Jev in Codex', mode: 'local-simulated-provider',
      note: 'Real compiled-server MCP calls; synthetic data and deterministic TypeSafe responses. Presentation is paced for readability, not a latency benchmark. This is not a recording of the Codex UI.',
      http_requests: httpRequests, scenes,
    }, null, 2) + '\n');
  }
} finally {
  try { await client.close(); await transport.close(); }
  finally {
    provider.closeAllConnections();
    await new Promise(resolve => provider.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
}
