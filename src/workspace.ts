import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { lexicalScore } from './jev.js';

const exec = promisify(execFile);
export const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILES = 500;
const MAX_SCAN_BYTES = 20 * 1024 * 1024;
const excludedDirs = ['.git', 'node_modules', 'dist', 'build', 'vendor', '.venv', '.ssh', '.aws', '.gnupg'];
const sensitive = /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|credentials(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i;

export class InputError extends Error {}
export type Excerpt = { id: string; path: string; start_line: number; end_line: number; text: string };

function denied(relative: string): boolean {
  return relative.split(path.sep).some(part => excludedDirs.includes(part) || sensitive.test(part));
}
function within(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export class Workspace {
  private constructor(readonly root: string) {}

  static async create(root: string): Promise<Workspace> {
    const resolved = await realpath(root);
    if (!(await stat(resolved)).isDirectory()) throw new InputError('Workspace root must be a directory.');
    return new Workspace(resolved);
  }

  async resolve(relative: string): Promise<string> {
    if (path.isAbsolute(relative)) throw new InputError('Use paths relative to the configured workspace.');
    const requested = path.resolve(this.root, relative);
    if (!within(this.root, requested) || denied(path.relative(this.root, requested))) throw new InputError('Path is outside the workspace or excluded.');
    const canonical = await realpath(requested);
    if (!within(this.root, canonical) || denied(path.relative(this.root, canonical))) throw new InputError('Symlink target is outside the workspace or excluded.');
    return canonical;
  }

  async read(relative: string): Promise<string> {
    const canonical = await this.resolve(relative);
    const handle = await open(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > MAX_FILE_BYTES) throw new InputError('Expected a regular text file no larger than 1 MiB.');
      const buffer = Buffer.alloc(MAX_FILE_BYTES + 1);
      let total = 0;
      while (total < buffer.length) {
        const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
        if (bytesRead === 0) break;
        total += bytesRead;
      }
      if (total > MAX_FILE_BYTES || buffer.subarray(0, total).includes(0)) throw new InputError('File is too large or contains binary data.');
      try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, total)); }
      catch { throw new InputError('Expected valid UTF-8 text.'); }
    } finally { await handle.close(); }
  }

  async search(question: string, scope: string[], queryTerms: string[]) {
    for (const entry of scope) await this.resolve(entry);
    const normalized = scope.map(entry => path.relative(this.root, path.resolve(this.root, entry)).split(path.sep).join('/'));
    let stdout: string;
    try {
      ({ stdout } = await exec('rg', ['--files', '--hidden', '-0', ...excludedDirs.flatMap(dir => ['--glob', `!${dir}/**`]), '--', '.'], {
        cwd: this.root, encoding: 'utf8', timeout: 10000, maxBuffer: 4 * 1024 * 1024,
      }));
    } catch (error) {
      if ((error as { code?: number }).code === 1) stdout = '';
      else throw new InputError('File discovery failed. Install ripgrep (rg), or narrow the workspace root.');
    }
    const files = stdout.split('\0').filter(Boolean).map(file => file.replace(/^\.\//, '')).sort()
      .filter(file => normalized.some(prefix => !prefix || file === prefix || file.startsWith(`${prefix}/`)))
      .filter(file => !denied(file));
    let scanned = 0, skipped = 0, bytes = 0, matched = 0;
    const candidates: (Excerpt & { localScore: number })[] = [];
    const query = queryTerms.length ? queryTerms.join(' ') : question;
    for (const file of files.slice(0, MAX_FILES)) {
      if (bytes >= MAX_SCAN_BYTES) break;
      let text: string;
      let chunks: Excerpt[];
      try { text = await this.read(file); chunks = excerpts(file, text); } catch { skipped++; continue; }
      scanned++; bytes += Buffer.byteLength(text);
      for (const excerpt of chunks) {
        const localScore = lexicalScore(query, `${file}\n${excerpt.text}`);
        if (localScore <= 0) continue;
        matched++;
        candidates.push({ ...excerpt, localScore });
        candidates.sort((a, b) => b.localScore - a.localScore);
        if (candidates.length > 24) candidates.pop();
      }
    }
    return {
      candidates: candidates.map(({ localScore: _, ...item }) => item),
      coverage: { files_discovered: files.length, files_scanned: scanned, files_skipped: skipped,
        files_unscanned: files.length - scanned - skipped, bytes_scanned: bytes,
        matching_excerpts: matched, excerpts_shortlisted: candidates.length,
        retrieval: 'lexical', respects_gitignore: true },
    };
  }
}

/** Preserve entire original lines; refuse unusually long lines instead of silently clipping them. */
export function excerpts(file: string, text: string, startLine = 1, endLine?: number): Excerpt[] {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();
  const end = Math.min(endLine ?? lines.length, lines.length);
  if (endLine !== undefined && endLine < startLine) throw new InputError('end_line must be at least start_line.');
  if (startLine > lines.length && lines.length > 0) throw new InputError('start_line is past the end of the file.');
  const result: Excerpt[] = [];
  let start = startLine - 1;
  while (start < end) {
    let stop = start, size = 0;
    while (stop < end && stop - start < 30) {
      const next = Buffer.byteLength(lines[stop]) + 1;
      if (next > 4000) throw new InputError('A line exceeds 4,000 bytes. Reformat the artifact or narrow the line range.');
      if (size + next > 4000) break;
      size += next; stop++;
    }
    result.push({ id: `${file}:${start + 1}-${stop}`, path: file, start_line: start + 1, end_line: stop, text: lines.slice(start, stop).join('\n') });
    start = stop;
  }
  return result;
}
