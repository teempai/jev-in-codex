# Contributing

Use Node.js 22+ and ripgrep. Clone the repository, run `npm ci`, and run
`npm run check` before opening a pull request. Tests use temporary workspaces
and simulated TypeSafe responses; they need no API key and make no external API
calls. The end-to-end test uses loopback HTTP and the compiled MCP server.
Run it separately with `npm run test:e2e`; see [the testing guide](docs/TESTING.md).

Keep the integration small. Codex owns execution and reasoning; Jev ranks
bounded alternatives. Preserve original evidence and report coverage limits.
Do not silently turn a provider error into a successful Jev result.

For behavior changes, include a representative test or reproducible example.
For quality/performance claims, compare against the local fallback using
held-out tasks and report retrieval recall, selection accuracy, latency, API
usage, and downstream task success. No such benchmark is established yet.

Open an issue before broadening v1 into orchestration, custom compaction, or
persistent memory. Never include credentials or private source/logs in issues,
tests, or pull requests. Contributions are provided under this project's MIT
license; retain third-party notices when reusing code.
