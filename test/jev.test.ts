import test from 'node:test';
import assert from 'node:assert/strict';
import { Jev } from '../src/jev.js';

const candidates = [ { id: 'a', text: 'Inspect database queries' }, { id: 'b', text: 'Draw interface mockups' } ];
const fake = (handler: (body: any, init: RequestInit) => Response | Promise<Response>): typeof fetch =>
  (async (_url, init) => handler(JSON.parse(init!.body as string), init!)) as typeof fetch;

test('missing key is an explicit offline fallback with no request', async () => {
  const result = await new Jev({ fetch: fake(() => { throw new Error('Must not fetch'); }) }).rank('database queries', candidates);
  assert.equal(result.method, 'local_fallback');
  assert.equal(result.score_kind, 'lexical_overlap');
  assert.equal(result.ranked[0].id, 'a');
  assert.equal(result.api_requests, 0);
});

test('Jev response controls rank and each question references its own candidate', async () => {
  const result = await new Jev({ apiKey: 'test-key', fetch: fake((body, init) => {
    assert.equal(body.model, 'jev-latest');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer test-key');
    assert.match(body.questions.q1.instructions, /candidates\[1\]/);
    assert.equal(body.state.objective, 'database queries');
    return Response.json({ model: 'jev-test', answers: { q0: { type: 'noul', noul: 0.1 }, q1: { type: 'noul', noul: 0.9 } } });
  }) }).rank('database queries', candidates);
  assert.equal(result.method, 'jev');
  assert.equal(result.model, 'jev-test');
  assert.equal(result.ranked[0].id, 'b');
});

for (const [label, response] of [
  ['missing answers', {}],
  ['out of range', { answers: { q0: { type: 'noul', noul: 2 }, q1: { type: 'noul', noul: 0.5 } } }],
  ['missing candidate', { answers: { q0: { type: 'noul', noul: 0.5 } } }],
  ['wrong primitive', { answers: { q0: { type: 'choice', noul: 0.5 } } }],
] as const) {
  test(`malformed response falls back: ${label}`, async () => {
    const result = await new Jev({ apiKey: 'secret', fetch: fake(() => Response.json(response)) }).rank('database', candidates);
    assert.equal(result.method, 'local_fallback');
    assert.equal(result.ranked.length, 2);
  });
}

test('a later failed batch discards all Jev scores and hides provider error details', async () => {
  let count = 0;
  const items = Array.from({ length: 7 }, (_, i) => ({ id: String(i), text: i === 6 ? 'database' : 'unrelated' }));
  const result = await new Jev({ apiKey: 'secret', fetch: fake(body => {
    assert.ok(body.state.candidates.length <= 4);
    if (++count === 2) return new Response('secret echoed in an error', { status: 429 });
    return Response.json({ answers: Object.fromEntries(Object.keys(body.questions).map(id => [id, { type: 'noul', noul: 0.99 }])) });
  }) }).rank('database', items);
  assert.equal(result.method, 'local_fallback');
  assert.equal(result.ranked[0].id, '6');
  assert.equal(result.ranked[1].score, 0);
  assert.equal(result.api_requests, 2);
  assert.ok(!JSON.stringify(result).includes('secret'));
});

test('network exceptions are sanitized', async () => {
  const result = await new Jev({ apiKey: 'secret', fetch: fake(() => { throw new Error('secret'); }) }).rank('database', candidates);
  assert.equal(result.method, 'local_fallback');
  assert.ok(!JSON.stringify(result).includes('secret'));
});
