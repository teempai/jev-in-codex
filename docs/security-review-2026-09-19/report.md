> Historical review of the retired 0.1 read-only capabilities. This report does not cover the 0.2 labelling writer.

# Security Review: teempai/jev-in-codex

## Scope

All 20 tracked files at the initial implementation revision, before subsequent documentation changes. Independent baseline auditor, architecture reviewer, and parent static boundary review. No confirmed reportable vulnerabilities.

- Scan mode: repository
- Target kind: git_revision
- Target ID: jev-in-codex-b0c0246a38be91f91d168ee8556c284a8c8a3e49
- Revision: b0c0246a38be91f91d168ee8556c284a8c8a3e49
- Inventory strategy: repository
- Included paths: .
- Excluded paths: node_modules/, dist/, .git/
- Runtime or test status: Static source review; no application execution or network calls by source reviewers. Installation CLI help checked separately.
- Artifacts reviewed: .codex-plugin/plugin.json, .github/workflows/ci.yml, .gitignore, .mcp.json, CONTRIBUTING.md, LICENSE, README.md, package-lock.json, package.json, skills/jev-assist/SKILL.md, src/index.ts, src/jev.ts, src/server.ts, src/service.ts, src/workspace.ts, test/jev.test.ts, test/mcp.test.ts, test/workspace.test.ts, tsconfig.json, tsconfig.test.json
- Scan context: Please conduct a security review of this implementation and also provide simple instructions on how users can ask their codex agent to install the plugin.

Limitations and exclusions:
- Not a proof of absence of vulnerabilities.
- No live dependency advisory lookup or audit of dependency implementation.
- No live TypeSafe calls, penetration test, or adversarial model evaluation.
- Trusted local workspace deployment; no guarantee against hostile concurrent filesystem mutation.
- Token usage unavailable.
- Excluded node_modules/: Dependency implementations and advisory database were not audited; lockfile reviewed.
- Excluded dist/: Generated output; implementation reviewed in src.
- Excluded .git/: Only current tracked source reviewed, not history.

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 0 |
| Severity mix | none |
| Confidence mix | none |
| Coverage | complete |
| Validation mode | Offline static analysis with independent baseline review; findings not inferred from documentation disclaimers alone. |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

A local stdio MCP server exposes three bounded ranking/search/triage tools to its launching Codex client. It reads a mandatory configured workspace, uses fixed-argument ripgrep for discovery, and optionally sends objectives and selected content to the fixed TypeSafe HTTPS API. It neither executes selected capabilities nor listens on a network endpoint (src/index.ts:14-18; src/server.ts:16-34; src/workspace.ts:44-70; src/jev.ts:54-64; src/service.ts:7-16).

### Assets

- Workspace source, documentation and logs: read locally, returned as original excerpts, optionally disclosed to TypeSafe (src/workspace.ts:44-60,81-97; src/service.ts:19-22,31-43).
- TypeSafe API credential: environment-sourced bearer token; diagnostics omit credential-bearing details (src/index.ts:17; src/jev.ts:60-63,79-81).
- Codex decision integrity and execution authority: recommendations influence decisions but never execute capabilities (src/service.ts:7-16; skills/jev-assist/SKILL.md:28-32).
- Local availability and provider account usage: bounded per-call scanning and at most six sequential provider requests; aggregate volume depends on the local client (src/workspace.ts:9-11,68-69,81-94; src/jev.ts:48-63; src/server.ts:19-33).
- Installed executable/dependency integrity: build produces dist/index.js launched directly or by PATH-resolved linked binary (package.json:9-18; .mcp.json:3-10; README.md:37-56,93-105).

### Trust Boundaries

- Launch configuration to MCP process: stdio only; --root overrides JEV_WORKSPACE_ROOT and missing root fails. API key/model are environment inputs; tool annotations are descriptive rather than authorization (src/index.ts:10-18; .mcp.json:3-10; src/server.ts:11-14).
- MCP caller to files: bounded schemas; relative paths checked lexically and after realpath against root and exclusions. Reads use O_NOFOLLOW/O_NONBLOCK and reject nonregular, oversized, binary and invalid UTF-8 files (src/server.ts:8-10,19-33; src/workspace.ts:18-23,35-60).
- Untrusted workspace text to provider and Codex: filenames/content enter provider state and original MCP evidence. Provider instructions/skill label content untrusted; text is not transformed into trusted instructions (src/service.ts:19-22; src/jev.ts:50-56; src/workspace.ts:123; skills/jev-assist/SKILL.md:30-32).
- Process to TypeSafe: fixed https://api.typesafe.ai/v1/systemone, redirects rejected, eight-second timeout, bearer credential. No key means local ranking. Responses validated before scores are used (src/jev.ts:13,26-29,42-43,54-75).
- Process to ripgrep: PATH-resolved rg, fixed arguments, no shell, root cwd, ten-second timeout and four-MiB output cap. Caller scope/query are not command arguments (src/workspace.ts:1-8,63-80).
- Installation/CI to executed local code: reviewed README used npm ci and npm run check; CI disables dependency lifecycle scripts. Runtime versions exact, lockfile has registry origins/integrity; some development dependencies have lifecycle scripts. Actions use version tags with contents:read and no injected secrets (README.md:37-42; package.json:11-18; package-lock.json; .github/workflows/ci.yml:5-21).

### Attacker Capabilities

