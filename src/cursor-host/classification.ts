/**
 * Cursor-host skill classification for the active OMX catalog.
 *
 * Host-safe skills are instruction-only and work in Cursor Agent without
 * Codex hooks, tmux, or `/goal` runtime. Partial skills have a useful
 * text/CLI path but depend on Codex-native artifacts or assumptions.
 * Runtime-gated skills require OMX CLI/tmux/hooks and must not be treated
 * as Cursor-native loops.
 */

import type { CursorSkillClassification } from "./contracts.js";

export const CURSOR_HOST_SAFE_SKILLS = [
	"ai-slop-cleaner",
	"analyze",
	"ask",
	"best-practice-research",
	"code-review",
	"configure-notifications",
	"design",
	"doctor",
	"omx-setup",
	"plan",
	"prometheus-strict",
	"ralplan",
	"skill",
	"wiki",
] as const;

export const CURSOR_PARTIAL_SKILLS = [
	"autoresearch",
	"autoresearch-goal",
	"cancel",
	"deep-interview",
	"hud",
	"performance-goal",
	"ultragoal",
	"visual-ralph",
] as const;

export const CURSOR_RUNTIME_GATED_SKILLS = [
	"autopilot",
	"pipeline",
	"ralph",
	"team",
	"ultraqa",
	"ultrawork",
	"worker",
] as const;

const HOST_SAFE = new Set<string>(CURSOR_HOST_SAFE_SKILLS);
const PARTIAL = new Set<string>(CURSOR_PARTIAL_SKILLS);
const RUNTIME_GATED = new Set<string>(CURSOR_RUNTIME_GATED_SKILLS);

export function classifyCursorSkill(name: string): CursorSkillClassification {
	if (HOST_SAFE.has(name)) return "host-safe";
	if (PARTIAL.has(name)) return "partial";
	if (RUNTIME_GATED.has(name)) return "runtime-gated";
	return "unclassified";
}

export function cursorSkillClassificationSets(): {
	hostSafe: Set<string>;
	partial: Set<string>;
	runtimeGated: Set<string>;
} {
	return {
		hostSafe: new Set(HOST_SAFE),
		partial: new Set(PARTIAL),
		runtimeGated: new Set(RUNTIME_GATED),
	};
}
