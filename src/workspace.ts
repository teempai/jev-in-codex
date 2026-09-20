import { constants } from 'node:fs';
import { open, realpath, stat, lstat } from 'node:fs/promises';
import path from 'node:path';

export const MAX_FILE_BYTES = 1024 * 1024;
const excludedDirs = ['.git', 'node_modules', 'dist', 'build', 'vendor', '.venv', '.ssh', '.aws', '.gnupg'];
const sensitive = /^(?:\.env(?:\..*)?|\.npmrc|\.netrc|credentials(?:\..*)?|id_rsa|id_ed25519)$|\.(?:pem|key|p12|pfx)$/i;

export class InputError extends Error {}

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

  async output(relative: string): Promise<string> {
    if (!relative || path.isAbsolute(relative)) throw new InputError('Use a relative output path.');
    const requested = path.resolve(this.root, relative);
    if (!within(this.root, requested) || denied(path.relative(this.root, requested))) throw new InputError('Output is outside the workspace or excluded.');
    const parent = await this.resolve(path.dirname(relative));
    if (!(await stat(parent)).isDirectory()) throw new InputError('Output parent must be an existing directory.');
    const output = path.join(parent, path.basename(requested));
    try { await lstat(output); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return output;
      throw error;
    }
    throw new InputError('Output already exists. Choose a new file; existing files are never overwritten.');
  }
}
