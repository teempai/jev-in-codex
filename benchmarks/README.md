# Labelling benchmark

## Release result (0.2.0)

The compiled `jev_label` implementation passed the predeclared development gate on a 64-message synthetic feedback batch: **42.7% less total Codex input and 26.4% less end-to-end elapsed time** than plain Codex, as paired geometric means over four repetitions. Both conditions produced **256/256 correct repeated judgments**. There were **32 successful Jev requests**, no raw Jev labeling errors and no failed shell commands. All four plugin calls completed successfully and returned `method: jev`.

This is a port-verification run on **known development data**, not independent confirmation. It verifies the shipped implementation rather than inheriting the prototype's measured numbers. No precision improvement, monetary savings or general real-world accuracy is claimed.

| Measure, four runs | Plain Codex | Codex + Jev |
|---|---:|---:|
| Median elapsed time | 14.33 s | 11.55 s |
| Total Codex input | 163,995 | 95,516 |
| Cached input | 122,752 | 85,760 |
| Uncached input | 41,243 | 9,756 |
| Codex output | 1,143 | 463 |
| TypeSafe reported input | 0 | 68,600 |
| TypeSafe reported output | 0 | 12,704 |
| TypeSafe requests | 0 | 32 |

Percentage claims use the geometric mean of within-pair ratios, so ratios of these sums or medians need not match. Jev adds a separate inference bill. Tokenizers, caching and prices differ: fewer Codex tokens do not establish lower total monetary cost or subscription usage.

## Method and evidence

- [Frozen protocol](PROTOCOL.md), [runtime versions](results/release/runtime.json), [implementation hashes](results/release/freeze.json).
- [Inputs](fixtures/items.jsonl), [policy](fixtures/policy.json), [reference labels and task](tasks.json).
- [Full computed summary](results/release/summary.json), eight per-session folders under [release results](results/release), [runner](run.mjs), [analyzer](analyze.mjs).
- [Admission gate](POLICY.md) and [historical development evidence](historical/README.md).

Both conditions use `gpt-6-astra`, medium reasoning, priority service, the same task, input and full-output requirements, with normal shell tools available. The baseline writes the same file efficiently. Each run uses a fresh task directory and ephemeral Codex session with user configuration, memory, unrelated plugins and web access disabled. The intervention explicitly invokes the packaged MCP server; this is not a test of automatic desktop skill discovery.

Jev supplies every label through Choice requests, up to eight records per request and eight concurrent requests. It writes the full artifact directly and returns original evidence below confidence 0.8. Codex can inspect and correct the result. The complete saved file is graded for exact IDs, labels, fields and coverage; the compact final summary alone cannot pass.

The benchmark-only preload captures provider status, latency, usage and raw answers without credential headers. It is not loaded in production. Exported events omit thread-start identifiers and redact host paths; numeric results and labels are unchanged. Stderr, account telemetry, credentials and private launch configuration are not published. The original local archive remains intact. The freeze records the full build directory at measurement time; source-hash CI checks use the actual admitted source files, not unrelated stale build products from earlier local builds.

## What the earlier experiments showed

| Development phase | Sessions | Codex input change | Time change | Outcome |
|---|---:|---:|---:|---|
| 20 policies, eight records each | 80 | +69.3% | +43.1% | No efficiency candidate; equal final accuracy |
| Artifact writer with wrong MCP permission | 8 | Not a model comparison | Not a model comparison | No Jev calls; retained failure |
| Corrected 32-record API compatibility | 4 | +33.8% | +31.9% | Failed gate |
| Corrected 32-record feedback | 4 | +2.2% | −11.7% | Failed gate |
| Longer 64-record feedback, four concurrent requests | 4 | −21.8% | +10.6% | Failed unchanged gate |
| Same 64 records, eight concurrent requests | 8 | −28.0% | −21.4% | Passed development gate |

The positive prototype round had a baseline `python`/`python3` command retry. Keeping all runs is primary. Excluding the entire affected A/N pair still yielded 21.8% less input and 15.5% less time. The release verification above had no such retry. Do not attribute the numerical difference between these sequential rounds to one code change: model behavior, cache state and service load also vary.

The [twenty-use-case list](historical/USE_CASES.md), all 108 historical phase sessions and ten optional-use pilot sessions are retained in the historical export. The optional-use pilot did not reliably invoke Jev and is not pooled into the explicit-use benchmark. Historical policies are experimental data; they are not exposed capabilities.

## Limits on the claim

The 64 messages cover 16 product areas with 16 examples in each class. They are distinct synthetic messages, authored and labelled by the same agent, often with explicit statements of the primary request. They are cleaner than real support queues. Four repeated runs are still only **64 unique examples**, not 256 independent examples.

Neither the final prototype nor this release run produced uncertain review items. The positive result therefore supports direct batch delegation on clean inputs; it does not validate the review threshold on hard or ambiguous records. Confidence 0.8 is uncalibrated, and high-confidence errors can escape review. Independently labelled representative data is needed before broader accuracy claims or consequential automation.

The larger case and concurrency setting were selected adaptively after negative experiments. No statistical significance is asserted. Batch size and message length changed together, so there is no proven universal record-count threshold. The comparison establishes a benefit for the combined Jev workflow; a substitute classifier in the same interface would be needed to claim Jev uniquely provides the advantage.

The first screen contained one ambiguous meeting-commitment label, disclosed in [the adjudication](historical/ADJUDICATION.md). Frozen primary final accuracy was 318/320 in each condition; a symmetric exclusion gave 318/318. Ten raw Jev errors were repaired by Codex. None of those results justify shipping the removed selection/search/triage workflows or the other unproven policies.

## Recalculate without paid calls

From the repository root:

```sh
node benchmarks/analyze.mjs benchmarks/results/release --require-pass
npm run check
```

CI runs both. Tests verify that the advertised tool contract is exactly `jev_label`, the measured source and policy match, actual recorded MCP calls succeeded, and corrupting a saved output fails the grader. These are integrity checks, not independent scientific validation.

## Run a new paid comparison

Use Node 22+, Python 3 for Codex's normal file-writing tools, a compatible Codex CLI with access to the named model, and an authenticated Codex home. Configure `TYPESAFE_API_KEY` privately in the runner's environment. The script neither initiates login nor creates credentials.

```sh
npm ci --ignore-scripts
npm run build
export CODEX_BIN=/absolute/path/to/codex
export BENCH_CODEX_HOME=/absolute/path/to/an/authenticated/codex-home
# Supply TYPESAFE_API_KEY through your existing private environment or helper.
node benchmarks/run.mjs /absolute/path/to/new-results
node benchmarks/analyze.mjs /absolute/path/to/new-results --require-pass
```

For matching isolation, use a separately prepared authenticated home. Do not commit its contents. The runner freezes its files before starting, requires a fresh output directory, alternates four A/N pairs, and retains failures. It grants approval only to the writing MCP tool inside this isolated benchmark; it does not modify global settings. Do not copy that permission configuration into an everyday installation without deliberate review.

The live run incurs both Codex and TypeSafe usage. New results need their own disclosure and review; a local re-run is not expected to reproduce exact timings. Inspect and sanitize any new traces before publication.
