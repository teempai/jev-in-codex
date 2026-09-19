#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { Jev } from './jev.js';
import { Workspace } from './workspace.js';
import { Service } from './service.js';
import { createServer } from './server.js';

try {
  const { values } = parseArgs({ options: { root: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) {
    console.log('Usage: jev-in-codex --root /absolute/workspace\nOr set JEV_WORKSPACE_ROOT. Requires Node 22+ and ripgrep.\nTYPESAFE_API_KEY enables Jev; without it tools use explicit local fallback.\nJEV_MODEL optionally overrides jev-latest.');
  } else {
    const root = values.root ?? process.env.JEV_WORKSPACE_ROOT;
    if (!root) throw new Error('Supply --root or JEV_WORKSPACE_ROOT explicitly.');
    const workspace = await Workspace.create(root);
    const service = new Service(workspace, new Jev({ apiKey: process.env.TYPESAFE_API_KEY, model: process.env.JEV_MODEL }));
    await serveStdio(() => createServer(service));
  }
} catch {
  console.error('jev-in-codex: startup failed. Supply a readable workspace with --root or JEV_WORKSPACE_ROOT. Use --help for usage.');
  process.exitCode = 1;
}
