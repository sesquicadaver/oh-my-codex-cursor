/**
 * Live Cursor-host status from filesystem evidence.
 */

import { existsSync, readFileSync } from "node:fs";
import { classifyCursorSkill } from "./classification.js";
import {
	CURSOR_HOST_SCHEMA_VERSION,
	type CursorHostContext,
	type CursorHostInstallState,
	type CursorHostStatusReport,
	type CursorSkillClassification,
	toIsoTimestamp,
} from "./contracts.js";
import { planCursorMcpMerge } from "./mcp.js";
import { resolveCursorHostPaths } from "./paths.js";
import {
	listCursorHostSourceSkills,
	planCursorSkillLinks,
} from "./skills.js";

function emptyClassificationBuckets(): Record<
	CursorSkillClassification,
	string[]
> {
	return {
		"host-safe": [],
		partial: [],
		"runtime-gated": [],
		unclassified: [],
	};
}

function readInstallState(
	path: string,
): CursorHostInstallState | null {
	if (!existsSync(path)) return null;
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			(parsed as { surface?: unknown }).surface !== "cursor-host"
		) {
			return null;
		}
		return parsed as CursorHostInstallState;
	} catch {
		return null;
	}
}

export function buildCursorHostStatus(
	context: CursorHostContext,
): CursorHostStatusReport {
	const paths = resolveCursorHostPaths(context);
	const skills = planCursorSkillLinks(paths, context);
	const mcp = planCursorMcpMerge(paths, context);
	const byClassification = emptyClassificationBuckets();
	const linked: string[] = [];
	const missing: string[] = [];
	const broken: string[] = [];
	const conflicts: string[] = [];

	for (const skill of skills) {
		byClassification[skill.classification].push(skill.name);
		if (skill.action === "unchanged" || skill.action === "replace") {
			linked.push(skill.name);
			continue;
		}
		if (skill.action === "link") {
			missing.push(skill.name);
			continue;
		}
		if (skill.reason === "broken-symlink") {
			broken.push(skill.name);
			continue;
		}
		if (
			skill.reason === "conflict-directory" ||
			skill.reason === "conflict-file" ||
			skill.reason === "different-target"
		) {
			conflicts.push(skill.name);
		}
	}

	for (const name of listCursorHostSourceSkills(paths)) {
		if (!byClassification[classifyCursorSkill(name)].includes(name)) {
			byClassification[classifyCursorSkill(name)].push(name);
		}
	}

	const overlayPresent = existsSync(paths.overlaySkillPath);
	const sourceCount = listCursorHostSourceSkills(paths).length;
	const summary = overlayPresent
		? `Cursor host overlay is present for ${context.scope} scope with ${linked.length}/${sourceCount} OMX skills linked.`
		: `Cursor host overlay is not installed for ${context.scope} scope.`;

	return {
		schemaVersion: CURSOR_HOST_SCHEMA_VERSION,
		timestamp: toIsoTimestamp(context.now),
		scope: context.scope,
		summary,
		paths,
		overlay: {
			present: overlayPresent,
			skillPath: paths.overlaySkillPath,
			rulePath: paths.overlayRulePath,
			installStatePath: paths.installStatePath,
			installState: readInstallState(paths.installStatePath),
		},
		skills: {
			sourceCount,
			linked,
			missing,
			broken,
			conflicts,
			byClassification,
		},
		mcp,
	};
}