- Repository/log contributors control eligible filenames/content, including instruction-like text, that users choose to read (src/workspace.ts:75-97; src/service.ts:31-43).
- Connected local caller controls objectives, catalogs, relative scopes, paths and valid limits, but cannot change provider URL or execute recommended tools through these schemas (src/server.ts:16-34; src/service.ts:7-16; src/jev.ts:60).
- A malicious/compromised provider controls scores, model metadata, timing and response size; schema validation follows response.json (src/jev.ts:26-29,60-78).
- Control of launch environment, PATH, dependencies or configured root gives broader local authority than repository text alone. Concurrent malicious filesystem mutation is outside the documented sandbox guarantee (src/index.ts:14-17; src/workspace.ts:68-70; README.md:203-204).

### Security Objectives

- Confine ordinary reads to root; reject excluded paths and static escaping symlinks (src/workspace.ts:35-60; test/workspace.test.ts:16-25).
- Only configured remote mode sends content to the fixed HTTPS provider, and errors omit remote bodies/secrets (src/jev.ts:42,60-81).
- Keep tools read-only; ranking does not grant execution permission (src/server.ts:11; src/service.ts:16; src/workspace.ts:46; skills/jev-assist/SKILL.md:30).
- Bound work and expose incomplete retrieval, truncation and fallback (src/workspace.ts:9-11,68-101; src/service.ts:41-56; src/jev.ts:37-43,58-81).
- Preserve original evidence/locations for verification (src/workspace.ts:106-123; src/service.ts:45-56; test/workspace.test.ts:38-45).

### Assumptions

- Trusted launching client, environment, installed Node/rg and configured root. Local convenience boundary, not isolation from malicious same-user code or directory races (src/index.ts:14-18; src/workspace.ts:68-70; README.md:203-204).
- Users choose a narrow project root and content approved for TypeSafe. Filename exclusions do not detect embedded secrets; explicit triage can read gitignored files (README.md:187-206; skills/jev-assist/SKILL.md:32).
- Agent treats retrieved instructions as untrusted and applies normal authorization before executing suggestions (src/service.ts:16; skills/jev-assist/SKILL.md:12,30-31).
- TypeSafe trusted for intended data processing, availability and scoring. Provider privacy terms are outside source implementation (README.md:194-206; src/jev.ts:60-78).
- Plugin UI installation was not verified. Metadata installation alone does not install Node, dependencies or ripgrep (README.md:93-105).

## Findings

### No findings

No reportable findings survived the canonical discovery, validation, and reportability gates.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| File confinement and disclosure | not recorded | No issue found | Lexical/canonical containment and exclusions protect ordinary paths (src/workspace.ts:35-60). No traversal/static symlink bypass identified. Ancestor directory races require malicious concurrent mutation and are explicitly outside the documented model (README.md:203-204); O_NOFOLLOW is not a full sandbox. |
| Command execution and capability authority | not recorded | No issue found | execFile uses fixed rg arguments, with no caller shell interpolation (src/workspace.ts:68-70). Ranked capability IDs do not reach execution sinks (src/service.ts:7-16). PATH and launch configuration are trusted installation inputs. |
| Provider destination, credentials and response validation | not recorded | No issue found | Fixed HTTPS origin, redirect rejection, schema checks and sanitized errors (src/jev.ts:26-29,60-81). Defense-in-depth gap: response.json has no byte cap, and model metadata has no length cap. Exploitation requires provider compromise/malfunction; no arbitrary repository attacker path established. |
| Untrusted evidence and egress consent | not recorded | No issue found | Original source/log content reaches Codex and optionally TypeSafe (src/service.ts:19-22,31-43). Prompt injection and embedded secrets remain documented risks; provider instructions and skill preserve trust labels and execution permissions (src/jev.ts:52; skills/jev-assist/SKILL.md:28-32; README.md:194-206). No automatic execution. |
| Work and output limits | not recorded | No issue found | File/discovery/shortlist/excerpt/occurrence limits exist (src/workspace.ts:9-11,44-60,68-101; src/service.ts:41-54). Byte accounting happens after excerpt parsing: skipped files can consume more I/O than the approximately 20 MiB stated scan budget, though 500 files and 1 MiB/file still cap reads (src/workspace.ts:81-86). A robustness correction is recommended, not a demonstrated privilege crossing. No application-wide concurrency/spend cap; only trusted local stdio caller exposed. |
| Dependencies, CI and installation | not recorded | No issue found | Lockfile origins/integrity and dependency relationships reviewed; dependency code and live advisories excluded. CI uses pull_request, contents:read, no injected secrets, and --ignore-scripts (.github/workflows/ci.yml:1-21). Pin actions to immutable commits as hardening. Use --ignore-scripts in user installation, matching CI. No demonstrated supply-chain compromise. |
| Configuration and packaging | not recorded | No issue found | Root required and CLI precedence explicit (src/index.ts:14-17). Plugin command needs installed/built executable (.mcp.json:4); no marketplace catalog in reviewed repository. Installation usability issue, not a security vulnerability. Absolute executable paths and explicit project root reduce setup ambiguity. |
| Tests and contributor guidance | not recorded | No issue found | All tracked tests, skill and contributor documentation reviewed. Tests cover major boundaries but were not executed during this static audit. Prior implementation run reported 18 passing tests. No per-directory SECURITY.md policies found. |

## Open Questions And Follow Up

- Provider privacy/retention terms, adversarial model robustness and live Jev behavior were not evaluated.
- Plugin installation through the desktop UI and host sandbox interaction remain unverified.
- Whole-scan token usage is unavailable in this prompt-only scan.
