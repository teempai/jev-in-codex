# Test locally without a TypeSafe account

Install Node.js 22+ and ripgrep (`rg`), then run from the repository:

```bash
npm ci --ignore-scripts
npm run test:e2e
```

No TypeSafe key, Codex login, or paid API request is needed. The test supplies a
synthetic key to its child process, creates a temporary workspace, and removes
that workspace when it finishes. Allow loopback networking: the simulated HTTP
provider binds to `127.0.0.1` on an automatically selected port.

The test takes roughly ten seconds, including an intentional eight-second
provider timeout. Successful output lists each scenario followed by zero failed
tests. To run type checking and the complete test suite, use:

```bash
npm run check
```

## What runs end to end

```text
MCP SDK client
  → real stdio transport and protocol handshake
  → compiled dist/index.js in a separate Node process
  → real tool schema validation and service logic
  → real workspace reads and ripgrep discovery
  → real Jev request construction and HTTP fetch
  → local HTTP server returning simulated TypeSafe responses
  → real response parsing, ranking, and evidence formatting
  → MCP result received and checked by the client
```

The production code still requests the fixed TypeSafe HTTPS URL. A test-only
Node preload, `test/fixtures/local-typesafe.mjs`, redirects that exact fetch to
the loopback HTTP server. Other fetch destinations are rejected. The module is
loaded explicitly by this test; the production entry point never imports it.
There is no production endpoint override or runtime mock mode.

The simulator validates the HTTP method, path, synthetic authorization header,
model selection, request size, candidate batches, and per-candidate question
references. It returns deterministic scores that deliberately reorder candidates,
so a passing test demonstrates provider-driven ranking rather than accidentally
passing through local fallback.

## Scenarios

| Scenario | Checked outcome |
| --- | --- |
| MCP handshake | All three tools are advertised |
| Six capability candidates | Two HTTP batches; the last candidate wins on its provider score |
| Context search | Real local files are retrieved; provider ranking changes their order; paths and original lines survive |
| Output triage | A later log passage outranks the first; original text, line numbers, and coverage survive |
| No suitable capability | Low provider scores produce a null recommendation |
| HTTP 429 after a successful batch | The entire ranking falls back; provider scores are not mixed with lexical scores |
| Invalid JSON, invalid score, missing answer | Explicit local fallback returns through MCP |
| Path traversal request | Tool error occurs before any provider request |
| Stalled HTTP response | The production eight-second timeout triggers fallback |
| Request after failures | The same running server successfully ranks with the provider again |

For example, the capability test expects `method: "jev"`, model
`"jev-simulated"`, `api_requests: 2`, and recommendation `"tool-5"` with score
`0.99`. These are synthetic test fixtures, not a live Jev prediction.

## What this does not prove

This validates the application's MCP-to-HTTP integration and its handling of the
modeled TypeSafe contract. It does not test TypeSafe's live authentication,
service behavior, TLS connection, or ranking quality. It also does not launch
Codex itself, verify plugin UI installation, or establish that an LLM will choose
to call Jev at the right time. Those require separate live integration checks.
