import { z } from 'zod';
import { InputError } from './workspace.js';
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

const labelName = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/)
  .refine(value => !['constructor', 'prototype', '__proto__'].includes(value));
export const policySchema = z.union([
  z.literal('feedback_theme'),
  z.object({
    question: z.string().trim().min(1).max(1000),
    criteria: z.record(labelName, z.string().trim().min(1).max(1000))
      .refine(value => Object.keys(value).length >= 2 && Object.keys(value).length <= 16, 'Use 2–16 labels.'),
  }).strict(),
]);

export function resolvePolicy(input: unknown = 'feedback_theme') {
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) throw new InputError('Policy must be feedback_theme or {question, criteria} with 2–16 named labels. See the documented length and name limits.');
  return parsed.data === 'feedback_theme' ? feedbackPolicy : { id: 'custom', ...parsed.data };
}

