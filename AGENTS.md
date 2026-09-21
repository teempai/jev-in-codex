# Jev in Codex development

The product exposes only capabilities with recorded benchmark evidence of a useful improvement over plain Codex. Currently admitted: single-label text batches with custom question/criteria and the feedback_theme preset through jev_label, on the bounded workloads in benchmarks/custom/README.md.

Before adding or exposing any tool, built-in preset or expanded workflow, follow benchmarks/POLICY.md. Run an end-to-end paired benchmark with actual Jev requests, grade complete outputs, retain all assigned outcomes and demonstrate the predeclared benefit gate. Do not claim success from local preprocessing that bypasses Jev, a mock, an unused plugin, or a prompt-only improvement. Label synthetic development evidence and uncertainty honestly.

Do not restore capability selection, context search, output triage, lexical fallback or broad global usage instructions without new qualifying evidence. Keep keys and host paths out of commits. Update docs and the bundled skill with interface changes. Run npm run check and the recorded benchmark verification before publishing.

User-supplied taxonomies are inputs to the custom interface, not independently admitted policies. Validate their quality on representative examples and do not generalize the synthetic benchmark claims.
