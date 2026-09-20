# Jev use-case sweep — complete first screen

**First-screen result: no demonstrated positive impact in these twenty eight-record batch workflows.** The actual Jev plugin was used in every intervention session. Across the twenty cases, paired geometric means show **69.3% more Codex input tokens** and **43.1% more elapsed time**. Final accuracy was equal: 318/320 judgments under the frozen reference key in both conditions, or 318/318 after excluding one ambiguous item from both repetitions. These are repeated judgments on 160 unique authored records, not 320 independent examples per condition.

Jev made 40 successful requests, with median provider latency **0.789 seconds**. It consumed 63,942 reported provider input tokens and 12,628 output tokens. Codex repaired **10 raw Jev errors** before its final answers. No provider failure explains the loss. The main observed overhead is the extra tool/verification interaction around small batches. This result applies to this implementation and workload size; it does not establish that every larger or differently integrated Jev workflow is worse.

| Condition | Median session | Codex total input | Cached input | Uncached input | Codex output |
|---|---:|---:|---:|---:|---:|
| Plain Codex | 8.83 s | 748,436 | 571,264 | 177,172 | 7,239 |
| Codex + Jev plugin | 12.99 s | 1,268,398 | 1,076,608 | 191,790 | 10,217 |

The per-case paired ratios and aggregate token sums use different weighting, so they need not imply the same percentage. No monetary savings claim is justified. The first-screen recommendation is to keep plain Codex for these tiny batches. A larger-batch artifact workflow with selective review remains a hypothesis requiring its own benchmark.

80/80 explicit-use sessions completed. Frozen-file mismatches: 0. This is an exploratory screen of eight unique synthetic records per case, each repeated twice; it is not a significance or population-accuracy claim.

All 20 PoCs make actual Jev Choice decisions through the packaged plugin MCP. The intervention requires a plugin call, followed by optional Codex verification or recovery. Plain Codex uses the same task and files freely. Startup, provider latency and verification are included. The initial optional-use pilot is retained separately; it was stopped because early Codex sessions did not call Jev.

| Use case | Paired runs | Correct A / N | Input change | Time change | Actual Jev | Screening result |
|---|---:|---|---:|---:|---|---|
| Route engineering issues | 2/2 | 16/16 / 16/16 | +68.4% | +64.4% | yes | no efficiency win |
| Find duplicate bug reports | 2/2 | 16/16 / 16/16 | +68.3% | +83.8% | yes | no efficiency win |
| Route changes by review risk | 2/2 | 16/16 / 16/16 | +67.8% | +58.9% | yes | no efficiency win |
| Select relevant regression tests | 2/2 | 16/16 / 16/16 | +67.7% | +26.6% | yes | no efficiency win |
| Classify CI failure evidence | 2/2 | 16/16 / 16/16 | +68.4% | +36.1% | yes | no efficiency win |
| Filter customer-facing release notes | 2/2 | 16/16 / 16/16 | +67.4% | +57.6% | yes | no efficiency win |
| Detect API compatibility changes | 2/2 | 16/16 / 16/16 | +67.9% | +12.1% | yes | no efficiency win |
| Check acceptance-criterion coverage | 2/2 | 16/16 / 16/16 | +67.9% | +51.7% | yes | no efficiency win |
| Detect code–documentation mismatch | 2/2 | 16/16 / 16/16 | +68.4% | +19.8% | yes | no efficiency win |
| Classify configuration migration work | 2/2 | 16/16 / 16/16 | +67.8% | +59.9% | yes | no efficiency win |
| Identify actionable inbox messages | 2/2 | 16/16 / 16/16 | +95.3% | +46.6% | yes | no efficiency win |
| Detect actual meeting commitments | 2/2 | 14/16 / 14/16 | +68.5% | +28.1% | yes | no efficiency win |
| Route incoming documents | 2/2 | 16/16 / 16/16 | +68.5% | +104.0% | yes | no efficiency win |
| Resolve duplicate organization records | 2/2 | 16/16 / 16/16 | +68.3% | +36.5% | yes | no efficiency win |
| Categorize expenses by stated policy | 2/2 | 16/16 / 16/16 | +68.6% | +28.0% | yes | no efficiency win |
| Group customer feedback by requested improvement | 2/2 | 16/16 / 16/16 | +67.2% | +9.8% | yes | no efficiency win |
| Check whether evidence supports a claim | 2/2 | 16/16 / 16/16 | +67.8% | +35.0% | yes | no efficiency win |
| Filter memories for the current task | 2/2 | 16/16 / 16/16 | +67.3% | +46.9% | yes | no efficiency win |
| Decide whether to interrupt now | 2/2 | 16/16 / 16/16 | +67.9% | +50.6% | yes | no efficiency win |
| Detect when a task needs clarification | 2/2 | 16/16 / 16/16 | +67.9% | +39.1% | yes | no efficiency win |

Negative changes favor the plugin. Values are paired geometric means. Correctness denominators include repeated judgments on the same eight records, not independent new examples.

A promising efficiency case needs actual Jev calls, no newly wrong items, and at least 20% lower input or time with the other no more than 10% worse. Inspect per-class precision/recall and new errors before treating any ratio as useful. No case earns a production recommendation from this screen alone.

Total input includes cached tokens. Separate cached/uncached/output and provider usage are in results/rows.json. These are not invoice or subscription-quota savings.

Artifacts: USE_CASES.md, PROTOCOL.md, generator and synthetic fixtures, plugin source, freeze.json, all session traces, structured grades, class metrics and command audit. No private chat history or key is part of the exported inputs. No publication has occurred.

## Model judgments and Codex repairs

Observed raw Jev errors: 10 across 320 judgments. Codex repaired 10 of these before its final answer. These counts include technical repeats; see results/raw-jev-accuracy.json. Final correctness alone therefore does not establish standalone Jev accuracy.

Follow-up hypotheses are in FOLLOW_UP.md. They are not implemented gains or part of this frozen comparison.

## Reference-label ambiguity

One meeting-commitment item has overlapping labels; see ADJUDICATION.md. Frozen scores above are unchanged. The secondary sensitivity analysis excludes that item equally from all conditions and repetitions. It is not a replacement primary analysis.
A: 318/318 retained judgments correct (including technical repeats).
N: 318/318 retained judgments correct (including technical repeats).
