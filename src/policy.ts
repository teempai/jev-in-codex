/** New policies require the gate in benchmarks/POLICY.md before becoming available. */
export const feedbackPolicy = {
  id: 'feedback_theme',
  question: 'What is the primary requested improvement?',
  criteria: {
    reliability: 'Fix failures, data loss or unavailable behavior',
    usability: 'Improve navigation, comprehension or interaction effort',
    pricing: 'Change price, plan limits or billing policy',
    feature: 'Add a capability that does not currently exist',
  },
} as const;
export type Label = keyof typeof feedbackPolicy.criteria;
