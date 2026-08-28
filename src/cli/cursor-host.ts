import { homedir } from "node:os";
import {
	CURSOR_HOST_SUBCOMMANDS,
	CURSOR_MCP_TARGETS,
	type CursorHostContext,
	type CursorHostScope,
	type CursorHostSubcommand,
	type CursorMcpEnabledTarget,
	type CursorMcpTarget,
	isCursorHostScope,
	isCursorMcpTarget,
	buildCursorHostDoctor,
	buildCursorHostStatus,
	initCursorHost,
} from "../cursor-host/index.js";
import { readPersistedSetupPreferencesSync } from "./setup-preferences.js";
import { codexHome } from "../utils/paths.js";

export const CURSOR_HOST_HELP = [
	"Usage: omx cursor <init|status|doctor> [--json] [--write] [--force] [--scope user|project] [--mcp none|trace|wiki]",
	"",
	"Install OMX filesystem skills and a host-safe overlay into Cursor Agent.",
	"This is not omx adapt: adapt observes OpenClaw/Hermes/Herdr under .omx/adapters/.",
	"Cursor Agent is a second host. Runtime-gated OMX modes still require OMX CLI/tmux.",
	"Official OMX: https://github.com/Yeachan-Heo/oh-my-codex. This clone: https://github.com/sesquicadaver/oh-my-codex-cursor.",
	"",
	"Subcommands:",
	"  init      Preview or write skill symlinks, omx-cursor-host overlay, and safe MCP merge",
	"  status    Report overlay, skill links, and Cursor MCP evidence",
	"  doctor    Explain missing skills, broken links, and unsafe MCP servers",
	"",
	"Options:",
	"  --json              Emit compact machine-readable JSON",
	"  --write             Only valid with init; write Cursor host artifacts",
	"  --force             With init --write, replace broken or retargetable skill symlinks and rewrite planned MCP servers",
	"  --scope user        Link into ~/.cursor (default)",
	"  --scope project     Link into <cwd>/.cursor and write .cursor/rules/omx-cursor-host.mdc",
	"  --mcp none          Do not add OMX MCP servers (never removes existing servers)",
	"  --mcp trace         Add omx_trace only (default)",
	"  --mcp wiki          Also add omx_wiki (optional; writes share omx_wiki/ with Codex)",
	"",
	"MCP policy:",
	"  Never registers omx_state or omx_hermes. Existing unrelated MCP servers are preserved.",
	"",
	"Examples:",
	"  omx cursor init",
	"  omx cursor init --write",
	"  omx cursor init --scope project --write --mcp wiki",
	"  omx cursor status --json",
	"  omx cursor doctor",
].join("\n");

export interface CursorHostCommandDependencies {
	cwd?: string;
	homedir?: string;
	codexHome?: string;
	omxCommand?: string;
	now?: Date;
	installMode?: CursorHostContext["installMode"];
	stdout?: (line: string) => void;
}

function parseEqualsFlag(
	arg: string,
	name: string,
): string | undefined {
	const prefix = `${name}=`;
	if (arg.startsWith(prefix)) return arg.slice(prefix.length);
	return undefined;
}

