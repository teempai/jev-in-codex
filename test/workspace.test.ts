import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Workspace, excerpts } from '../src/workspace.js';
import { Service } from '../src/service.js';
import { Jev } from '../src/jev.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await mkdtemp(path.join(tmpdir(), 'jev-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, workspace: await Workspace.create(root) };
}

test('reject traversal, absolute paths, excluded files, and escaping symlinks', async t => {
  const { root, workspace } = await fixture(t);
  await writeFile(path.join(root, '.env'), 'secret');
  await writeFile(path.join(root, 'good.txt'), 'hello');
  await symlink('/etc/passwd', path.join(root, 'escape.txt'));
  await symlink('.env', path.join(root, 'alias.txt'));
  for (const file of ['../outside', '/etc/passwd', '.env', 'escape.txt', 'alias.txt']) {
    await assert.rejects(workspace.read(file));
  }
  assert.equal(await workspace.read('good.txt'), 'hello');
});

test('reject binary and oversized artifacts', async t => {
  const { root, workspace } = await fixture(t);
  await writeFile(path.join(root, 'binary'), Buffer.from([0, 1]));
  await writeFile(path.join(root, 'invalid-utf8'), Buffer.from([0xff]));
  await writeFile(path.join(root, 'huge'), Buffer.alloc(1024 * 1024 + 1, 65));
  await assert.rejects(workspace.read('binary'));
  await assert.rejects(workspace.read('invalid-utf8'));
  await assert.rejects(workspace.read('huge'));
});

test('excerpt line numbers round-trip to original evidence', () => {
  const lines = Array.from({ length: 75 }, (_, i) => `line ${i + 1}`);
  const result = excerpts('log.txt', lines.join('\n') + '\n', 12, 69);
  assert.equal(result[0].start_line, 12);
  assert.equal(result.at(-1)!.end_line, 69);
  for (const chunk of result) assert.equal(chunk.text, lines.slice(chunk.start_line - 1, chunk.end_line).join('\n'));
  assert.throws(() => excerpts('x', 'a\nb', 2, 1));
  assert.throws(() => excerpts('x', 'x'.repeat(4001)));
});

test('search honors scope and gitignore, with zero results for unmatched terms', async t => {
  const { root, workspace } = await fixture(t);
  await mkdir(path.join(root, '.git'));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, '.gitignore'), 'ignored.txt\n');
  await writeFile(path.join(root, 'ignored.txt'), 'database hidden');
  await writeFile(path.join(root, '.env'), 'database secret');
  await writeFile(path.join(root, 'outside.txt'), 'database outside');
  await writeFile(path.join(root, 'src', 'db.ts'), 'export function database() {}\n');
  const found = await workspace.search('database', ['src'], []);
  assert.equal(found.candidates.length, 1);
  assert.equal(found.candidates[0].path, 'src/db.ts');
  const all = await workspace.search('database', ['.'], []);
  assert.deepEqual(all.candidates.map(item => item.path).sort(), ['outside.txt', 'src/db.ts']);
  assert.equal((await workspace.search('unmatchedword', ['.'], [])).candidates.length, 0);
});

test('triage reports preselection and preserves late relevant failure', async t => {
  const { root, workspace } = await fixture(t);
  const lines = Array.from({ length: 900 }, (_, i) => i === 890 ? 'ERROR database connection refused' : `progress ${i}`);
  await writeFile(path.join(root, 'output.txt'), lines.join('\n'));
  const result = await new Service(workspace, new Jev()).triage('database connection refused', 'output.txt', 1, undefined, 3);
  assert.equal(result.coverage.chunks_in_range, 30);
  assert.equal(result.coverage.chunks_evaluated, 24);
  assert.equal(result.coverage.chunks_not_evaluated, 6);
  assert.ok(result.results[0].text.includes('ERROR database connection refused'));
  assert.equal(result.results[0].start_line, 871);
});

test('triage groups exact repeated chunks and reports all occurrences', async t => {
  const { root, workspace } = await fixture(t);
  await writeFile(path.join(root, 'output.txt'), Array(60).fill('repeat').join('\n'));
  const result = await new Service(workspace, new Jev()).triage('repeat', 'output.txt', 1, undefined, 3);
  assert.equal(result.coverage.unique_chunks, 1);
  assert.deepEqual(result.results[0].occurrences, [{ start_line: 1, end_line: 30 }, { start_line: 31, end_line: 60 }]);
});

test('capability selection can abstain and rejects duplicate identities', async t => {
  const { workspace } = await fixture(t);
  const service = new Service(workspace, new Jev());
  const candidate = { id: 'draw', kind: 'tool' as const, description: 'Paint a picture' };
  assert.equal((await service.select('database', [candidate], 3)).recommendation, null);
  await assert.rejects(service.select('database', [candidate, candidate], 3));
});


test('duplicate-heavy artifacts keep returned occurrence lists bounded', async t => {
  const { root, workspace } = await fixture(t);
  await writeFile(path.join(root, 'output.txt'), Array(900).fill('repeat').join('\n'));
  const result = await new Service(workspace, new Jev()).triage('repeat', 'output.txt', 1, undefined, 3);
  assert.equal(result.results[0].occurrence_count, 30);
  assert.equal(result.results[0].occurrences.length, 20);
  assert.equal(result.results[0].omitted_occurrences, 10);
});

test('search skips a minified file without dropping useful source matches', async t => {
  const { root, workspace } = await fixture(t);
  await writeFile(path.join(root, 'minified.js'), 'database'.repeat(1000));
  await writeFile(path.join(root, 'source.ts'), 'database connection');
  const result = await workspace.search('database', ['.'], []);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].path, 'source.ts');
  assert.equal(result.coverage.files_skipped, 1);
});
