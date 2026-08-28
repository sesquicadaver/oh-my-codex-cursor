import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { cursorHostCommand } from "../cursor-host.js";

describe("cursorHostCommand", () => {
	it("prints help when called without args", async () => {
		const out: string[] = [];
		await cursorHostCommand([], {
			stdout: (line) => out.push(line),
		});
		assert.match(out.join("\n"), /Usage: omx cursor <init\|status\|doctor>/i);
		assert.match(out.join("\n"), /This is not omx adapt/i);
	});

	it("fails clearly for unknown subcommands", async () => {
		await assert.rejects(
			cursorHostCommand(["probe"], { stdout: () => undefined }),
			/Supported subcommands: init, status, doctor/i,
		);
	});

	it("rejects --write outside init", async () => {
		await assert.rejects(
			cursorHostCommand(["status", "--write"], { stdout: () => undefined }),
			/only supported with omx cursor init/i,
		);
	});

	it("rejects combining --mcp none with wiki", async () => {
		await assert.rejects(
			cursorHostCommand(["init", "--mcp", "none", "--mcp", "wiki"], {
				stdout: () => undefined,
			}),
			/--mcp none cannot be combined/i,
		);
	});

	it("emits compact JSON for init preview", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "omx-cursor-cli-"));
		const out: string[] = [];
		try {
			mkdirSync(join(cwd, "home"), { recursive: true });
			mkdirSync(join(cwd, ".codex", "skills", "analyze"), { recursive: true });
			writeFileSync(
				join(cwd, ".codex", "skills", "analyze", "SKILL.md"),
				"# analyze\n",
				"utf8",
			);
			await cursorHostCommand(["init", "--json"], {
				cwd,
				homedir: join(cwd, "home"),
				codexHome: join(cwd, ".codex"),
				stdout: (line) => out.push(line),
			});
			assert.equal(out.length, 1);
			const parsed = JSON.parse(out[0] ?? "") as {
				schemaVersion: string;
				write: boolean;
				mcp: { plannedServers: string[] };
			};
			assert.equal(parsed.schemaVersion, "1.0");
			assert.equal(parsed.write, false);
			assert.deepEqual(parsed.mcp.plannedServers, ["omx_trace"]);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
