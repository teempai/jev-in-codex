import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { Workspace, InputError } from './workspace.js';
import { policySchema } from './policy.js';
import { labelFile, type JevOptions } from './labelling.js';

export function createServer(workspace: Workspace, options: JevOptions = {}): McpServer {
  const server = new McpServer({ name: 'jev-in-codex', version: '0.3.0' }, {
    instructions: 'jev_label labels a JSONL text batch with Jev and writes the complete output file. It returns the policy, counts and original evidence for uncertain decisions. Review those records and edit the artifact if needed. Other reads remain available; do not automatically reread the entire batch merely to transcribe labels.',
  });
  server.registerTool('jev_label', {
    description: 'Label id/text JSONL text records using Jev and create a complete id/label JSONL artifact. Sends records to TypeSafe. Use feedback_theme or a custom question and 2–16 label definitions. One label per record. Never overwrites files. Returns evidence below confidence 0.8 for review. Benchmark gains apply to the documented workloads; validate accuracy on new taxonomies.',
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    inputSchema: z.object({ path: z.string().min(1).max(1024), policy: policySchema.default('feedback_theme').describe('Preset name or {question, criteria: {label: definition}}. Define exclusive labels and an unknown/other label when needed.'),
      output_path: z.string().min(1).max(1024).optional().describe('New relative output file; defaults to decisions.jsonl beside the input. Parent must exist.') }),
  }, async input => {
    try { return { content: [{ type: 'text' as const, text: JSON.stringify(await labelFile(workspace, input.path, input.output_path, options, input.policy)) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text' as const, text: error instanceof InputError ? error.message : 'Could not create the labelled file. Check paths, permissions and whether the output exists.' }] }; }
  });
  return server;
}
