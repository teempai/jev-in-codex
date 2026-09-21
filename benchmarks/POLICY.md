# Benchmark gate for capabilities

A new capability includes a new tool, an additional built-in labelling preset, or a meaningful expansion of the supported decision workflow. None is exposed or advertised before it has evidence of benefit over plain Codex. A PoC can exist in an isolated experiment while it is being evaluated.

Before scored runs, define the user task, workload, outputs, reference labels, quality requirements, model/settings, sample/repetition plan, primary endpoint and acceptable tradeoffs. Freeze inputs, gold, implementation, harness and protocol. The baseline must retain its normal tools and the same task/output opportunities. Run actual Jev; record usage and all failures or non-use. Do not insert an irrelevant model call into a deterministic shortcut to claim Jev attribution.

Default development gate:

1. All intervention outputs correct under the declared complete-output checks, with no accuracy loss against plain Codex.
2. Every intervention uses successful Jev provider requests for the decisions.
3. At least **20% lower paired geometric mean total Codex input or end-to-end elapsed time**, with the other measure **no more than 10% worse**.
4. Include all scheduled outcomes. Failures, fallback, slow runs and incidental command errors stay in the primary result. Disclose post-hoc analyses; remove entire pairs symmetrically in any sensitivity analysis.

A precision- or monetary-cost-focused capability can propose another prospective endpoint before seeing results, with reviewer agreement and explicit acceptable tradeoffs. Do not change a gate retrospectively to admit a near miss. Total tokens alone are not monetary or subscription savings; include caching, provider usage and defensible pricing when claiming cost.

Publish enough synthetic/public evidence to independently recalculate the result: corpus and policy, gold, per-run metrics, complete outputs, provider observations, relevant command traces, protocol and analyzer. Keep confidential data and credentials private. Record the actual runtime and source revision/hash. A result on a prototype does not automatically certify its production port; verify the release implementation too.

Bound claims to the evidence. Technical repetitions are not independent examples. Synthetic, agent-authored labels are not independent real-world validation. Inspect ambiguity, raw Jev mistakes, Codex repairs and high-confidence missed errors. Representative held-out data and independent labels are needed for general accuracy claims. Statistical claims need appropriate units, sample size and multiplicity handling.

Current admission: **jev_label with custom question/criteria policies and the feedback_theme preset**. The [0.3 experiment](custom/README.md) passed the unchanged gate separately on four disclosed 64-record synthetic workloads. User-supplied taxonomies are inputs to this generic capability, not individually certified policies: validate quality and measure benefit on representative data before making new claims. New built-in presets, modalities, multi-label workflows and meaningful implementation changes still need prospective benchmark admission. The older capabilities remain removed unless they independently earn admission.
