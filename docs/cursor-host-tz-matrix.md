# Cursor host living specification

Matrix of product requirements → module → tests for `omx cursor` in this clone ([`sesquicadaver/oh-my-codex-cursor`](https://github.com/sesquicadaver/oh-my-codex-cursor)). Official OMX remains [`Yeachan-Heo/oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex). Update this file when the Cursor-host surface changes.

| Requirement | Module | Tests | Status |
| --- | --- | --- | --- |
| Cursor is a second host, not Codex CLI | `src/cursor-host/overlay.ts`, `src/cli/cursor-host.ts` | `src/cli/__tests__/cursor-host.test.ts`, `src/cli/__tests__/cursor-host-help.test.ts` | covered |
| Dedicated `omx cursor` (not `omx adapt`) | `src/cli/cursor-host.ts`, `src/cli/index.ts` | help tests; nested-help routing | covered |
| Symlink `$CODEX_HOME/skills` into Cursor skills | `src/cursor-host/skills.ts` | `src/cursor-host/__tests__/init.test.ts` | covered |
| Skip `.system` / `workflows` / overlay name | `src/cursor-host/contracts.ts` | init source listing (reserved names excluded by contract) | covered |
| Never overwrite a real (non-symlink) skill directory | `src/cursor-host/skills.ts` | init conflict-directory case | covered |
| `--force` replaces broken/retargetable **symlinks** only | `src/cursor-host/skills.ts` | init broken-symlink case | covered |
| Owned overlay `omx-cursor-host` | `src/cursor-host/overlay.ts`, `src/cursor-host/init.ts` | overlay content + init write | covered |
| Project rule `.cursor/rules/omx-cursor-host.mdc` | `src/cursor-host/init.ts` | project-scope init | covered |
| Merge `mcp.json`: add `omx_trace` only by default | `src/cursor-host/mcp.ts` | init MCP merge | covered |
| Optional `omx_wiki`; never add/remove `omx_state`/`omx_hermes` | `src/cursor-host/mcp.ts`, `src/cli/cursor-host.ts` | project MCP + doctor unsafe MCP | covered |
| Preserve unrelated MCP servers | `src/cursor-host/mcp.ts` | github server preserved | covered |
| Invalid `mcp.json` is not overwritten | `src/cursor-host/mcp.ts`, `src/cursor-host/init.ts` | invalid JSON case | covered |
| Host-safe / partial / runtime-gated lists | `src/cursor-host/classification.ts` | `src/cursor-host/__tests__/classification.test.ts` | covered |
| Classification covers every installable catalog skill | `src/cursor-host/classification.ts` | catalog completeness test | covered |
| `status` / `doctor` report missing links, broken links, unsafe MCP | `src/cursor-host/status.ts`, `src/cursor-host/doctor.ts` | doctor unsafe MCP | covered |
| Nested `omx cursor --help` is command-local | `src/cli/index.ts` `NESTED_HELP_COMMANDS` | `nested-help-routing.test.ts`, `cursor-host-help.test.ts` | covered |
| Codex native hook allows `omx cursor --help` | `src/scripts/codex-native-hook.ts` | nested-help allowlist includes `cursor` | covered |
| `omx doctor` includes Cursor host health | `src/cli/doctor-cursor-host.ts`, `src/cli/doctor.ts` | `src/cli/__tests__/doctor-cursor-host.test.ts` | covered |
| Plugin mode fails the filesystem skill bridge | `src/cursor-host/doctor.ts` | `src/cursor-host/__tests__/doctor-plugin.test.ts` | covered |
| In-repo `.cursor` overlay/rule/mcp for this clone | `.cursor/skills/omx-cursor-host/`, `.cursor/rules/`, `.cursor/mcp.json` | classification in-repo overlay sync | covered |
| Clone README is Cursor-first adaptation, not a copy of official OMX | `README.md` | `src/ultragoal/__tests__/docs-contract.test.ts`, `src/cli/__tests__/install-docs-contract.test.ts` | covered |

## Anti-stub

No `pass` / `return null` as a fake implementation. Preview-without-`--write` is a real plan object (`write: false`, `wrotePaths: []`), not a stub.

## Canonical loop reminder

`$deep-interview` → `$ralplan` → `$ultragoal` (+ `$team`) → `$code-review` → `$ultraqa`

In Cursor Agent, only host-safe instruction skills and CLI/JSON are in-process. Runtime-gated steps stay on the OMX CLI/tmux host.
