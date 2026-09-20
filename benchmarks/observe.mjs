// Benchmark-only instrumentation. Never loaded by the production launcher.
import fs from 'node:fs';
const original = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const start = performance.now();
  const response = await original(url, init);
  if (url === 'https://api.typesafe.ai/v1/systemone' && process.env.JEV_BENCH_TRACE) {
    const request = JSON.parse(init.body), result = await response.clone().json().catch(() => ({}));
    fs.appendFileSync(process.env.JEV_BENCH_TRACE, JSON.stringify({ status: response.status, elapsed_ms: performance.now() - start,
      usage: result.usage, model: result.model ?? request.model,
      decisions: request.state.items.map((item, i) => ({ id: item.id, label: result.answers?.['q'+i]?.choice, confidence: result.answers?.['q'+i]?.confidence })) })+'\n');
  }
  return response;
};
