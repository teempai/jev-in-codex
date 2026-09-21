# Testing

Use Node.js 22+ and run:

```sh
npm ci --ignore-scripts
npm run check
```

No TypeSafe key or paid call is needed. The unit suite verifies real provider delegation, eight-way concurrency, full-file coverage, original review evidence, explicit missing-key/provider failures, malformed/partial responses, input validation, traversal and symlink boundaries, nested outputs and overwrite refusal.

The end-to-end test starts the compiled server through real MCP stdio, advertises only jev_label, validates its writing annotation, sends sixteen real HTTP requests across preset and custom policies to a loopback TypeSafe simulator, and checks the saved labels. Custom-policy tests cover invalid criteria, unknown provider labels, reserved names, original review evidence and byte-limited splitting with longer definitions. It confirms a second write is rejected before another provider call and the retired search tool is unavailable. The test-only preload redirects the fixed TypeSafe URL to localhost; production has no endpoint override and never loads it. Allow localhost networking for this test.

`npm run test:e2e` runs the integration test alone. `node benchmarks/analyze.mjs benchmarks/results/release --require-pass` recalculates the recorded release benchmark's accuracy, provider use and efficiency gate. `node benchmarks/analyze.mjs benchmarks/results/custom --require-pass` checks all four custom-interface benchmark workloads separately. Source and benchmark hashes must match their measured release. These are distinct checks: mocks establish behavior, while live benchmark traces establish measured performance.

See [benchmark reproduction](../benchmarks/README.md) for an optional paid live run. Do not infer model accuracy, desktop skill discovery or a general speedup from passing unit tests. The historical security review covers the retired read-only implementation; it is not a security review of this new writing capability.
