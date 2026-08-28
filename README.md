# oh-my-codex-cursor

<p align="center">
  <img src="https://yeachan-heo.github.io/oh-my-codex-website/omx-character-nobg.png" alt="oh-my-codex character" width="280">
  <br>
  <em>Give Cursor Agent the OMX skill catalog without turning Cursor into a second Codex runtime.</em>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![GitHub](https://img.shields.io/badge/GitHub-oh--my--codex--cursor-181717?logo=github)](https://github.com/sesquicadaver/oh-my-codex-cursor)
[![upstream OMX](https://img.shields.io/npm/v/oh-my-codex?label=upstream%20oh-my-codex)](https://www.npmjs.com/package/oh-my-codex)

**This repository:** [`sesquicadaver/oh-my-codex-cursor`](https://github.com/sesquicadaver/oh-my-codex-cursor)

**Official OMX (Codex-first):** [`Yeachan-Heo/oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex) · npm [`oh-my-codex`](https://www.npmjs.com/package/oh-my-codex) · [official README](https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md)

**Docs:** [Cursor host](./docs/cursor-host.md) · [Living spec](./docs/cursor-host-tz-matrix.md) · [Contributing](./CONTRIBUTING.md) · [Changelog](./CHANGELOG.md)

## What this repository is

This clone is an **OMX adaptation for Cursor Agent**. OMX stays a workflow layer for [OpenAI Codex CLI](https://github.com/openai/codex). Cursor is a **second host**: it can read filesystem `SKILL.md` files. It does not run Codex keyword routing, Stop-hook continuation, `/goal`, team tmux, or HUD layer 1.

The unique surface is `omx cursor`. It links OMX skills into Cursor, writes an owned overlay (`omx-cursor-host`), and merges a host-safe MCP default (`omx_trace` only).

| | This clone | Official OMX |
| --- | --- | --- |
| Default host | Cursor Agent | Codex CLI |
| Install | this checkout on `PATH` | `npm install -g oh-my-codex` |
| Skill discovery | filesystem symlinks + overlay | Codex skills / plugin marketplace |
| Durable control plane | `omx … --json` | `omx … --json` plus Codex hooks / tmux |
| PR surface | this repo’s `main` | `Yeachan-Heo/oh-my-codex` |

Do not open pull requests against [`Yeachan-Heo/oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex) from this work. Do not merge this clone into upstream. `package.json` still names the official GitHub repository so native release assets resolve there.

<table>
<tr>
<td><strong>🚨 CAUTION — Cursor Agent is not Codex CLI.</strong><br><br>Do not emulate <code>$autopilot</code>, <code>$ralph</code>, <code>$ultrawork</code>, <code>$team</code>, <code>$ultraqa</code>, or <code>$pipeline</code> as Cursor-native loops. Those need OMX CLI / tmux. Official <code>npm install -g oh-my-codex</code> does not include <code>omx cursor</code>.</td>
</tr>
</table>

## What it is for

Use this clone if you already run OMX (or will) and you want Cursor Agent to share the same skill catalog:

- host-safe skills as instruction text inside Cursor
- `omx … --json` for durable operations
- overlay + project rule so the agent knows it is not Codex
- `omx_trace` visibility without giving Cursor `omx_state` or `omx_hermes`

If you only want Codex CLI orchestration, use official OMX. If you only want a Chat pane that launches `omx --direct`, that is the VSIX in `packages/vscode-extension` — not this host.

## What it is not

- Not the official npm package or release line
- Not `omx adapt` (OpenClaw / Hermes / Herdr under `.omx/adapters/`)
- Not a port of UserPromptSubmit keyword routing
- Not a Cursor-native `/goal` or team control plane
- Not plugin-mode skill discovery (plugin setup archives `~/.codex/skills` and breaks the bridge)

## Recommended default flow

```bash
git clone https://github.com/sesquicadaver/oh-my-codex-cursor.git
cd oh-my-codex-cursor
npm install
npm run build
npm install -g .
omx setup --scope user --install-mode legacy
omx cursor init --write
omx cursor doctor
omx doctor
```

If `which omx` still points at an older global install, install into the prefix that owns that binary (this checkout’s `npm` may use a different prefix than nvm). Then reopen Cursor so Agent reloads skills and MCP.

Preview first with `omx cursor init` (no `--write`). Use `--scope project` to write `.cursor/` inside a repo. Use `--force` only to retarget broken skill **symlinks**; it never deletes a real skill directory.

### Official Codex-first OMX (no Cursor host)

```bash
codex --version
npm install -g oh-my-codex
```

That path is Homebrew- and npm-compatible for Codex itself. Do not run a combined `npm install -g @openai/codex oh-my-codex` over a Homebrew-owned `codex` such as `/opt/homebrew/bin/codex` (`EEXIST`). Full Codex-first setup lives in the [official README](https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md).

## A simple mental model

OMX does **not** become Cursor.

| Layer | Role |
| --- | --- |
| **Cursor Agent** | Follows `SKILL.md` + overlay; edits the workspace |
| **`omx cursor`** | Installs the bridge (links, overlay, safe MCP) |
| **`omx … --json`** | Durable authority (wiki, doctor, setup, …) |
| **Codex + OMX CLI/tmux** | Runtime-gated loops (`$team`, `$ralph`, `$autopilot`, …) |

Canonical OMX loop remains `$deep-interview` → `$ralplan` → `$ultragoal` (+ `$team`) → `$code-review` → `$ultraqa`. In Cursor, host-safe steps are instruction-only. `$ultragoal` is partial (Codex goal artifacts). `$team` / `$ralph` / `$autopilot` stay on the CLI host.

## Start here if you are new

1. Build this clone and put its `omx` on `PATH` (`npm run build` then `npm install -g .`).
2. Keep filesystem skills: `omx setup --scope user --install-mode legacy`.
3. Write the bridge: `omx cursor init --write`.
4. Confirm: `omx cursor status --json`, `omx cursor doctor`, `omx doctor`.
5. In Cursor, follow host-safe `$skill` files as instructions; use `omx … --json` for durable work.
6. For `$autopilot` / `$ralph` / `$team` / `$ultraqa` / `$pipeline`, launch OMX CLI from a shell (tmux runtime). They are not directly available as Cursor-only loops, including in Codex App or outside-tmux sessions.

## Skill fitness

Every installable catalog skill is classified once. Counts are locked in `src/cursor-host/classification.ts`.

| Class | Cursor Agent |
| --- | --- |
| **Host-safe** (14) | Follow `SKILL.md` |
| **Partial** (8) | Useful text/CLI; Codex artifacts, HUD, or cancel do not map 1:1 |
| **Runtime-gated** (7) | OMX CLI / tmux / hooks only |

**Host-safe:** `$ai-slop-cleaner` `$analyze` `$ask` `$best-practice-research` `$code-review` `$configure-notifications` `$design` `$doctor` `$omx-setup` `$plan` `$prometheus-strict` `$ralplan` `$skill` `$wiki`

**Partial:** `$autoresearch` `$autoresearch-goal` `$cancel` `$deep-interview` `$hud` `$performance-goal` `$ultragoal` `$visual-ralph`

**Runtime-gated:** `$autopilot` `$pipeline` `$ralph` `$team` `$ultraqa` `$ultrawork` `$worker`

Anti-pattern: treating `$autopilot` or `$ralph` as a Cursor Agent loop “because the skill file is linked.”

## `omx cursor`

| Command | Writes? | Behavior |
| --- | --- | --- |
| `omx cursor init` | no | Plan links, overlay, MCP merge |
| `omx cursor init --write` | yes | Materialize the plan |
| `omx cursor init --write --force` | yes | Replace broken/retargetable **symlinks**; rewrite planned MCP servers |
| `omx cursor status --json` | no | Overlay, links, MCP evidence |
| `omx cursor doctor` | no | Missing overlay, broken links, unsafe MCP |

| `--scope` | Skills | Overlay | Rule | MCP |
| --- | --- | --- | --- | --- |
| `user` (default) | `~/.cursor/skills/<skill>` → `$CODEX_HOME/skills/<skill>` | `~/.cursor/skills/omx-cursor-host/` | none | `~/.cursor/mcp.json` |
| `project` | `<cwd>/.cursor/skills/<skill>` | same under `<cwd>/.cursor/` | `.cursor/rules/omx-cursor-host.mdc` | `<cwd>/.cursor/mcp.json` |

Skipped directory names: `.system`, `workflows`, `omx-cursor-host`. Invalid `mcp.json` is left untouched. Unrelated MCP servers are preserved.

Default MCP:

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

`--mcp wiki` also adds `omx_wiki` (writes share `omx_wiki/` with Codex). `--mcp none` adds no OMX servers. Never registers `omx_state` or `omx_hermes`. Unset `OMX_SESSION_ID` on those servers would write into a live Codex session.

`omx doctor` on this clone includes a **Cursor host** check. Plugin-mode setup fails it.

## Inherited OMX

This tree still contains the full OMX CLI (team, HUD, ultragoal, hooks). That behavior is owned by official OMX. For Codex-first launch, madmax/worktree policy, plugin marketplace, and operator troubleshooting, read the [official README](https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md).

Runtime-gated skills require OMX CLI runtime support. In Cursor Agent, Codex App, or outside-tmux sessions they are not directly available; launch OMX CLI from shell first if you actually want tmux-runtime execution.

## Documentation

- [Cursor host (`omx cursor`)](./docs/cursor-host.md)
- [Cursor host living spec](./docs/cursor-host-tz-matrix.md)
- [CLI-first MCP taxonomy](./docs/architecture/cli-first-mcp-taxonomy.md)
- [Official OMX README](https://github.com/Yeachan-Heo/oh-my-codex/blob/main/README.md)
- [Contributing](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

Localized files under `docs/readme/` still describe Codex-first OMX and are **not** translations of this Cursor-host README. English here is the source of truth for the clone.

## License

MIT, same as official OMX.
