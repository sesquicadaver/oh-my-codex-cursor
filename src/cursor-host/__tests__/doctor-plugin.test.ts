import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { buildCursorHostDoctor } from "../index.js";
import type { CursorHostContext } from "../contracts.js";

const NOW = new Date("2026-08-28T12:00:00.000Z");

function makeContext(
	root: string,
	overrides: Partial<CursorHostContext> = {},
): CursorHostContext {
	return {
		cwd: join(root, "project"),
		homedir: join(root, "home"),
		codexHome: join(root, "home", ".codex"),
		scope: "user",
		mcpTargets: ["trace"],
		write: false,
		force: false,
		now: NOW,
		omxCommand: "omx",
		...overrides,
	};
}

describe("cursor-host doctor plugin mode", () => {
	it("fails when setup install mode is plugin", async () => {
		const root = await mkdtemp(join(tmpdir(), "omx-cursor-plugin-"));
		try {
			mkdirSync(join(root, "project"), { recursive: true });
			mkdirSync(join(root, "home"), { recursive: true });
			const report = buildCursorHostDoctor(
				makeContext(root, { installMode: "plugin" }),
			);
			assert.equal(report.healthy, false);
			assert.ok(
				report.issues.some(
					(issue) => issue.code === "plugin_mode_blocks_filesystem_skills",
				),
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
