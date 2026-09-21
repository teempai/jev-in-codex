## Jev batch labelling (optional project guidance)

Use the installed jev-label skill and jev_label for a substantial batch of approved text under a custom question/criteria policy or feedback_theme. Prefer ordinary tools for small batches. The documented benefit is a bounded synthetic benchmark, not a universal threshold or a reason to route every task through Jev.

The input is id/text JSONL. Jev writes the complete id/label artifact and returns uncertain original records for review. Inspect those records and correct the file when warranted. Additional reads remain available, but avoid reading the entire batch merely to retranscribe labels. Confidence is uncalibrated. Check method, request count, coverage and successful output; failures have no local fallback.

Records leave the machine for TypeSafe, so use only authorized content. Labels do not authorize external actions. Respect the writing tool's host approval policy. Do not use retired selection/search/triage tools or introduce new built-in presets or workflow changes without the benchmark gate. Validate new user-defined taxonomies on representative examples.

This block is optional project-local guidance. Do not add it globally or install it automatically.
