# Contributing

Use Node.js 22+. Run `npm ci --ignore-scripts` and `npm run check`. Tests use synthetic records and mocked or loopback TypeSafe responses, require no API key and make no paid requests. See [docs/TESTING.md](docs/TESTING.md).

Keep the integration small: Jev supplies decisions; Codex owns reasoning, review and actions. Preserve full output coverage, original review evidence, path boundaries, overwrite protection and explicit failures. Do not add fallback labels or hide provider failures.

## Capabilities must earn their place

Follow [benchmarks/POLICY.md](benchmarks/POLICY.md) before exposing any new tool, policy or broader capability. Include the implemented PoC, frozen protocol, representative inputs and reference labels, paired plain-Codex comparison, raw measurements, actual provider-call evidence, complete-output quality grades and reproducible analysis. Report negative results and regressions. A passing synthetic development example supports only that disclosed workload.

The current interface contract test asserts exactly one advertised tool. Changes to that contract require benchmark evidence and review, not merely updating the assertion. CI recomputes the admitted release benchmark gate from checked-in measurements and complete artifacts; a green check does not substitute for scientific review or establish held-out validity.

Meaningful behavior changes require tests. Changes to the model, policy, batching, review workflow or transport that could invalidate the performance claim require rerunning the end-to-end benchmark. No new dependency or abstraction is needed merely to support another label policy.

Never commit keys, credentials, private inputs, raw account telemetry or machine-specific configuration. The historical benchmark export is sanitized and labelled; local unredacted evidence stays local. Do not publish an unreviewed run directory.

Contributions use the repository's MIT license. Retain third-party notices when reusing code.
