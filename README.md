# Jev in Codex

A Codex plugin for **batch labelling with Jev**. It turns a JSONL file of customer feedback into a complete labelled file, while Codex reviews uncertain decisions.

**One tool: `jev_label`. One admitted policy: `feedback_theme`.** The previous capability-selection, context-search and output-triage tools have been removed because their tested workflows did not show a useful improvement. There is no lexical or local-classifier fallback.

## Why this capability is included

The release benchmark on 64 synthetic feedback messages measured **42.7% less total Codex input and 26.4% less elapsed time**, with all labels correct across four paired runs. Tiny batches performed worse in the earlier sweep.

The [benchmark report](benchmarks/README.md) includes the shipped implementation check, prototype results, methods, complete artifacts and negative results. This is exploratory verification on known synthetic development data, not independent confirmation. It does not prove real-world accuracy, general labelling superiority, invoice savings or automatic desktop adoption.

**From this release onward, new capabilities and policies require a passing, reviewable benchmark against plain Codex before being exposed.** See [the admission policy](benchmarks/POLICY.md).

## Use

Prepare an approved UTF-8 JSONL file inside the configured workspace:

```jsonl
{"id":"feedback-1","text":"Saved reports disappear after reopening. Please preserve them."}
{"id":"feedback-2","text":"Please offer a cheaper plan for occasional users."}
```

Call:

```json
{"path":"feedback/items.jsonl","policy":"feedback_theme"}
```

The tool creates `feedback/decisions.jsonl`, containing every original ID and one label:

```jsonl
{"id":"feedback-1","label":"reliability"}
{"id":"feedback-2","label":"pricing"}
```

These examples explain the format; a two-record batch is not the benchmarked use case. Labels are `reliability`, `usability`, `pricing` and `feature`. The response includes the policy, counts, model, request count, output path, and original text for decisions below confidence 0.8. Codex can correct that file after review. Above-threshold confidence does not guarantee correctness.

Use `output_path` to choose another new relative file. Existing files are never overwritten. Both input and output stay inside the configured workspace; the output parent must exist. Input accepts 1–256 records, unique IDs of up to 100 letters/digits/underscore/hyphen, nonempty text up to 6,000 characters per record, and no extra fields. Files are limited to 1 MiB. These are operational limits, not validated performance ranges.

## Install

Ask Codex:

> Install https://github.com/teempai/jev-in-codex using docs/INSTALL.md, configure my workspace and TypeSafe key privately, and verify that only jev_label is available. Preserve existing instructions. Do not add global instructions.

See [installation and migration](docs/INSTALL.md). Node.js 22+ is required; ripgrep is no longer required. Build with `npm ci --ignore-scripts && npm run check`. Set `TYPESAFE_API_KEY` privately and pass `--root` or `JEV_WORKSPACE_ROOT`. The model is pinned to the benchmarked `jev-1.13.0`; the old `JEV_MODEL` override is no longer used.

For direct MCP configuration, resolve the Node and built-server paths on your machine:

```toml
[mcp_servers.jev]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/jev-in-codex/dist/index.js", "--root", "/absolute/workspace"]
env_vars = ["TYPESAFE_API_KEY"]
tool_timeout_sec = 90
```

Prefer the plugin installation for its bundled skill. Do not register both copies. The tool writes a file, so normal host approval may apply. Installation does not change global approval policy or persistent global instructions.

## Data and failure handling

Every input record and the fixed policy are sent over HTTPS to `https://api.typesafe.ai/v1/systemone`. Jev makes the decisions; local code only validates, batches, serializes and selects uncertain records for review. Up to eight requests run concurrently, with at most eight questions per request and a 28,000-byte body budget. Requests have an eight-second timeout and a twenty-second total inference deadline.

Missing credentials, malformed responses or a failed batch produce an explicit error and no labelled output. No local labels replace Jev results. Existing outputs, traversal, escaping symlinks, common credential paths, invalid UTF-8, binary and oversized input are rejected. Provider error bodies are not exposed. The production server has no content logs, telemetry or persistent cache.

Filename exclusions are best-effort, not secret detection. Use only data authorized for TypeSafe. This local path boundary is not a sandbox against concurrent malicious filesystem changes. Labels are advisory and never authorize external actions. See the [testing guide](docs/TESTING.md); the [older security review](docs/security-review-2026-09-19/report.md) covers the retired implementation, not this new writing capability.

## Development

[Contributing](CONTRIBUTING.md) · [Benchmark report and reproduction](benchmarks/README.md) · [Capability admission policy](benchmarks/POLICY.md)

[MIT](LICENSE). Inspired by the TypeSafe Jev approach to bounded decisions and [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction); this repository does not include that project's compactor code.
