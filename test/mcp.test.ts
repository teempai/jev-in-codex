import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('stdio MCP handshake, tool discovery, all three calls, and validation', { timeout: 20000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'jev-mcp-'));
  await writeFile(path.join(root, 'output.txt'), 'PASS startup\nERROR database connection refused\n');
  const transport = new StdioClientTransport({ command: process.execPath,
    args: ['dist/index.js', '--root', root], env: { PATH: process.env.PATH ?? '' }, stderr: 'pipe' });
  let stderr = '';
  transport.stderr?.on('data', chunk => { stderr += chunk.toString(); });
  const client = new Client({ name: 'jev-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(tool => tool.name).sort(), ['jev_search', 'jev_select_capability', 'jev_triage']);
    for (const [name, args] of [
      ['jev_select_capability', { objective: 'database', candidates: [{ id: 'sql', kind: 'tool', description: 'Inspect database queries' }] }],
      ['jev_search', { question: 'database', scope: ['.'] }],
      ['jev_triage', { question: 'database', artifact_path: 'output.txt' }],
    ] as const) {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, JSON.stringify(result));
      const content = result.content as { type: string; text: string }[];
      const data = JSON.parse(content[0].text);
      assert.equal(data.method, 'local_fallback');
      assert.equal(data.results.length, 1);
    }
    const invalid = await client.callTool({ name: 'jev_triage', arguments: { question: 'database', artifact_path: '../outside' } });
    assert.equal(invalid.isError, true);
    const badLimit = await client.callTool({ name: 'jev_search', arguments: { question: 'database', limit: 999 } });
    assert.equal(badLimit.isError, true);
    assert.equal(stderr, '');
  } finally { await client.close(); await transport.close(); await rm(root, { recursive: true, force: true }); }
});
