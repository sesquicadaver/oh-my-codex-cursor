/**
 * Diagnose Cursor-host install health without mutating files.
 */

import { existsSync } from "node:fs";
import {
	CURSOR_HOST_SCHEMA_VERSION,
	type CursorHostContext,
	type CursorHostDoctorIssue,
	type CursorHostDoctorReport,
	toIsoTimestamp,
} from "./contracts.js";
import { buildCursorHostStatus } from "./status.js";

export function buildCursorHostDoctor(
	context: CursorHostContext,
): CursorHostDoctorReport {
	const status = buildCursorHostStatus(context);
	const issues: CursorHostDoctorIssue[] = [];

	if (!existsSync(status.paths.userSkillsDir) && status.skills.sourceCount === 0) {
		issues.push({
			code: "omx_skills_dir_missing",
			severity: "error",
			message: `No OMX skill directories were found at ${status.paths.userSkillsDir} or ${status.paths.projectSkillsDir}. Run omx setup --scope user --install-mode legacy before Cursor bridging.`,
		});
	}

	if (!status.overlay.present) {
		issues.push({
			code: "overlay_missing",
			severity: "error",
			message: `Cursor host overlay is missing at ${status.overlay.skillPath}.`,
		});
	}

	if (
		status.paths.overlayRulePath &&
		status.scope === "project" &&
		!existsSync(status.paths.overlayRulePath)
	) {
		issues.push({
			code: "project_rule_missing",
			severity: "warning",
			message: `Project Cursor rule is missing at ${status.paths.overlayRulePath}.`,
		});
	}

	for (const name of status.skills.missing) {
		issues.push({
			code: "skill_not_linked",
			severity: "warning",
			message: `OMX skill "${name}" is not linked into ${status.paths.cursorSkillsDir}.`,
		});
	}

	for (const name of status.skills.broken) {
		issues.push({
			code: "skill_broken_symlink",
			severity: "error",
			message: `Cursor skill "${name}" is a broken symlink. Rerun omx cursor init --write --force.`,
		});
	}

	for (const name of status.skills.conflicts) {
		issues.push({
			code: "skill_conflict",
			severity: "warning",
			message: `Cursor skill "${name}" exists and was not replaced. OMX never overwrites a non-symlink skill directory.`,
		});
	}

	if (!status.mcp.valid) {
		issues.push({
			code: "mcp_json_invalid",
			severity: "error",
			message: `Cursor MCP file at ${status.mcp.path} is not valid JSON (${status.mcp.parseError ?? "parse error"}). OMX will not overwrite it.`,
		});
	}

	for (const name of status.mcp.unsafeServers) {
		issues.push({
			code: "unsafe_mcp_server",
			severity: "error",
			message: `Cursor MCP registers ${name}, which can mutate live Codex session/Hermes state. Remove it from Cursor; keep CLI/JSON as the authority.`,
		});
	}

	for (const name of status.mcp.cautionServers) {
		issues.push({
			code: "caution_mcp_server",
			severity: "warning",
			message:
				name === "omx_code_intel"
					? "omx_code_intel is registered in Cursor MCP. Search is acceptable; never call ast_grep_replace with dryRun=false from Cursor."
					: "omx_memory is registered in Cursor MCP. Keep it only if Cursor is the sole .omx writer.",
		});
	}

	if (
		status.overlay.present &&
		status.mcp.valid &&
		status.mcp.plannedServers.includes("omx_trace") &&
		status.mcp.addedServers.includes("omx_trace")
	) {
		issues.push({
			code: "trace_mcp_missing",
			severity: "warning",
			message: `Safe-default omx_trace is not present in ${status.mcp.path}.`,
		});
	}

	const errors = issues.filter((issue) => issue.severity === "error");
	const healthy = errors.length === 0 && status.overlay.present;
	const nextSteps: string[] = [];
	if (!status.overlay.present || status.skills.missing.length > 0) {
		nextSteps.push(
			`Run omx cursor init --scope ${context.scope} --write to install the overlay and missing skill links.`,
		);
	}
	if (status.skills.broken.length > 0) {
		nextSteps.push(
			`Run omx cursor init --scope ${context.scope} --write --force to replace broken skill symlinks.`,
		);
	}
	if (status.mcp.unsafeServers.length > 0) {
		nextSteps.push(
			"Remove omx_state and omx_hermes from Cursor MCP. Use omx state / omx team from the CLI instead.",
		);
	}
	if (issues.length === 0) {
		nextSteps.push("Cursor host looks healthy. Keep plugin-mode setup off if you need filesystem skill discovery.");
	}

	return {
		schemaVersion: CURSOR_HOST_SCHEMA_VERSION,
		timestamp: toIsoTimestamp(context.now),
		scope: context.scope,
		summary: healthy
			? `Cursor host doctor reports no blocking issues for ${context.scope} scope.`
			: `Cursor host doctor found ${errors.length} blocking issue(s) and ${issues.length - errors.length} warning(s) for ${context.scope} scope.`,
		healthy,
		issues,
		nextSteps,
		status,
	};
}
