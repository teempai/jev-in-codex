---
name: jev-label
description: Label a substantial JSONL batch of customer feedback with Jev and produce a complete labelled file. Use the feedback_theme policy when the user wants reliability, usability, pricing or feature labels. Evidence supports the documented 64-message synthetic workload; prefer ordinary tools for small batches. Do not use for tool selection, search, log triage or arbitrary classification.
---

# Batch labelling

Use `jev_label` with `path` relative to the configured workspace. Its only admitted policy is `feedback_theme`:

- `reliability`: failures, data loss or unavailable behavior.
- `usability`: navigation, comprehension or interaction effort.
- `pricing`: price, plan limits or billing policy.
- `feature`: a capability that does not currently exist.

Input is JSONL with only `id` and `text`. IDs must be unique. Prefer an existing approved dataset; preparing a large dataset solely to call this tool can erase the benefit. The tool sends every record to TypeSafe. Use only data authorized for that provider; file exclusions do not detect embedded secrets.

The complete output contains one `id`/`label` object per record. It defaults to `decisions.jsonl` beside the input; choose `output_path` for a different new file. Existing files are never overwritten. Parent directories must already exist. This is a writing tool and follows normal host approval policy; do not mark it read-only or globally disable approvals.

Read the returned policy and original evidence for decisions below confidence 0.8. Correct the saved file when warranted. Other source reads remain available, especially for consequential or ambiguous items, but do not automatically reread the whole batch just to transcribe labels already written. Confidence is uncalibrated: no review items is not proof of correctness. Return the file path and a concise summary.

Verify `method: jev`, `api_requests`, record count and successful file creation. Errors produce no substitute labels. If the provider fails or the batch is too small to repay the overhead, use ordinary tools and state that Jev did not complete the task.

The benchmark is exploratory, synthetic and specific to feedback themes. It does not prove general cost savings, accuracy superiority or a universal size threshold. New policies, capabilities and broadening of claims require the repository's benchmark gate first. Labels do not authorize sending messages, editing issues or taking other external actions.
