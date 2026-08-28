/**
 * OMX-owned Cursor overlay skill and project rule.
 *
 * Generated from classification lists so the overlay cannot drift from
 * the host-safe / partial / runtime-gated contract.
 */

import {
	CURSOR_HOST_SAFE_SKILLS,
	CURSOR_PARTIAL_SKILLS,
	CURSOR_RUNTIME_GATED_SKILLS,
} from "./classification.js";
import { CURSOR_HOST_OVERLAY_NAME } from "./contracts.js";

function bulletList(names: readonly string[]): string {
	return names.map((name) => `- \`$${name}\``).join("\n");
}

export function renderCursorHostOverlaySkill(): string {
	return `---
name: ${CURSOR_HOST_OVERLAY_NAME}
description: "OMX host overlay for Cursor Agent. Use when working in Cursor with OMX skills, MCP, or $autopilot/$ralph/$team. Distinguishes host-safe skills from Codex/tmux runtime-gated workflows and keeps MCP read-only."
---

# OMX Cursor host

You are running inside **Cursor Agent**, not Codex CLI. OMX remains a Codex orchestration layer. Cursor is a second host.

CLI/JSON is the durable authority. Do not treat MCP, keyword routing, or Codex \`/goal\` as Cursor-native runtime.

## Canonical loop

\`$deep-interview\` → \`$ralplan\` → \`$ultragoal\` (+ \`$team\`) → \`$code-review\` → \`$ultraqa\`

In Cursor, invoke host-safe skills as instruction text and use \`omx <command> --json\` for durable operations. Runtime-gated steps require an OMX CLI/tmux session; do not emulate them inside Cursor Agent.

## Host-safe skills

These are instruction-only and are safe to follow in Cursor Agent:

${bulletList(CURSOR_HOST_SAFE_SKILLS)}

## Partial skills

Useful as text or CLI, but they assume Codex-native artifacts, HUD/tmux, or cancel semantics that do not map 1:1 onto Cursor Agent:

${bulletList(CURSOR_PARTIAL_SKILLS)}

## Runtime-gated skills

Do **not** treat these as Cursor-native loops. They need OMX CLI, tmux, native hooks, or Codex goal mode:

${bulletList(CURSOR_RUNTIME_GATED_SKILLS)}

If the user asks for a runtime-gated workflow, tell them to run it through \`omx\` (or Codex with OMX), not as a Cursor-only Agent loop.

## MCP policy

Safe default for Cursor: **omx_trace** only.

- \`omx_wiki\` is optional and read-preferable; writes share \`omx_wiki/\` with Codex.
- Never register \`omx_state\` or \`omx_hermes\` in Cursor.
- Do not enable \`omx_memory\` unless Cursor is the sole \`.omx\` writer.
- Do not use \`omx_code_intel\` \`ast_grep_replace\` with \`dryRun=false\`.

## Do not port into Cursor

- Codex UserPromptSubmit keyword routing
- Stop-hook continuation
- Codex \`/goal\` + \`agent_type\` as Cursor runtime
- team tmux orchestration as a Cursor-native control plane
- HUD layer 1
- plugin marketplace as Cursor skill discovery

Prefer filesystem skills via \`omx cursor init --write\` (legacy Codex skill directories). Plugin mode archives \`~/.codex/skills\` and breaks this bridge.

## Owned install

This overlay is written by \`omx cursor init --write\`. Check health with \`omx cursor status --json\` and \`omx cursor doctor --json\`.
`;
}

export function renderCursorHostOverlayRule(): string {
	return `---
description: OMX Cursor host — Cursor Agent is a second host, not Codex runtime
alwaysApply: true
---

# OMX Cursor host

- Cursor Agent is not Codex CLI. Do not emulate \`$autopilot\`, \`$ralph\`, \`$ultrawork\`, \`$team\`, \`$ultraqa\`, or \`$pipeline\` as Cursor-native loops.
- Durable operations go through \`omx … --json\`. MCP is optional; default Cursor MCP is \`omx_trace\` only.
- Never add \`omx_state\` or \`omx_hermes\` to Cursor MCP. Do not mutate live Codex session state from Cursor.
- Host-safe OMX skills may be followed as instruction text. Runtime-gated skills require the OMX CLI/tmux host.
- Install and repair this overlay with \`omx cursor init --write\`; inspect with \`omx cursor doctor\`.
`;
}
