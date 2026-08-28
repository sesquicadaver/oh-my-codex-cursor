/**
 * Preview or write Cursor-host install artifacts.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
	type CursorHostContext,
	type CursorHostInitResult,
	type CursorHostInstallState,
	CURSOR_HOST_SCHEMA_VERSION,
	toIsoTimestamp,
} from "./contracts.js";
import { planCursorMcpMerge, renderCursorMcpDocument } from "./mcp.js";
import {
	renderCursorHostOverlayRule,
	renderCursorHostOverlaySkill,
} from "./overlay.js";
import { resolveCursorHostPaths } from "./paths.js";
import { applyCursorSkillLink, planCursorSkillLinks } from "./skills.js";

function collectPreviewPaths(
	result: Omit<CursorHostInitResult, "previewPaths" | "wrotePaths" | "summary">,
): string[] {
	const paths = [
		result.paths.cursorSkillsDir,
		result.overlay.skillPath,
		result.overlay.installStatePath,
		result.mcp.path,
	];
	if (result.overlay.rulePath) paths.push(result.overlay.rulePath);
	for (const skill of result.skills) {
		if (skill.action === "link" || skill.action === "replace") {
			paths.push(skill.destinationPath);
		}
	}
	return paths;
}

export function initCursorHost(
	context: CursorHostContext,
): CursorHostInitResult {
	const paths = resolveCursorHostPaths(context);
	const skills = planCursorSkillLinks(paths, context);
	const mcp = planCursorMcpMerge(paths, context);
	const timestamp = toIsoTimestamp(context.now);
	const linkedSkills = skills
		.filter(
			(skill) =>
				skill.action === "link" ||
				skill.action === "replace" ||
				skill.action === "unchanged",
		)
		.map((skill) => skill.name);

	const overlay = {
		skillPath: paths.overlaySkillPath,
		rulePath: paths.overlayRulePath,
		installStatePath: paths.installStatePath,
	};

	const base = {
		schemaVersion: CURSOR_HOST_SCHEMA_VERSION,
		timestamp,
		scope: context.scope,
		write: context.write,
		force: context.force,
		paths,
		overlay,
		skills,
		mcp,
	};
	const previewPaths = collectPreviewPaths(base);
	const wrotePaths: string[] = [];

	if (context.write) {
		mkdirSync(paths.overlayDir, { recursive: true });
		writeFileSync(
			paths.overlaySkillPath,
			renderCursorHostOverlaySkill(),
			"utf8",
		);
		wrotePaths.push(paths.overlaySkillPath);

		if (paths.overlayRulePath && paths.cursorRulesDir) {
			mkdirSync(paths.cursorRulesDir, { recursive: true });
			writeFileSync(
				paths.overlayRulePath,
				renderCursorHostOverlayRule(),
				"utf8",
			);
			wrotePaths.push(paths.overlayRulePath);
		}

		mkdirSync(paths.cursorSkillsDir, { recursive: true });
		for (const plan of skills) {
			const wrote = applyCursorSkillLink(plan);
			if (wrote) wrotePaths.push(wrote);
		}

		if (mcp.valid && mcp.nextDocument) {
			mkdirSync(dirname(paths.cursorMcpPath), { recursive: true });
			writeFileSync(
				paths.cursorMcpPath,
				renderCursorMcpDocument(mcp.nextDocument),
				"utf8",
			);
			wrotePaths.push(paths.cursorMcpPath);
		}

		const installState: CursorHostInstallState = {
			schemaVersion: CURSOR_HOST_SCHEMA_VERSION,
			ownedBy: "oh-my-codex",
			surface: "cursor-host",
			scope: context.scope,
			installedAt: timestamp,
			mcpServers: mcp.plannedServers,
			linkedSkills,
		};
		writeFileSync(
			paths.installStatePath,
			`${JSON.stringify(installState, null, 2)}\n`,
			"utf8",
		);
		wrotePaths.push(paths.installStatePath);
	}

	const linkedCount = skills.filter(
		(skill) => skill.action === "link" || skill.action === "replace",
	).length;
	const skippedCount = skills.filter((skill) => skill.action === "skip").length;
	const summary = context.write
		? `Cursor host ${context.scope} install wrote overlay, ${linkedCount} skill link(s), and MCP plan (${mcp.plannedServers.join(", ") || "none"}).`
		: `Cursor host ${context.scope} preview is ready (${linkedCount} skill link(s) planned, ${skippedCount} skipped). Rerun with --write to materialize.`;

	return {
		...base,
		summary,
		previewPaths,
		wrotePaths,
	};
}
