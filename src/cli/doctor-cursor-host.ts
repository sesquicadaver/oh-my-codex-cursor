/**
 * Map Cursor-host doctor evidence into a single `omx doctor` check.
 *
 * Missing Cursor traces warn on this fork (Cursor+OMX is the reason it exists)
 * but do not fail Codex-only layouts. Plugin mode fails because it archives
 * the filesystem skill bridge Cursor Agent actually reads.
 */

import { homedir } from "node:os";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	type CursorHostContext,
	type CursorHostDoctorReport,
	type CursorHostInstallMode,
	buildCursorHostDoctor,
	isCursorHostInUse,
} from "../cursor-host/index.js";
import { codexHome } from "../utils/paths.js";

export interface CursorHostDoctorCheck {
	name: string;
	status: "pass" | "warn" | "fail";
	message: string;
}

export interface CheckCursorHostInput {
	cwd: string;
	homedir?: string;
	codexHome?: string;
	installMode?: CursorHostInstallMode;
	now?: Date;
}

function worstStatus(
	left: CursorHostDoctorCheck["status"],
	right: CursorHostDoctorCheck["status"],
): CursorHostDoctorCheck["status"] {
	if (left === "fail" || right === "fail") return "fail";
	if (left === "warn" || right === "warn") return "warn";
	return "pass";
}

function summarizeReport(report: CursorHostDoctorReport): CursorHostDoctorCheck {
	const errors = report.issues.filter((issue) => issue.severity === "error");
	const status: CursorHostDoctorCheck["status"] = report.healthy
		? "pass"
		: errors.length > 0
			? "fail"
			: "warn";
	const codes = [...new Set(report.issues.map((issue) => issue.code))].join(", ");
	const detail = codes ? ` [${codes}]` : "";
	return {
		name: "Cursor host",
		status,
		message: `${report.summary}${detail}. Details: omx cursor doctor --json`,
	};
}

function contextFrom(
	input: CheckCursorHostInput,
	scope: CursorHostContext["scope"],
): CursorHostContext {
	return {
		cwd: input.cwd,
		homedir: input.homedir ?? homedir(),
		codexHome: input.codexHome ?? codexHome(),
		scope,
		mcpTargets: ["trace"],
		write: false,
		force: false,
		now: input.now ?? new Date(),
		omxCommand: "omx",
		installMode: input.installMode,
	};
}

export function checkCursorHost(
	input: CheckCursorHostInput,
): CursorHostDoctorCheck {
	const home = input.homedir ?? homedir();
	const inUse = isCursorHostInUse(home, input.cwd);

	if (input.installMode === "plugin") {
		const report = buildCursorHostDoctor(contextFrom(input, "user"));
		return summarizeReport(report);
	}

	if (!inUse) {
		return {
			name: "Cursor host",
			status: "warn",
			message:
				"Cursor host unused (no ~/.cursor or .cursor traces). Run omx cursor init --write to bridge OMX filesystem skills into Cursor Agent.",
		};
	}

	const userReport = buildCursorHostDoctor(contextFrom(input, "user"));
	let status = summarizeReport(userReport);
	if (existsSync(join(input.cwd, ".cursor"))) {
		const projectReport = buildCursorHostDoctor(contextFrom(input, "project"));
		const projectCheck = summarizeReport(projectReport);
		status = {
			name: "Cursor host",
			status: worstStatus(status.status, projectCheck.status),
			message: `${userReport.summary}; project: ${projectReport.summary}. Details: omx cursor doctor --json`,
		};
		if (status.status !== "pass") {
			const codes = [
				...userReport.issues,
				...projectReport.issues,
			].map((issue) => issue.code);
			const unique = [...new Set(codes)];
			if (unique.length > 0) {
				status.message = `${status.message} [${unique.join(", ")}]`;
			}
		}
	}
	return status;
}
