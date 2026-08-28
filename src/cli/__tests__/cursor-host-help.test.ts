import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function runOmx(cwd: string, argv: string[]) {
	const testDir = dirname(fileURLToPath(import.meta.url));
	const repoRoot = join(testDir, "..", "..", "..");
	const omxBin = join(repoRoot, "dist", "cli", "omx.js");
	return spawnSync(process.execPath, [omxBin, ...argv], {
		cwd,
		encoding: "utf-8",
		env: {
			...process.env,
			OMX_AUTO_UPDATE: "0",
			OMX_NOTIFY_FALLBACK: "0",
			OMX_HOOK_DERIVED_SIGNALS: "0",
		},
	});
}

describe("omx cursor help", () => {
	it("documents cursor in top-level help and routes cursor-local help output", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "omx-cursor-help-"));
		try {
			const mainHelp = runOmx(cwd, ["--help"]);
			assert.equal(mainHelp.status, 0, mainHelp.stderr || mainHelp.stdout);
			assert.match(
				mainHelp.stdout,
				/omx cursor\s+Install OMX filesystem skills and a host-safe overlay into Cursor Agent/i,
			);

			const cursorHelp = runOmx(cwd, ["cursor", "--help"]);
			assert.equal(cursorHelp.status, 0, cursorHelp.stderr || cursorHelp.stdout);
			assert.match(
				cursorHelp.stdout,
				/Usage: omx cursor <init\|status\|doctor>/i,
			);
			assert.doesNotMatch(
				cursorHelp.stdout,
				/oh-my-codex \(omx\) - Multi-agent orchestration for Codex CLI/i,
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
