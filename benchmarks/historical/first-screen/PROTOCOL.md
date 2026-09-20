# Broad Jev plugin sweep — exploratory protocol

Recorded before any outcome from these 20 PoCs. This supersedes the earlier three-tool goal. The user requests a broad search for specific, measurable improvements in tokens, speed or precision, using actual Jev model decisions.

## Scope and hypotheses

USE_CASES.md defines 20 distinct workflow decisions: ten coding and ten general-use cases. The first screen contains eight unique, manually authored synthetic records per case (160 total). This deliberately small batch tests whether plugin overhead erases fast-model benefits. Cases are not a representative sample of all work. The ground truth follows explicit per-case policies, includes unknown/review options where needed, and stays outside plugin and agent fixture roots. No private documents, account details or live actions are used.

Each PoC is a policy in the same working Codex MCP plugin. All labels come from live Jev Choice answers. Local code handles safe file reading, batching, response validation and transport only; it never computes or supplies ground-truth labels. Shared plumbing is intentional, not 20 separate installations. The experimental plugin is loaded in isolated benchmark sessions rather than added to normal global instructions.

## Conditions

A: plain Codex with ordinary tools and the complete input files.
N: identical Codex with the experimental plugin's MCP tool and a brief optional-use instruction. The actual .mcp.json command and arguments are loaded by the harness. It is the packaged plugin tool under controlled CLI sessions; this does not establish exact desktop UI discovery equivalence.

Both receive the same task prompt, policy file, records, output schema, model gpt-6-astra, medium reasoning, priority service and 180-second timeout. Use clean ephemeral sessions, no global memory, unrelated plugins, web or other agents. Both can use ordinary file reads and parsing commands, and must not read outside the fixture root or access the network directly. Both get concise generic efficiency guidance. This is a fair baseline, not an intentionally verbose one. N is free to ignore the plugin or recover from its errors; these outcomes remain included.

Two repetitions per condition per case, 80 sessions in total. Alternate condition order by case and repetition. Sessions run sequentially. Hash-freeze plugin source, cases, task prompts, input fixtures, schema, runner and grader before the first scored session. No task-specific prompt changes or discarded poor outcomes after the freeze. Retain infrastructure failures and investigate before replacement; do not retry slow, incorrect, fallback or non-use outcomes selectively.

## Measures and interpretation

Primary screen: all-record accuracy and exact whole-task correctness; report per-label precision/recall, including uncertain labels. Record total, cached, uncached and output Codex tokens; whole-session monotonic wall time includes tool startup and provider latency. Record actual Jev calls, provider latency, model and usage. Account subscription cost is not inferable from token counts. Provider input/output totals are separate; any reported provider cost must be explicitly returned or a clearly labelled estimate using a cited rate.

A promising efficiency candidate has no loss in observed correctness, actual successful Jev use, and at least 20% lower paired geometric mean Codex input or whole-session time, with the other measure no more than 10% worse. A promising precision candidate corrects baseline errors without adding errors; label its efficiency tradeoff. These are screening rules, not proof of statistical significance. Two technical repeats of one authored eight-item batch do not provide independent population evidence. Do not run significance tests on them or pool the 20 unrelated policies into a claim that every use case benefits.

Report every case, including losses and null results. The initial broad sweep is exploratory. Promising cases need a separate larger, diverse held-out benchmark before production recommendations. During that follow-up include the same integration using a simple local decision baseline where meaningful, to attribute value to Jev rather than transport or prompting. No local-parser gains count as model benefits. Cases that require extended reasoning may be poor fits; finding that is a valid result.

## Source and implementation basis

TypeSafe describes atomic typed judgments and independent questions: https://docs.typesafe.ai/introduction
Choice request/response contract: https://docs.typesafe.ai/primitives/choice
The documentation motivates the design; vendor speed, cost and calibration claims are not assumed true for this plugin workflow.

No GitHub publication, production automation, or restoration of global Jev instructions is part of this screen.

## Amendment: explicit plugin use

The initial optional-use screen was stopped after the first completed runs showed no tool invocation. It is retained under runs/screen, with its original runner, protocol and hashes under design-history/optional-use. Any interrupted session is unscored and recorded as an operator interruption. This was an exploratory design correction, not a successful outcome. No result from that screen enters the main comparison.

The main explicit-use phase runs all 20 cases with two repetitions per arm (80 fresh sessions). N is instructed to call the plugin first, then may verify or recover using ordinary tools. A solves the same task freely. This compares the requested plugin workflow with plain Codex; it does not measure automatic plugin adoption. All other rules, records, metrics and screening thresholds stay unchanged. The previous optional traces remain visible even if they favor plain Codex.
