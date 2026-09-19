// Test-only preload. The production entry point never imports this module.
// Redirect only the expected TypeSafe request to the loopback test server;
// unexpected destinations fail closed rather than reaching the internet.
const local = new URL(process.env.JEV_TEST_TYPESAFE_URL ?? '');
if (local.protocol !== 'http:' || local.hostname !== '127.0.0.1' ||
    local.pathname !== '/v1/systemone' || !local.port || local.username ||
    local.password || local.search || local.hash) {
  throw new Error('Expected an explicit loopback TypeSafe test endpoint.');
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (input !== 'https://api.typesafe.ai/v1/systemone') {
    throw new Error('Unexpected network destination in the local integration test.');
  }
  return originalFetch(local, init);
};
