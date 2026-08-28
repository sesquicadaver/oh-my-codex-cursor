/**
 * Plan and apply OMX skill symlinks into Cursor skill directories.
 *
 * Existing non-symlink directories are never deleted. Broken or
 * retargetable symlinks are replaced only with `--force`.
 */

import {
	existsSync,
	lstatSync,
	readdirSync,
	readlinkSync,
	realpathSync,
	symlinkSync,
	unlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { classifyCursorSkill } from "./classification.js";
import {
	CURSOR_SKIP_SKILL_DIRECTORY_NAMES,
	type CursorHostContext,
	type CursorHostPaths,
	type CursorSkillLinkPlan,
} from "./contracts.js";

function skillMarkdownPath(skillDir: string): string {
	return join(skillDir, "SKILL.md");
}

function isSkillDirectory(skillDir: string): boolean {
	if (!existsSync(skillDir)) return false;
	try {
		const stat = lstatSync(skillDir);
		if (!stat.isDirectory() && !stat.isSymbolicLink()) return false;
	} catch {
		return false;
	}
	return existsSync(skillMarkdownPath(skillDir));
}

function listSkillNames(skillsDir: string): string[] {
	if (!existsSync(skillsDir)) return [];
	const names: string[] = [];
	for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
		if (CURSOR_SKIP_SKILL_DIRECTORY_NAMES.has(entry.name)) continue;
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (!isSkillDirectory(join(skillsDir, entry.name))) continue;
		names.push(entry.name);
	}
	return names.sort();
}

function resolveSkillSource(
	name: string,
	paths: CursorHostPaths,
	scope: CursorHostPaths["scope"],
): string | null {
	const projectCandidate = join(paths.projectSkillsDir, name);
	const userCandidate = join(paths.userSkillsDir, name);
	if (scope === "project" && isSkillDirectory(projectCandidate)) {
		return resolve(projectCandidate);
	}
	if (isSkillDirectory(userCandidate)) {
		return resolve(userCandidate);
	}
	if (scope === "user" && isSkillDirectory(projectCandidate)) {
		return resolve(projectCandidate);
	}
	return null;
}

function currentSymlinkTarget(destinationPath: string): string | null {
	try {
		const stat = lstatSync(destinationPath);
		if (!stat.isSymbolicLink()) return null;
		const raw = readlinkSync(destinationPath);
		return resolve(destinationPath, "..", raw);
	} catch {
		return null;
	}
}

function samePath(left: string, right: string): boolean {
	try {
		return realpathSync(left) === realpathSync(right);
	} catch {
		return resolve(left) === resolve(right);
	}
}

export function listCursorHostSourceSkills(paths: CursorHostPaths): string[] {
	const names = new Set([
		...listSkillNames(paths.userSkillsDir),
		...listSkillNames(paths.projectSkillsDir),
	]);
	return [...names].sort();
}

export function planCursorSkillLinks(
	paths: CursorHostPaths,
	context: Pick<CursorHostContext, "scope" | "force">,
): CursorSkillLinkPlan[] {
	const names = listCursorHostSourceSkills(paths);
	return names.map((name) => {
		const sourcePath = resolveSkillSource(name, paths, context.scope);
		const destinationPath = join(paths.cursorSkillsDir, name);
		const classification = classifyCursorSkill(name);

		if (!sourcePath) {
			return {
				name,
				classification,
				sourcePath: null,
				destinationPath,
				action: "skip",
				reason: "missing-source",
				currentTarget: null,
			};
		}

		let destinationStat;
		try {
			destinationStat = lstatSync(destinationPath);
		} catch {
			return {
				name,
				classification,
				sourcePath,
				destinationPath,
				action: "link",
				reason: null,
				currentTarget: null,
			};
		}

		if (destinationStat.isSymbolicLink()) {
			const currentTarget = currentSymlinkTarget(destinationPath);
			const targetExists = currentTarget ? existsSync(currentTarget) : false;
			if (currentTarget && targetExists && samePath(currentTarget, sourcePath)) {
				return {
					name,
					classification,
					sourcePath,
					destinationPath,
					action: "unchanged",
					reason: null,
					currentTarget,
				};
			}
			if (context.force) {
				return {
					name,
					classification,
					sourcePath,
					destinationPath,
					action: "replace",
					reason: targetExists ? "different-target" : "broken-symlink",
					currentTarget,
				};
			}
			return {
				name,
				classification,
				sourcePath,
				destinationPath,
				action: "skip",
				reason: targetExists ? "different-target" : "broken-symlink",
				currentTarget,
			};
		}

		if (destinationStat.isDirectory()) {
			return {
				name,
				classification,
				sourcePath,
				destinationPath,
				action: "skip",
				reason: "conflict-directory",
				currentTarget: null,
			};
		}

		return {
			name,
			classification,
			sourcePath,
			destinationPath,
			action: "skip",
			reason: "conflict-file",
			currentTarget: null,
		};
	});
}

export function applyCursorSkillLink(plan: CursorSkillLinkPlan): string | null {
	if (plan.action !== "link" && plan.action !== "replace") {
		return null;
	}
	if (!plan.sourcePath) return null;
	if (plan.action === "replace") {
		unlinkSync(plan.destinationPath);
	}
	symlinkSync(plan.sourcePath, plan.destinationPath, "dir");
	return plan.destinationPath;
}
