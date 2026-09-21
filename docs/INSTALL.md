# Install or update Jev labelling in Codex

This repository is a plugin source, not a marketplace. A TypeSafe account/key is required separately from a Codex subscription. Never put the key in chat, the repository, a manifest or command output.

## Agent-assisted installation

1. Use a durable local checkout and Node.js 22+. Run `npm ci --ignore-scripts`, `npm run check` and `node dist/index.js --help`. No ripgrep dependency remains.
2. Use the host's plugin-authoring helpers to create or reuse a local marketplace entry for `jev-in-codex`. Preserve unrelated entries. With Codex's Plugin Creator skill, use its documented personal-marketplace flow rather than treating this GitHub repository as a marketplace.
3. In the local checkout's `.mcp.json`, configure an absolute Node executable and absolute built `dist/index.js`, followed by `--root` and the selected workspace. Pass `TYPESAFE_API_KEY` through the launch environment or the user's existing private credential helper. Set the timeout to 90 seconds. Keep machine-specific paths and helpers out of upstream commits.
4. Install `jev-in-codex@<confirmed-marketplace-name>` with the supported `codex plugin add` flow. Do not also register a second MCP copy. For updates, use the host's cachebuster helper and reinstall from the existing local marketplace.
5. Verify a fresh MCP handshake advertises **only `jev_label`**, marked as a writing tool. A key-free call must report that authentication is missing and produce no output. With the existing key, test on invented records and verify `method: jev`, positive `api_requests`, and the complete saved file.
6. Start a new Codex thread so the changed tool catalog and bundled `jev-label` skill are picked up. The current thread can retain stale tool metadata. Do not claim installation solely from a marketplace listing.

Do not automatically edit global or project instructions. The bundled skill is the default guidance. [AGENTS.jev.md](AGENTS.jev.md) is optional project-local guidance only when the user requests it. Do not change global approvals to make this writing tool run unattended; use normal host approval. The benchmark's scoped temporary permission is not an installation recommendation.

For direct MCP setup without the plugin, use the README's configuration and explain that the bundled skill is not installed by that method.

## Codex desktop and the API key

A desktop app may not inherit terminal environment variables. Preserve an existing working Keychain or other private launcher helper. Otherwise guide the user to enter the key privately using a method available on their host, then configure the launcher to read it in memory. Never print the value, persist it in this repository, or ask the user to paste it into a conversation.

The model is pinned to `jev-1.13.0`, matching the benchmark. `JEV_MODEL` is no longer an override. Changing the model requires new evidence.

## Migrating from 0.1

The former `jev_select_capability`, `jev_search` and `jev_triage` tools, `jev-assist` skill and local fallback are removed. Delete only their stale guidance from the active project/global instruction file if that guidance was previously installed and the user authorizes its removal. Preserve unrelated instructions. Do not replace it with blanket global labelling instructions.

The new tool creates files and sends every input record to TypeSafe. It accepts the feedback preset or a custom question and label definitions. Output defaults to `decisions.jsonl` next to the input and never overwrites an existing file; use a new `output_path` for another run.

## Updating from 0.2

The `feedback_theme` default and id/label output are unchanged. Version 0.3 adds a policy object for custom text labels; see [the interface guide](LABELLING.md). Rebuild, reinstall with the host cachebuster flow and start a new thread. Preserve the working private launcher and workspace root.

## Remove

Use `codex plugin remove jev-in-codex@<marketplace-name>` for the installed entry. Remove an otherwise unused dedicated marketplace only when requested. Preserve the user's dataset, output files, credentials and unrelated configuration.
