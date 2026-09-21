# Custom text labelling

Describe the decision as a question and a map of label names to definitions. Call the same `jev_label` tool; no code change or new named preset is needed:

```json
{
  "path": "messages/items.jsonl",
  "output_path": "messages/action-labels.jsonl",
  "policy": {
    "question": "Does the recipient have an outstanding requested action?",
    "criteria": {
      "action": "An explicit request to the recipient that is not completed or withdrawn.",
      "no_action": "Information only, resolved requests, or work assigned solely to someone else."
    }
  }
}
```

Every input line has only `id` and `text`. Every output line has the original `id` and exactly one `label`. Labels can represent topics, sentiment, document collections, review categories, urgency or another decision grounded in the supplied text. These are possible uses of the interface, not separate accuracy or speed guarantees.

Use 2–16 labels. Names are 1–64 ASCII letters, digits, underscores or hyphens, starting with a letter or digit; `constructor` and `prototype` are reserved. Questions and each definition must be nonblank and at most 1,000 characters after trimming. The tool validates the complete policy before making provider requests. More labels or longer definitions can shrink batches and increase provider overhead. The measured cases use 2, 3, 4 and 5 labels; accepting up to 16 is an operational limit, not a performance claim.

Define what counts, exclusions, and tie-breaking rules. If evidence can be insufficient or outside the taxonomy, include an `unknown` or `other` label explicitly. Jev must choose from your labels; it does not invent an abstention category. A restrictive schema ensures a valid label, not a correct judgment.

One call labels one dimension. To produce topic and urgency, make two calls with separate output paths and join by ID using ordinary tools. That composition makes additional paid requests and has not been benchmarked as a combined workflow. Simultaneous multi-label assignment, hierarchical outputs, image/audio classification, OCR, arbitrary extraction and external actions are outside this interface. Convert approved source material into text first, accounting for preparation cost.

For the original feedback taxonomy, keep using `"policy": "feedback_theme"`, or omit `policy`. Its labels and definitions are unchanged. Existing calls and output formats remain compatible.

Choose an existing substantial batch where writing and reviewing a complete artifact is the actual task. For a new taxonomy, inspect a representative sample and ambiguous cases against independently checked labels before trusting bulk results. Review the returned original evidence below confidence 0.8; confidence is uncalibrated, so also check consequential or surprising high-confidence decisions. Tiny batches and expensive preparation can erase any benefit. The [benchmark report](../benchmarks/custom/README.md) states what was actually measured.

Data handling, workspace boundaries, no-overwrite behavior and provider failures are the same as the preset. The records, question and criteria are sent to TypeSafe. Labels alone never authorize acting on the records.
