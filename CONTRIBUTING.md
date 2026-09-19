# Contributing

Use Node.js 22+ and ripgrep. Clone the repository, run `npm ci --ignore-scripts`, and run
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

## Reproduce the animated demo

Run the interactive-free local demonstration from the repository:

```bash
npm run demo
```

It launches the compiled MCP server, creates a temporary example project, makes
all three tool calls, and prints their actual results. The TypeSafe HTTP responses
and all workspace contents are synthetic. It needs no API key, makes no external
API calls, and cleans up the temporary project. Assertions stop the recording if
expected results change.

To regenerate the README media:

```bash
npm run demo -- --record docs/assets/jev-demo.json
python3 scripts/render-demo.py
```

The optional renderer needs Python 3, Pillow, Fontconfig (`fc-match`), and locally
installed sans-serif/monospace fonts. These are media-authoring tools, not runtime
dependencies of the plugin. The renderer creates the GIF and a static PNG from
the recorded JSON; keep all three files together when updating the demo. Font
appearance may vary by machine. The checked-in animation is a paced replay,
not a screen recording of the Codex app or a live-provider benchmark.
