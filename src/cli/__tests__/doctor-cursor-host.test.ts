import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { checkCursorHost } from "../doctor-cursor-host.js";

describe("checkCursorHost", () => {
	it("warns when Cursor traces are absent", async () => {
		const root = await mkdtemp(join(tmpdir(), "omx-doctor-cursor-absent-"));
		try {
			const check = checkCursorHost({
				cwd: join(root, "project"),
				homedir: join(root, "home"),
				codexHome: join(root, "home", ".codex"),
			});
			assert.equal(check.name, "Cursor host");
			assert.equal(check.status, "warn");
			assert.match(check.message, /Cursor host unused/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("fails when plugin mode is persisted", async () => {
		const root = await mkdtemp(join(tmpdir(), "omx-doctor-cursor-plugin-"));
		try {
			mkdirSync(join(root, "home", ".cursor"), { recursive: true });
			writeFileSync(
				join(root, "home", ".cursor", "mcp.json"),
				`${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
			);
			const check = checkCursorHost({
				cwd: join(root, "project"),
				homedir: join(root, "home"),
				codexHome: join(root, "home", ".codex"),
				installMode: "plugin",
			});
			assert.equal(check.status, "fail");
			assert.match(check.message, /plugin_mode_blocks_filesystem_skills/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
