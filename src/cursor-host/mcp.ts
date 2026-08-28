/**
 * Merge Cursor `mcp.json` without claiming Codex session state.
 *
 * Default planned server is omx_trace. Optional omx_wiki may be added.
 * Existing unrelated servers are preserved. omx_state / omx_hermes are
 * never added; if already present they are reported, not removed.
 */

import { existsSync, readFileSync } from "node:fs";
import {
	CURSOR_CAUTION_MCP_SERVERS,
	CURSOR_UNSAFE_MCP_SERVERS,
	type CursorHostContext,
	type CursorHostPaths,
	type CursorMcpMergePlan,
	canonicalCursorMcpServer,
	mcpServerNameForTarget,
} from "./contracts.js";

const UNSAFE = new Set<string>(CURSOR_UNSAFE_MCP_SERVERS);
const CAUTION = new Set<string>(CURSOR_CAUTION_MCP_SERVERS);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function listedServerNames(document: Record<string, unknown> | null): string[] {
	if (!document) return [];
	const servers = document.mcpServers;
	if (!isRecord(servers)) return [];
	return Object.keys(servers).sort();
}

function readMcpDocument(path: string): {
	exists: boolean;
	valid: boolean;
	parseError: string | null;
	document: Record<string, unknown> | null;
} {
	if (!existsSync(path)) {
		return { exists: false, valid: true, parseError: null, document: null };
	}

	const raw = readFileSync(path, "utf8");
	if (raw.trim() === "") {
		return { exists: true, valid: true, parseError: null, document: {} };
	}

	try {
		const parsed: unknown = JSON.parse(raw);
		if (!isRecord(parsed)) {
			return {
				exists: true,
				valid: false,
				parseError: "mcp.json root must be a JSON object",
				document: null,
			};
		}
		return { exists: true, valid: true, parseError: null, document: parsed };
	} catch (error) {
		return {
			exists: true,
			valid: false,
			parseError: error instanceof Error ? error.message : String(error),
			document: null,
		};
	}
}

function sameServer(
	existing: unknown,
	planned: { command: string; args: string[] },
): boolean {
	if (!isRecord(existing)) return false;
	const command = existing.command;
	const args = existing.args;
	if (command !== planned.command) return false;
	if (!Array.isArray(args)) return false;
	if (args.length !== planned.args.length) return false;
	return planned.args.every((value, index) => args[index] === value);
}

export function planCursorMcpMerge(
	paths: CursorHostPaths,
	context: CursorHostContext,
): CursorMcpMergePlan {
	const existing = readMcpDocument(paths.cursorMcpPath);
	const plannedSpecs = Object.fromEntries(
		context.mcpTargets.map((target) => [
			mcpServerNameForTarget(target),
			canonicalCursorMcpServer(target, context.omxCommand),
		]),
	);
	const plannedServers = Object.keys(plannedSpecs).sort();
	const currentNames = listedServerNames(existing.document);
	const unsafeServers = currentNames.filter((name) => UNSAFE.has(name));
	const cautionServers = currentNames.filter((name) => CAUTION.has(name));

	if (!existing.valid) {
		return {
			path: paths.cursorMcpPath,
			exists: existing.exists,
			valid: false,
			parseError: existing.parseError,
			plannedServers,
			addedServers: [],
			replacedServers: [],
			preservedServers: [],
			unsafeServers,
			cautionServers,
			nextDocument: null,
		};
	}

	const nextDocument: Record<string, unknown> = {
		...(existing.document ?? {}),
	};
	const nextServers: Record<string, unknown> = isRecord(nextDocument.mcpServers)
		? { ...nextDocument.mcpServers }
		: {};
	const addedServers: string[] = [];
	const replacedServers: string[] = [];

	for (const [name, spec] of Object.entries(plannedSpecs)) {
		const current = nextServers[name];
		if (current === undefined) {
			nextServers[name] = spec;
			addedServers.push(name);
			continue;
		}
		if (sameServer(current, spec)) {
			continue;
		}
		if (context.force) {
			nextServers[name] = spec;
			replacedServers.push(name);
		}
	}

	nextDocument.mcpServers = nextServers;
	const preservedServers = Object.keys(nextServers)
		.filter((name) => !plannedServers.includes(name))
		.sort();

	return {
		path: paths.cursorMcpPath,
		exists: existing.exists,
		valid: true,
		parseError: null,
		plannedServers,
		addedServers: addedServers.sort(),
		replacedServers: replacedServers.sort(),
		preservedServers,
		unsafeServers,
		cautionServers,
		nextDocument,
	};
}

export function renderCursorMcpDocument(
	document: Record<string, unknown>,
): string {
	return `${JSON.stringify(document, null, 2)}\n`;
}
