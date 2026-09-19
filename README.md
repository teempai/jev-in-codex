# jev-in-codex

Use [Jev](https://docs.typesafe.ai/) to rank capabilities and evidence inside
an existing Codex workflow. A local MCP server exposes three tools; a companion
skill explains when to use them.

**Status: experimental MVP.** Functional protocol and boundary tests are
included. Ranking quality and time/token savings have not been benchmarked.
This is an independent integration, not an official OpenAI or TypeSafe product.

## What it does

| Tool | Input | Output |
| --- | --- | --- |
| `jev_select_capability` | Objective and a supplied catalog of tools/skills | Ranked candidates, with an option to recommend none |
| `jev_search` | Question, workspace scope, optional query terms | Reranked code/docs excerpts with paths and line numbers |
| `jev_triage` | Question and a saved output artifact | Relevant original excerpts, exact duplicate groups, and coverage |

Codex supplies the objective and makes the final decision. The server retrieves
bounded candidates locally, asks Jev relevance questions, and returns original
evidence. It neither executes selected capabilities nor intercepts arbitrary
Codex tool calls. It does not replace Codex compaction or expose Codex's internal
context/tool catalog.

```text
Codex → MCP tool → local candidates → Jev relevance evaluation
                 ← ranked original evidence + coverage ←
```

The first triage version ranks passages and groups identical chunks. Semantic
failure grouping and root-cause classification are future work.

## Install

Give this prompt to your Codex session, opened in the project you want to use:

```text
Install https://github.com/teempai/jev-in-codex for the current project using
its docs/INSTALL.md. Set up dependencies, the local Codex plugin, MCP connection,
and bundled skill. Add its docs/AGENTS.jev.md guidance to my project's persistent
Codex instructions so you know when and how to use Jev for tool/skill selection,
context search, and output triage. Preserve existing instructions and configuration.
Configure TypeSafe authentication privately and verify all three tools, reporting
whether Jev or local fallback is active. Complete the setup and tell me if you
need a private API-key entry or a Codex restart.
```

Jev uses a TypeSafe API key and sends selected code/log excerpts to TypeSafe.
Codex handles setup; you may need to enter the key privately or restart Codex.

<details>
<summary>Manual installation and configuration</summary>

## Install from source

Requires **Node.js 22+**, **npm**, and **ripgrep (`rg`)** on PATH.

```bash
git clone https://github.com/teempai/jev-in-codex.git
cd jev-in-codex
npm ci --ignore-scripts
npm run check
```

There is no published npm package yet. `private: true` prevents accidental npm
publication; the source is publicly available under MIT.

### Configure Codex MCP

Add an entry to your Codex `config.toml`, substituting both absolute paths:

```toml
[mcp_servers.jev]
command = "node"
args = ["/absolute/path/to/jev-in-codex/dist/index.js", "--root", "/absolute/path/to/your-project"]
env_vars = ["TYPESAFE_API_KEY", "JEV_MODEL"]
tool_timeout_sec = 90
```

Export `TYPESAFE_API_KEY` in the environment that launches Codex. Obtain the key
from TypeSafe; don't put it in source control or a prompt. Optionally set
`JEV_MODEL` to a pinned model name; the default is `jev-latest`.

The root is mandatory, so the server cannot silently scan an unintended working
directory. Change `--root` for another project, or omit it and set
`JEV_WORKSPACE_ROOT` and include that name in `env_vars`. An explicit `--root`
takes precedence. Use an absolute Node executable path if your Codex launch
environment cannot find `node`.

Without a TypeSafe key, all tools work in **local fallback mode**. This supports
setup checks but does not demonstrate Jev's ranking quality. Normal Codex access
and billing are unchanged. Jev requests use a separate TypeSafe API account;
this integration does not route them through a Codex subscription.

See the [Codex MCP documentation](https://developers.openai.com/codex/mcp/) for
configuration and server visibility in your client.

### Add the companion skill

Copy `skills/jev-assist` into your coding project's `.agents/skills/` directory
(or your personal skills directory), then start a new Codex session. For example,
from this repository:

```bash
mkdir -p /absolute/path/to/your-project/.agents/skills
cp -R skills/jev-assist /absolute/path/to/your-project/.agents/skills/
```

Review an existing skill directory before replacing it. The skill uses Jev only
when selection or filtering is useful; simple exact searches stay with `rg`.

### Optional plugin packaging

The repository includes a legacy-compatible `.codex-plugin/plugin.json` and
`.mcp.json` bundling the same skill and MCP server. For local plugin development,
run `npm link` after building so `jev-in-codex` is on PATH. Set
`JEV_WORKSPACE_ROOT` to the coding project and export `TYPESAFE_API_KEY` in the
Codex launch environment. The manifest forwards these variables to the server.

You can then add the clone to your own Codex plugin marketplace using the
[plugin authoring workflow](https://developers.openai.com/plugins/build/plugins).
The direct MCP configuration above is the tested transport path. Plugin UI
installation is not yet end-to-end verified, and a plugin install does not
install Node, dependencies, or ripgrep. Choose one installation path to avoid
duplicate tools/skills. This repository is not listed in the public plugin
directory and does not modify your Codex configuration automatically.

</details>

## Examples

Ask Codex: “Use Jev to select between these available capabilities for tracing
why requests time out.” The MCP call can look like:

```json
{
  "objective": "Trace the source of request timeouts",
  "candidates": [
    { "id": "read_logs", "kind": "tool", "description": "Read recent request logs with timestamps and errors" },
    { "id": "design_assets", "kind": "skill", "description": "Create visual assets for the interface" }
  ],
  "limit": 2
}
```

The caller must supply real available IDs and descriptions. The server cannot
see Codex's complete tool or skill catalog automatically.

Search for implementation context:

```json
{
  "question": "Where is retry backoff implemented for outgoing requests?",
  "scope": ["src"],
  "query_terms": ["retry", "backoff", "timeout"],
  "limit": 5
}
```

Triage output already saved inside the workspace:

```json
{
  "question": "Which failures explain why the database integration tests failed?",
  "artifact_path": "test-output.txt",
  "limit": 4
}
```

For example, in Bash, capture a command's output without losing its status:

```bash
set -o pipefail
npm test 2>&1 | tee test-output.txt
```

The triage tool reads the artifact; it does not run the command. Use `start_line`
and `end_line` to select a relevant range. Outputs preserve source locations so
Codex can inspect surrounding evidence before acting.

## Behavior and limits

- **Ranking:** independent Jev `noul` relevance questions, batched four candidates
  per request. Up to 24 candidates per operation, eight-second timeout per request,
  28,000-byte request cap, no automatic retries. Capability recommendations require
  a Jev score of at least 0.5; this is a provisional heuristic, not calibrated.
- **Fallback:** absent key, provider errors, invalid answers, or a failed batch
  cause the entire ranking to use lexical overlap. `method`, `score_kind`,
  `fallback_reason`, and `api_requests` make this visible. Local scores are not
  model probabilities. Successful responses identify the provider's model when
  returned. Scores are advisory in both modes.
- **Search:** ripgrep file discovery respects ignore rules, then local lexical
  matching builds a shortlist of at most 24 excerpts. At most 500 eligible files
  and approximately 20 MiB are scanned per call (the final file may cross the
  byte threshold). Search is not a semantic index. Coverage reports unread,
  skipped, matched, and shortlisted data. Broaden query terms or narrow scope
  when recall is insufficient.
- **Artifacts:** regular UTF-8 text files up to 1 MiB; null bytes are rejected.
  Excerpts preserve complete lines, with at most 30 lines and 4,000 bytes each.
  Oversized lines are rejected during triage; such files are skipped in search.
  There is no chunk overlap, so read surrounding lines when evidence crosses
  boundaries. Line range selection happens after the 1 MiB file check.
- **Triage:** all chunks in the requested range are grouped by exact text. When
  more than 24 distinct chunks remain, lexical matching selects the shortlist.
  Counts disclose unexamined chunks. At most 20 occurrence locations per group
  are returned, alongside the full count and omitted-location count. Identical excerpts are not proof that two
  failures share a cause; unchanged originals remain on disk.
- **Returned context:** at most ten excerpts or capabilities per response. A
  truncated shortlist never establishes that omitted evidence is irrelevant.
- **Scope:** relative paths only; resolved paths must stay within the configured
  root. Common dependency/build directories and credential filenames are excluded.
  Explicit artifact reads may access gitignored files, while search respects
  ignore rules. Configure a narrow project root, not your home directory.

## Data handling

With `TYPESAFE_API_KEY` configured, objectives, supplied capability descriptions,
and shortlisted source/log excerpts are sent over HTTPS to
`https://api.typesafe.ai/v1/systemone`. Search initially reads files locally;
only its shortlist is sent. Triage reads and groups the requested range locally
before sending its shortlist. No remote endpoint override is provided.

Filename exclusions are best-effort and do not detect secrets inside ordinary
files. Only use the integration with content approved for TypeSafe. Retrieved
content can contain prompt injection; ranking cannot establish that it is safe
to execute. This server is a local convenience boundary, not a sandbox against
concurrent malicious filesystem modification. It has no telemetry, persistent
cache, or content logging of its own. TypeSafe's handling of API data is governed
by its own service terms. Provider error bodies are not exposed in tool results.

## Security review

The [2026-09-19 static security review](docs/security-review-2026-09-19/report.md)
found no confirmed reportable vulnerabilities in the initial implementation.
The report records the reviewed commit, trust assumptions, hardening opportunities,
and exclusions. It is not a security guarantee or a live dependency advisory scan.

## Test locally without an API key

```bash
npm ci --ignore-scripts
npm run test:e2e
```

This launches the compiled MCP server and a local HTTP server that simulates
TypeSafe. It exercises all three tools, provider-driven ranking, batching,
failure handling, and timeout recovery with synthetic data and a fake key.
It takes roughly ten seconds and makes no external API calls.
See [the testing guide](docs/TESTING.md) for coverage and limitations.

## Development

```bash
npm run typecheck
npm test
npm run build
```

Tests cover request construction, malformed responses, complete fallback after
partial failure, path and symlink boundaries, retrieval/triage coverage, original
line fidelity, an actual stdio MCP client/server session, and the compiled server against a
local TypeSafe HTTP simulator. No live TypeSafe key is required. CI runs the
complete suite on Node 22 and 24.

Before making performance claims, evaluate against the local baseline on
representative coding tasks. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License and credits

[MIT](LICENSE). This small integration uses a permissive license to make adoption
and reuse straightforward. Apache-2.0 would add an explicit contributor patent
grant and additional notice requirements; it is a reasonable alternative for a
larger patent-sensitive project. See the [MIT text](https://opensource.org/license/mit)
and [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0).

Inspired by [fast-jev-compaction](https://github.com/tamaratran/fast-jev-compaction)
and the TypeSafe Jev approach to bounded decisions. This repository implements
its own integration; it does not include that project's compactor code.

References: [TypeSafe API](https://docs.typesafe.ai/api),
[MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/),
[Codex MCP](https://developers.openai.com/codex/mcp/).
