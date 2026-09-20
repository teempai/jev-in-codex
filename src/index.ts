#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { Workspace } from './workspace.js';
import { createServer } from './server.js';
try {
  const { values } = parseArgs({ options: { root: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) console.log('Usage: jev-in-codex --root /absolute/workspace\nOr set JEV_WORKSPACE_ROOT. Requires Node 22+ and TYPESAFE_API_KEY.\nOne tool: jev_label. Policy: feedback_theme. Model: jev-1.13.0. No local fallback.');
  else {
    const root = values.root ?? process.env.JEV_WORKSPACE_ROOT;
    if (!root) throw new Error('Missing root');
    const workspace = await Workspace.create(root);
    await serveStdio(() => createServer(workspace, { apiKey: process.env.TYPESAFE_API_KEY }));
  }
} catch {
  console.error('jev-in-codex: startup failed. Supply a readable workspace with --root or JEV_WORKSPACE_ROOT. Use --help for usage.');
  process.exitCode = 1;
}