function parseArgs(args: string[]): {
	subcommand: string | undefined;
	json: boolean;
	write: boolean;
	force: boolean;
	scope: CursorHostScope;
	mcpTargets: CursorMcpTarget[];
	wantsHelp: boolean;
} {
	let subcommand: string | undefined;
	let json = false;
	let write = false;
	let force = false;
	let scope: CursorHostScope = "user";
	const mcpTargets: CursorMcpTarget[] = [];
	let wantsHelp = false;
	let expectingScope: boolean | "mcp" | false = false;

	for (const arg of args) {
		if (expectingScope === true) {
			if (!isCursorHostScope(arg)) {
				throw new Error(
					`Unknown cursor --scope: ${arg}. Expected user or project.`,
				);
			}
			scope = arg;
			expectingScope = false;
			continue;
		}
		if (expectingScope === "mcp") {
			if (!isCursorMcpTarget(arg)) {
				throw new Error(
					`Unknown cursor --mcp: ${arg}. Expected ${CURSOR_MCP_TARGETS.join(", ")}.`,
				);
			}
			mcpTargets.push(arg);
			expectingScope = false;
			continue;
		}

		const scopeValue = parseEqualsFlag(arg, "--scope");
		if (scopeValue !== undefined) {
			if (!isCursorHostScope(scopeValue)) {
				throw new Error(
					`Unknown cursor --scope: ${scopeValue}. Expected user or project.`,
				);
			}
			scope = scopeValue;
			continue;
		}
		const mcpValue = parseEqualsFlag(arg, "--mcp");
		if (mcpValue !== undefined) {
			if (!isCursorMcpTarget(mcpValue)) {
				throw new Error(
					`Unknown cursor --mcp: ${mcpValue}. Expected ${CURSOR_MCP_TARGETS.join(", ")}.`,
				);
			}
			mcpTargets.push(mcpValue);
			continue;
		}

		if (arg === "--json") {
			json = true;
			continue;
		}
		if (arg === "--write") {
			write = true;
			continue;
		}
		if (arg === "--force") {
			force = true;
			continue;
		}
		if (arg === "--help" || arg === "-h" || arg === "help") {
			wantsHelp = true;
			continue;
		}
		if (arg === "--scope") {
			expectingScope = true;
			continue;
		}
		if (arg === "--mcp") {
			expectingScope = "mcp";
			continue;
		}
		if (!subcommand) {
			subcommand = arg;
			continue;
		}
		throw new Error(`Unknown cursor argument: ${arg}`);
	}

	if (expectingScope === true) {
		throw new Error("Missing value for --scope. Expected user or project.");
	}
	if (expectingScope === "mcp") {
		throw new Error(
			`Missing value for --mcp. Expected ${CURSOR_MCP_TARGETS.join(", ")}.`,
		);
	}

	return { subcommand, json, write, force, scope, mcpTargets, wantsHelp };
}

function resolveMcpTargets(
	requested: CursorMcpTarget[],
): CursorMcpEnabledTarget[] {
	if (requested.includes("none")) {
		if (requested.some((target) => target !== "none")) {
			throw new Error("--mcp none cannot be combined with other --mcp values.");
		}
		return [];
	}
	const enabled = new Set<CursorMcpEnabledTarget>(["trace"]);
	for (const target of requested) {
		if (target === "wiki") enabled.add("wiki");
	}
	return [...enabled];
}

function render(
	value: unknown,
	json: boolean,
	stdout: (line: string) => void,
): void {
	stdout(JSON.stringify(value, null, json ? 0 : 2));
}

export async function cursorHostCommand(
	args: string[],
	deps: CursorHostCommandDependencies = {},
): Promise<void> {
	const stdout = deps.stdout ?? ((line: string) => console.log(line));
	const parsed = parseArgs(args);

	if (!parsed.subcommand || parsed.wantsHelp) {
		stdout(CURSOR_HOST_HELP);
		return;
	}

	if (
		!CURSOR_HOST_SUBCOMMANDS.includes(
			parsed.subcommand as CursorHostSubcommand,
		)
	) {
		throw new Error(
			`Unknown cursor subcommand: ${parsed.subcommand}. Supported subcommands: ${CURSOR_HOST_SUBCOMMANDS.join(", ")}`,
		);
	}

	if (parsed.write && parsed.subcommand !== "init") {
		throw new Error("--write is only supported with omx cursor init");
	}
	if (parsed.force && parsed.subcommand !== "init") {
		throw new Error("--force is only supported with omx cursor init");
	}

	const cwd = deps.cwd ?? process.cwd();
	const persisted = readPersistedSetupPreferencesSync(cwd);
	const context: CursorHostContext = {
		cwd,
		homedir: deps.homedir ?? homedir(),
		codexHome: deps.codexHome ?? codexHome(),
		scope: parsed.scope,
		mcpTargets: resolveMcpTargets(parsed.mcpTargets),
		write: parsed.write,
		force: parsed.force,
		now: deps.now ?? new Date(),
		omxCommand: deps.omxCommand ?? "omx",
		installMode:
			deps.installMode ??
			(persisted?.installMode === "plugin" || persisted?.installMode === "legacy"
				? persisted.installMode
				: undefined),
	};

	switch (parsed.subcommand as CursorHostSubcommand) {
		case "init":
			render(initCursorHost(context), parsed.json, stdout);
			return;
		case "status":
			render(buildCursorHostStatus(context), parsed.json, stdout);
			return;
		case "doctor":
			render(buildCursorHostDoctor(context), parsed.json, stdout);
			return;
	}
}
