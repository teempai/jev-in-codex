# Custom labelling benchmark (0.3)

## Question and comparison

Does supplying a substantial text batch to Jev through the custom-policy MCP interface improve Codex's end-to-end completion of a full labelling task? Plain Codex and Codex + Jev receive the same records, authoritative decision definitions, ordinary shell tools and output requirements. The intervention explicitly calls the plugin; it is not a test of automatic desktop selection. Both can implement efficient file-writing code. No rule-based baseline is artificially forbidden.

The shipped interface is evaluated on three new taxonomies plus a regression check of the original feedback preset. Custom policies are passed as question/criteria objects through actual MCP and TypeSafe requests. Jev writes every label; Codex can review and correct the file. There is no local classifier fallback or unused token Jev call.

## Result

**Passed all four workload gates**, with no excluded runs or retries. All 32 scheduled sessions completed; every complete output was correct: 1,024/1,024 repeated decisions in each arm. The 16 intervention sessions made 128 successful TypeSafe requests. Raw Jev labels were also all correct, with no below-threshold review items, no Codex repairs and no failed shell commands.

| Workload, 64 records | Codex input reduction | Elapsed-time reduction | A / N median seconds | Gate |
|---|---:|---:|---:|---|
| Action needed (2 labels) | 31.9% | 13.9% | 12.70 / 10.71 | Pass |
| Sentiment (3 labels) | 25.7% | 8.4% | 13.26 / 12.22 | Pass |
| Document routing (5 labels) | 26.9% | 8.5% | 12.57 / 11.53 | Pass |
| Feedback preset (4 labels) | 21.5% | 23.5% | 13.54 / 10.65 | Pass |

Every task cleared the unchanged requirement of at least 20% less total Codex input or elapsed time, with the other measure no more than 10% worse. The generic interface is admitted on this bounded development evidence; it does not certify every taxonomy a caller might supply.

## Usage and run variation

| Four-run totals per arm | Action A / N | Sentiment A / N | Documents A / N | Feedback A / N |
|---|---:|---:|---:|---:|
| Codex total input | 171,027 / 118,166 | 174,284 / 129,460 | 177,279 / 129,624 | 163,982 / 128,703 |
| Codex cached input | 133,632 / 107,136 | 135,168 / 117,760 | 127,360 / 109,184 | 115,072 / 117,760 |
| Codex uncached input | 37,395 / 11,030 | 39,116 / 11,700 | 49,919 / 20,440 | 48,910 / 10,943 |
| Codex output | 1,159 / 759 | 1,307 / 856 | 1,303 / 866 | 1,150 / 530 |
| TypeSafe input | 0 / 71,604 | 0 / 79,912 | 0 / 88,584 | 0 / 68,600 |
| TypeSafe output | 0 / 7,904 | 0 / 9,312 | 0 / 12,896 | 0 / 12,704 |

The provider added 308,700 input and 42,816 output tokens overall. These must not be silently omitted from cost discussions. Both arms were perfectly accurate on these reference labels, so no precision advantage was demonstrated.

Input reductions were consistent across the four pairs of sentiment, routing and feedback. One action-needed intervention reported an input ratio of 0.501 instead of approximately 0.754 in its other three pairs, despite the same visible message/tool sequence. The cause of that usage difference is not established; all pairs remain in the result. Each of the other three pairs still individually exceeds the 20% input-reduction threshold. Usage is provider-reported, not independently metered. Timing was less consistent: the sentiment intervention was 16.0% slower in one pair and 33.8% faster in another. The per-workload geometric mean passes the gate; individual runs are not guaranteed faster.

The custom-task baselines read the corpus and generated simple phrase-matching scripts that correctly exploited the templates. The feedback baseline wrote an explicit label sequence after reading its records. Both approaches are retained as legitimate efficient Codex behavior. No trace inspected source code, other runs or the reference labels. The benefit here is avoiding bulk context ingestion while producing the full artifact, not outperforming a difficult independent semantic test.

No live run exercised uncertain-record review. That path has mocked functional coverage only. Confidence 0.8 is uncalibrated; zero review items does not establish that it is a reliable error detector. The old 0.2 numbers are a separate earlier experiment, not a controlled ablation of this interface change.

## Evidence and reproduction

- [Prospective protocol](PROTOCOL.md), [tasks and reference labels](tasks.json), [fixtures](fixtures), [fixture generator](generate-fixtures.py).
- [Full per-run evidence](../results/custom), [computed summary](../results/custom/summary.json), [runtime](../results/custom/runtime.json), [source and harness freeze](../results/custom/freeze.json), [sanitized export hashes](../results/custom/export.json).
- Shared [runner](../run.mjs), [offline analyzer](../analyze.mjs) and [admission policy](../POLICY.md). The original [0.2 report](../README.md) and negative historical results remain available.

Recalculate from the repository root without credentials or paid calls:

```sh
node benchmarks/analyze.mjs benchmarks/results/custom --require-pass
npm run check
```

For a new paid comparison, build the server, provide an authenticated Codex home in `BENCH_CODEX_HOME`, configure `TYPESAFE_API_KEY` privately, and optionally set `CODEX_BIN` to the installed CLI. Use Node 22+ and a working Python 3 available to Codex's ordinary tools. Run:

```sh
node benchmarks/run.mjs /path/to/new-output-directory --custom
node benchmarks/analyze.mjs /path/to/new-output-directory --require-pass
```

The runner refuses an existing output directory. It freezes inputs/source before starting and retains failures; do not retry selected outcomes or publish its private configuration/stderr. It uses isolated workspace-write sessions with approval for this writing tool only. That is not a recommendation to change global approvals.

## Scientific review and limits

The primary unit for efficiency is a paired run. Four technical repetitions per workload measure execution variation; they do not create new independent examples. Each workload contains 64 records, for 256 unique records overall and 1,024 repeated decisions per arm. The three new corpora contain 16 contexts with four templated variants each. Reference labels and templates were authored by the implementing agent before the run, without independent adjudication. The original feedback dataset is already-known development data.

The new corpora intentionally make the correct interpretation explicit: outstanding versus withdrawn requests, current versus earlier sentiment, and main document purpose versus incidental references. They test policy transport and bulk delegation across label counts, but are easier and more repetitive than messy real material. They do not establish robustness to subtle ambiguity, prompt injection, domain shift, non-English text, class imbalance in production, or independently judged real-world accuracy. Accepted limits of 1–256 records and 2–16 labels are not empirically verified performance ranges.

All scheduled outcomes remain in the primary calculation; no task or pair can be dropped to pass the gate. Each workload must pass separately. Percentage changes are paired geometric means, not ratios of sums or medians. No significance or confidence-interval claim is made from four repetitions. Alternating arm order and reversing task order reduce simple order confounding, but network load, model nondeterminism and cross-session cache state remain uncontrolled. Cached and uncached tokens are reported separately.

This estimates the effect of the complete Jev-assisted workflow, including its MCP schema and review instructions. An ablation using another classifier in the same artifact-writing interface would be needed to establish a unique advantage of Jev itself. Lower Codex input is a context-efficiency result; added TypeSafe inference, different tokenizers, caching and pricing prevent an invoice or subscription-savings claim. Source-hash verification and mock tests establish implementation integrity, not scientific independence.

A user-defined taxonomy is a use of the generic interface, not a newly certified policy. Validate its labels on representative examples and measure the workload before making accuracy or efficiency claims. Separate calls for multiple dimensions, more than five labels, nontext modalities, extraction and external actions were not tested.
