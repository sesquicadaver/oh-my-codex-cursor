# `omx cursor`

`omx cursor` is the OMX-owned surface for **Cursor Agent** as a second host. It is not `omx adapt` (OpenClaw/Hermes/Herdr observation under `.omx/adapters/<target>/`), and it is not the VS Code/Cursor extension (`omx --direct` launcher).

**Repository boundary:** this clone (`sesquicadaver/oh-my-codex-cursor`) is not an upstream contribution surface. Do not open pull requests against [`Yeachan-Heo/oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex) from this work.

Cursor Agent can follow filesystem `SKILL.md` files. It does not run Codex `UserPromptSubmit` keyword routing, Stop-hook continuation, Codex `/goal` + `agent_type`, team tmux, or HUD layer 1.

## Contract

- **CLI/JSON is authority.** MCP is optional. Default Cursor MCP is `omx_trace` only.
- **Legacy filesystem skills are the Cursor bridge.** Plugin-mode setup archives `~/.codex/skills` and breaks discovery. Use `omx setup --scope user --install-mode legacy` before this command.
- **Runtime-gated skills stay gated.** `$autopilot`, `$ralph`, `$ultrawork`, `$team`, `$ultraqa`, and `$pipeline` need OMX CLI/tmux. Cursor Agent must not emulate those loops.
- **Never register `omx_state` or `omx_hermes` in Cursor.** Unset `OMX_SESSION_ID` on Cursor MCP would write into a live Codex session.

Living specification: [`docs/cursor-host-tz-matrix.md`](./cursor-host-tz-matrix.md).

## Commands

```bash
omx cursor init
omx cursor init --write
omx cursor init --scope project --write --mcp wiki
omx cursor status --json
omx cursor doctor
```

| Subcommand | Writes? | Behavior |
| --- | --- | --- |
| `init` | preview only | Plan skill symlinks, overlay, and MCP merge |
| `init --write` | yes | Materialize the plan |
| `init --write --force` | yes | Replace broken or retargetable skill **symlinks**; rewrite planned MCP servers. Never deletes a real skill directory |
| `status` | no | Overlay, links, MCP evidence |
| `doctor` | no | Missing overlay, broken links, conflicts, unsafe MCP |

## Scopes

| `--scope` | Skills | Overlay | Rule | MCP |
| --- | --- | --- | --- | --- |
| `user` (default) | `~/.cursor/skills/<skill>` → `$CODEX_HOME/skills/<skill>` | `~/.cursor/skills/omx-cursor-host/` | none | `~/.cursor/mcp.json` |
| `project` | `<cwd>/.cursor/skills/<skill>` | `<cwd>/.cursor/skills/omx-cursor-host/` | `<cwd>/.cursor/rules/omx-cursor-host.mdc` | `<cwd>/.cursor/mcp.json` |

Project scope prefers `<cwd>/.codex/skills/<name>` when that skill exists, otherwise `$CODEX_HOME/skills/<name>`.

Skipped directory names: `.system`, `workflows`, `omx-cursor-host`.

## MCP merge

Default planned server:

```json
{
  "mcpServers": {
    "omx_trace": {
      "command": "omx",
      "args": ["mcp-serve", "trace"]
    }
  }
}
```

- `--mcp wiki` also adds `omx_wiki` (still keeps `omx_trace`). Writes share `omx_wiki/` with Codex.
- `--mcp none` adds no OMX servers. Existing servers are never removed.
- Invalid `mcp.json` is left untouched.
- `omx_state` / `omx_hermes` are never added. If already present, `omx cursor doctor` reports `unsafe_mcp_server`.
- `omx_memory` / `omx_code_intel` are caution-only. Do not call `ast_grep_replace` with `dryRun=false` from Cursor.

## Skill fitness

| Class | Count | Cursor Agent |
| --- | --- | --- |
| Host-safe | 14 | Follow `SKILL.md` as instruction text |
| Partial | 8 | Useful text/CLI; Codex artifacts, HUD, or cancel semantics do not map 1:1 |
| Runtime-gated | 6 active + `worker` | Require OMX CLI/tmux/hooks; do not treat as Cursor-native loops |

Canonical loop remains `$deep-interview` → `$ralplan` → `$ultragoal` (+ `$team`) → `$code-review` → `$ultraqa`. In Cursor, host-safe steps are instruction-only; `$team` still needs tmux.

## What this command does not do

- Bundle OMX core into the VS Code/Cursor VSIX
- Port keyword-detector into Cursor
- Enable `omx_memory`, `omx_state`, or `omx_hermes` MCP
- Claim plugin marketplace as Cursor skill discovery

`omx doctor` on this fork includes a **Cursor host** check. Plugin-mode setup fails that check because it archives the filesystem skill bridge.
