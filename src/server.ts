import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { Service } from './service.js';
import { InputError } from './workspace.js';

export function createServer(service: Service): McpServer {
  const server = new McpServer({ name: 'jev-in-codex', version: '0.1.0' });
  const question = z.string().trim().min(1).max(2000);
  const relativePath = z.string().min(1).max(1024);
  const limit = z.number().int().min(1).max(10).default(5);
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true };
  const run = async (operation: () => Promise<unknown>) => {
    try { return { content: [{ type: 'text' as const, text: JSON.stringify(await operation()) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text' as const, text: error instanceof InputError ? error.message : 'Unable to read the requested workspace data. Check the path and access permissions.' }] }; }
  };
  server.registerTool('jev_select_capability', {
    description: 'Rank a supplied catalog of tools or skills for an objective. Sends descriptions to TypeSafe if configured. Does not discover or execute capabilities.',
    annotations,
    inputSchema: z.object({ objective: question, candidates: z.array(z.object({
      id: z.string().min(1).max(200), kind: z.enum(['tool', 'skill']), description: z.string().min(1).max(2000),
    })).min(1).max(24), limit }),
  }, input => run(() => service.select(input.objective, input.candidates, input.limit)));
  server.registerTool('jev_search', {
    description: 'Find a bounded lexical shortlist of workspace code/docs, then rerank with Jev. Sends shortlisted excerpts to TypeSafe if configured. Prefer rg for exact lookups. Returns source lines and coverage.',
    annotations,
    inputSchema: z.object({ question, scope: z.array(relativePath).min(1).max(10).default(['.']),
      query_terms: z.array(z.string().min(1).max(100)).max(12).default([]), limit }),
  }, input => run(() => service.search(input.question, input.scope, input.query_terms, input.limit)));
  server.registerTool('jev_triage', {
    description: 'Rank original excerpts from a saved text artifact (max 1 MiB) and group identical chunks. Sends excerpts to TypeSafe if configured. Returns coverage and source line numbers; does not execute commands or diagnose definitively.',
    annotations,
    inputSchema: z.object({ question, artifact_path: relativePath, start_line: z.number().int().min(1).default(1),
      end_line: z.number().int().min(1).optional(), limit }),
  }, input => run(() => service.triage(input.question, input.artifact_path, input.start_line, input.end_line, input.limit)));
  return server;
}
