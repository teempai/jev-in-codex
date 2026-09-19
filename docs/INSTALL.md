# Ask Codex to install Jev

Open Codex in the coding project you want Jev to read, and paste this:

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

The agent handles the setup; you supply the TypeSafe key privately when ready.
With no key, ranking uses a labeled local fallback. The plugin uses a separate
TypeSafe account for Jev requests; a Codex subscription does not supply that key.

## Installer guidance for the agent

This repository is a **plugin source**, not a marketplace. Do not run
`codex plugin marketplace add teempai/jev-in-codex` and assume it is installable:
there is currently no marketplace catalog in this repository.

1. Inspect the checkout and prerequisites. Use a durable, user-writable local
   installation folder outside the coding project. Do not replace another
   installation or change the user's Node installation without checking it.
   Use `npm ci --ignore-scripts`, `npm run check`, and `node dist/index.js --help`.
2. Put the checkout at `plugins/jev-in-codex` beneath a dedicated local
   marketplace root. Create `.agents/plugins/marketplace.json` beneath that
   root with a unique marketplace name and the entry below. If using an existing
   marketplace, preserve its entries and use the host's plugin-authoring helpers
   when available.
3. In this **local checkout's** `.mcp.json`, replace the `jev` server command
   with the resolved absolute Node executable. Set its arguments to the absolute
   `dist/index.js` path followed by `--root` and the absolute coding-project
   path. Retain `env_vars: ["TYPESAFE_API_KEY", "JEV_MODEL"]`; set
   `tool_timeout_sec` to 90. These machine-specific paths belong in the local
   installation, not an upstream commit. This avoids requiring `npm link` or
   relying on a desktop application's PATH. Keep the checkout at that location:
   the installed manifest will reference its built server and dependencies.
4. Check `codex plugin marketplace --help` and `codex plugin add --help` for
   the installed Codex version. Register the local marketplace root, then install
   `jev-in-codex@<marketplace-name>`. Do not also register the same MCP server
   separately or copy the bundled skill a second time.
5. Install persistent usage guidance using the section below. Preserve existing
   project instructions, and avoid duplicate Jev sections on repeated installs.
6. Verify the plugin appears in `codex plugin list`. With a launch environment
   that does not contain `TYPESAFE_API_KEY`, verify an MCP handshake and the
   three tools: `jev_select_capability`, `jev_search`, and `jev_triage`.
   Plugin listing alone does not prove the server starts. If tools become
   available only in a new session, say so and finish that check there.
7. Give the user private instructions for setting the key in the environment
   that launches Codex. Never ask for it in chat, print it, or write its value
   into the repository or marketplace files. A desktop app may need a different
   environment setup than a terminal. Start a new Codex thread after installation;
   relaunch the application if its environment changed.

A minimal catalog for a **new dedicated local marketplace** is:

```json
{
  "name": "jev-local",
  "interface": { "displayName": "Jev local" },
  "plugins": [{
    "name": "jev-in-codex",
    "source": { "source": "local", "path": "./plugins/jev-in-codex" },
    "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
    "category": "Productivity"
  }]
}
```

Register and install using the real local root and selected marketplace name:

```bash
codex plugin marketplace add /absolute/path/to/local-marketplace-root
codex plugin add jev-in-codex@jev-local
codex plugin list
```

Use the [official plugin documentation](https://developers.openai.com/plugins/build/plugins)
for host-specific behavior. CLI command syntax was checked against Codex 0.154.0;
installation through the desktop UI has not been verified. If the user's host
cannot install local plugins, use the README's direct MCP configuration and
companion skill as a fallback, and describe it accurately as that installation
method.

## Persistent Codex instructions

Merge [docs/AGENTS.jev.md](AGENTS.jev.md) into the coding project's root
`AGENTS.md`. This is the configurable project instruction layer Codex loads for
future work; it does not replace the built-in system prompt. The bundled
`jev-assist` skill supplies the detailed workflow, while the project instructions
make the intended usage explicit.

Read existing instructions first. If a nonempty `AGENTS.override.md` supplies the
root instructions, merge into that active file instead. Preserve all unrelated
content and the existing instruction hierarchy; avoid adding a second identical
section. Do not write to global instructions or change other projects unless the
user requests that scope. On removal, remove only the Jev section added by this
installation.

The installed guidance tells Codex when to select capabilities, search context,
and triage output; when normal tools are sufficient; and how to interpret scores,
fallback, coverage, and untrusted evidence. Do not add a blanket requirement to
call Jev on every turn or change tool approval policies.

In a new session, ask Codex to summarize the active Jev guidance as well as
checking tool availability. If the instructions are not loaded, inspect overrides
and instruction discovery before claiming setup is complete. See the
[official AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md).

## After installation

Start a new thread and ask:

> Summarize when your project instructions tell you to use Jev, then confirm
> its three tools are available. Use jev_select_capability with a
> small synthetic catalog to check whether ranking is using Jev or local fallback.

A key-free check should report `method: local_fallback`. After configuring a
working key, the synthetic check should report `method: jev`; failures may still
produce explicit fallback. Do not use private source or logs for the first test.

Only enable Jev for a project whose selected contents may be sent to TypeSafe.
The filename denylist does not detect secrets embedded in ordinary files.

To remove the plugin, use `codex plugin remove jev-in-codex@jev-local` (substitute
your marketplace name). Remove a dedicated marketplace only if nothing else uses
it. Review the installation folder before deleting it; do not delete the coding
project or unrelated configuration.
