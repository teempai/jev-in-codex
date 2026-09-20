# Jev use-case sweep: 20 hypotheses

All are candidates, not established wins. Each has a working policy and eight synthetic records in the first screen. Eight authored records do not establish population accuracy. Shared infrastructure is intentional: each PoC supplies its own decision question and mutually exclusive labels to a batched Jev Choice call. No local heuristic assigns the labels.

| Area | PoC | Decision and user benefit |
|---|---|---|
| coding | Route engineering issues (`issue_route`) | Replace serial issue reading with one batch of owner decisions. |
| coding | Find duplicate bug reports (`duplicate_issue`) | Shortlist duplicate pairs before Codex reads the whole backlog. |
| coding | Route changes by review risk (`change_review`) | Avoid sending every small change through a long review-routing discussion. |
| coding | Select relevant regression tests (`test_selection`) | Reduce large test-catalog reads while preserving impacted-test recall. |
| coding | Classify CI failure evidence (`ci_failure`) | Route failed runs without having Codex narrate every log. |
| coding | Filter customer-facing release notes (`release_notes`) | Produce a reliable changelog candidate set with less context. |
| coding | Detect API compatibility changes (`api_compatibility`) | Find contract changes in release diffs before detailed review. |
| coding | Check acceptance-criterion coverage (`requirement_coverage`) | Turn repetitive evidence matching into a batch decision. |
| coding | Detect code–documentation mismatch (`doc_consistency`) | Identify mismatches without reading every document and code pair in Codex. |
| coding | Classify configuration migration work (`config_migration`) | Triage many configurations while leaving actual edits to Codex. |
| general | Identify actionable inbox messages (`inbox_action`) | Process a mailbox batch without dumping every message into Codex. |
| general | Detect actual meeting commitments (`meeting_commitment`) | Extract a reliable task queue from many meeting excerpts. |
| general | Route incoming documents (`document_route`) | Sort a document inbox before specialist reading. |
| general | Resolve duplicate organization records (`entity_match`) | Reduce manual comparison of noisy entity pairs. |
| general | Categorize expenses by stated policy (`expense_category`) | Classify transaction batches and surface uncertain records. |
| general | Group customer feedback by requested improvement (`feedback_theme`) | Turn large feedback batches into a useful topic distribution. |
| general | Check whether evidence supports a claim (`claim_support`) | Catch unsupported statements before Codex writes a summary. |
| general | Filter memories for the current task (`memory_relevance`) | Keep irrelevant saved context out of Codex turns. |
| general | Decide whether to interrupt now (`notification_gate`) | Reduce unnecessary interruptions while preserving urgent recall. |
| general | Detect when a task needs clarification (`clarification_gate`) | Avoid needless questions while catching consequential ambiguity. |

Measure exact decision accuracy, class-specific precision/recall, whole-task correctness, elapsed completion time, Codex input/cache/output usage and provider usage. Misclassification that changes an action is a quality cost; a token or latency win does not erase it. The initial cases are short to expose integration overhead. Promising cases will need larger diverse batches and held-out examples before recommendation.
