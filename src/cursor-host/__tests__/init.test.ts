import assert from "node:assert/strict";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	readlinkSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import type { CursorHostContext } from "../contracts.js";
import {
	buildCursorHostDoctor,
	initCursorHost,
	renderCursorHostOverlaySkill,
} from "../index.js";

const NOW = new Date("2026-08-28T09:00:00.000Z");

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

function writeSkill(skillsDir: string, name: string): string {
	const skillDir = join(skillsDir, name);
	mkdirSync(skillDir, { recursive: true });
	writeFileSync(join(skillDir, "SKILL.md"), `# ${name}\n`, "utf8");
	return skillDir;
}

describe("cursor-host init/status/doctor", () => {
	const roots: string[] = [];

	afterEach(async () => {
		await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
	});

	async function tempRoot(): Promise<string> {
		const root = await mkdtemp(join(tmpdir(), "omx-cursor-host-"));
		roots.push(root);
		mkdirSync(join(root, "project"), { recursive: true });
		mkdirSync(join(root, "home"), { recursive: true });
		return root;
	}

	it("previews without writing files", async () => {
		const root = await tempRoot();
		writeSkill(join(root, "home", ".codex", "skills"), "analyze");
		const result = initCursorHost(makeContext(root));
		assert.equal(result.write, false);
		assert.equal(result.wrotePaths.length, 0);
		assert.equal(
			existsSync(join(root, "home", ".cursor", "skills", "omx-cursor-host")),
			false,
		);
		assert.equal(result.skills[0]?.action, "link");
		assert.equal(result.skills[0]?.name, "analyze");
	});

	it("writes overlay, skill symlink, and omx_trace without adding unsafe MCP", async () => {
		const root = await tempRoot();
		writeSkill(join(root, "home", ".codex", "skills"), "analyze");
		writeSkill(join(root, "home", ".codex", "skills"), "ralph");
		mkdirSync(join(root, "home", ".cursor"), { recursive: true });
		writeFileSync(
			join(root, "home", ".cursor", "mcp.json"),
			`${JSON.stringify({
				mcpServers: {
					github: { command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
				},
			}, null, 2)}\n`,
			"utf8",
		);

		const result = initCursorHost(makeContext(root, { write: true }));
		assert.ok(result.wrotePaths.length > 0);

		const overlayPath = join(
			root,
			"home",
			".cursor",
			"skills",
			"omx-cursor-host",
			"SKILL.md",
		);
		assert.equal(
			readFileSync(overlayPath, "utf8"),
			renderCursorHostOverlaySkill(),
		);

		const analyzeLink = join(root, "home", ".cursor", "skills", "analyze");
		assert.equal(lstatSync(analyzeLink).isSymbolicLink(), true);
		assert.equal(
			readlinkSync(analyzeLink),
			join(root, "home", ".codex", "skills", "analyze"),
		);

		const mcp = JSON.parse(
			readFileSync(join(root, "home", ".cursor", "mcp.json"), "utf8"),
		) as {
			mcpServers: Record<string, { command: string; args: string[] }>;
		};
		assert.deepEqual(mcp.mcpServers.omx_trace, {
			command: "omx",
			args: ["mcp-serve", "trace"],
		});
		assert.ok(mcp.mcpServers.github);
		assert.equal(mcp.mcpServers.omx_state, undefined);
		assert.equal(mcp.mcpServers.omx_hermes, undefined);
		assert.equal(mcp.mcpServers.omx_wiki, undefined);
	});

	it("skips a real Cursor skill directory and does not delete it", async () => {
		const root = await tempRoot();
		writeSkill(join(root, "home", ".codex", "skills"), "analyze");
		const conflictDir = join(root, "home", ".cursor", "skills", "analyze");
		mkdirSync(conflictDir, { recursive: true });
		writeFileSync(join(conflictDir, "SKILL.md"), "# user owned\n", "utf8");

		const result = initCursorHost(makeContext(root, { write: true, force: true }));
		const analyzePlan = result.skills.find((skill) => skill.name === "analyze");
		assert.equal(analyzePlan?.action, "skip");
		assert.equal(analyzePlan?.reason, "conflict-directory");
		assert.equal(readFileSync(join(conflictDir, "SKILL.md"), "utf8"), "# user owned\n");
		assert.equal(lstatSync(conflictDir).isSymbolicLink(), false);
	});

	it("replaces a broken skill symlink only with --force", async () => {
		const root = await tempRoot();
		const source = writeSkill(join(root, "home", ".codex", "skills"), "wiki");
		const dest = join(root, "home", ".cursor", "skills", "wiki");
		mkdirSync(join(root, "home", ".cursor", "skills"), { recursive: true });
		symlinkSync(join(root, "missing-wiki"), dest);

		const skipped = initCursorHost(makeContext(root, { write: true }));
		assert.equal(
			skipped.skills.find((skill) => skill.name === "wiki")?.action,
			"skip",
		);

		const replaced = initCursorHost(
			makeContext(root, { write: true, force: true }),
		);
		assert.equal(
			replaced.skills.find((skill) => skill.name === "wiki")?.action,
			"replace",
		);
		assert.equal(readlinkSync(dest), source);
	});

	it("writes a project rule and flags unsafe MCP in doctor", async () => {
		const root = await tempRoot();
		writeSkill(join(root, "home", ".codex", "skills"), "plan");
		mkdirSync(join(root, "project", ".cursor"), { recursive: true });
		writeFileSync(
			join(root, "project", ".cursor", "mcp.json"),
			`${JSON.stringify({
				mcpServers: {
					omx_state: { command: "omx", args: ["mcp-serve", "state"] },
					omx_hermes: { command: "omx", args: ["mcp-serve", "hermes"] },
				},
			}, null, 2)}\n`,
			"utf8",
		);

		initCursorHost(
			makeContext(root, {
				scope: "project",
				write: true,
				mcpTargets: ["trace", "wiki"],
			}),
		);

		assert.equal(
			existsSync(
				join(root, "project", ".cursor", "rules", "omx-cursor-host.mdc"),
			),
			true,
		);

		const mcp = JSON.parse(
			readFileSync(join(root, "project", ".cursor", "mcp.json"), "utf8"),
		) as { mcpServers: Record<string, unknown> };
		assert.ok(mcp.mcpServers.omx_trace);
		assert.ok(mcp.mcpServers.omx_wiki);
		assert.ok(mcp.mcpServers.omx_state);
		assert.ok(mcp.mcpServers.omx_hermes);

		const doctor = buildCursorHostDoctor(
			makeContext(root, { scope: "project", mcpTargets: ["trace", "wiki"] }),
		);
		assert.equal(doctor.healthy, false);
		assert.ok(
			doctor.issues.some((issue) => issue.code === "unsafe_mcp_server"),
		);
		assert.deepEqual(
			doctor.status.mcp.unsafeServers,
			["omx_hermes", "omx_state"],
		);
	});

	it("does not overwrite invalid mcp.json", async () => {
		const root = await tempRoot();
		writeSkill(join(root, "home", ".codex", "skills"), "ask");
		mkdirSync(join(root, "home", ".cursor"), { recursive: true });
		writeFileSync(join(root, "home", ".cursor", "mcp.json"), "{not-json", "utf8");

		const result = initCursorHost(makeContext(root, { write: true }));
		assert.equal(result.mcp.valid, false);
		assert.equal(readFileSync(join(root, "home", ".cursor", "mcp.json"), "utf8"), "{not-json");
		assert.equal(
			result.wrotePaths.includes(join(root, "home", ".cursor", "mcp.json")),
			false,
		);
	});
});
