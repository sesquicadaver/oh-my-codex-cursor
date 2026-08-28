/**
 * Contracts for the OMX Cursor host surface (`omx cursor`).
 *
 * Cursor Agent is a second host, not a Codex CLI replacement. This module
 * owns filesystem skill bridging, a host overlay, and a safe MCP merge.
 * It does not claim keyword routing, tmux/team runtime, or plugin-mode
 * skill discovery.
 */

export const CURSOR_HOST_SCHEMA_VERSION = "1.0";

export const CURSOR_HOST_OVERLAY_NAME = "omx-cursor-host";

export const CURSOR_HOST_SCOPES = ["user", "project"] as const;
export type CursorHostScope = (typeof CURSOR_HOST_SCOPES)[number];

export const CURSOR_HOST_SUBCOMMANDS = ["init", "status", "doctor"] as const;
export type CursorHostSubcommand = (typeof CURSOR_HOST_SUBCOMMANDS)[number];

export const CURSOR_MCP_TARGETS = ["none", "trace", "wiki"] as const;
export type CursorMcpTarget = (typeof CURSOR_MCP_TARGETS)[number];
export type CursorMcpEnabledTarget = Exclude<CursorMcpTarget, "none">;

export const CURSOR_SKIP_SKILL_DIRECTORY_NAMES = new Set([
	".system",
	"workflows",
	CURSOR_HOST_OVERLAY_NAME,
]);

export const CURSOR_UNSAFE_MCP_SERVERS = ["omx_state", "omx_hermes"] as const;
export const CURSOR_CAUTION_MCP_SERVERS = [
	"omx_memory",
	"omx_code_intel",
] as const;
export const CURSOR_SAFE_DEFAULT_MCP_SERVERS = ["omx_trace"] as const;
export const CURSOR_OPTIONAL_MCP_SERVERS = ["omx_wiki"] as const;

export type CursorSkillClassification =
	| "host-safe"
	| "partial"
	| "runtime-gated"
	| "unclassified";

export type CursorSkillLinkAction =
	| "link"
	| "unchanged"
	| "replace"
	| "skip";

export type CursorSkillSkipReason =
	| "missing-source"
	| "conflict-directory"
	| "conflict-file"
	| "different-target"
	| "broken-symlink"
	| "reserved-name";

export interface CursorHostPaths {
	scope: CursorHostScope;
	cwd: string;
	homedir: string;
	codexHome: string;
	cursorSkillsDir: string;
	cursorMcpPath: string;
	cursorRulesDir: string | null;
	overlayDir: string;
	overlaySkillPath: string;
	overlayRulePath: string | null;
	installStatePath: string;
	userSkillsDir: string;
	projectSkillsDir: string;
}

export type CursorHostInstallMode = "legacy" | "plugin";

export interface CursorHostContext {
	cwd: string;
	homedir: string;
	codexHome: string;
	scope: CursorHostScope;
	mcpTargets: CursorMcpEnabledTarget[];
	write: boolean;
	force: boolean;
	now: Date;
	omxCommand: string;
	installMode?: CursorHostInstallMode;
}

export interface CursorSkillLinkPlan {
	name: string;
	classification: CursorSkillClassification;
	sourcePath: string | null;
	destinationPath: string;
	action: CursorSkillLinkAction;
	reason: CursorSkillSkipReason | null;
	currentTarget: string | null;
}

export interface CursorMcpServerSpec {
	command: string;
	args: string[];
}

export interface CursorMcpMergePlan {
	path: string;
	exists: boolean;
	valid: boolean;
	parseError: string | null;
	plannedServers: string[];
	addedServers: string[];
	replacedServers: string[];
	preservedServers: string[];
	unsafeServers: string[];
	cautionServers: string[];
	nextDocument: Record<string, unknown> | null;
}

export interface CursorHostInstallState {
	schemaVersion: string;
	ownedBy: "oh-my-codex";
	surface: "cursor-host";
	scope: CursorHostScope;
	installedAt: string;
	mcpServers: string[];
	linkedSkills: string[];
}

export interface CursorHostInitResult {
	schemaVersion: string;
	timestamp: string;
	scope: CursorHostScope;
	write: boolean;
	force: boolean;
	summary: string;
	paths: CursorHostPaths;
	overlay: {
		skillPath: string;
		rulePath: string | null;
		installStatePath: string;
	};
	skills: CursorSkillLinkPlan[];
	mcp: CursorMcpMergePlan;
	previewPaths: string[];
	wrotePaths: string[];
}

export interface CursorHostStatusReport {
	schemaVersion: string;
	timestamp: string;
	scope: CursorHostScope;
	summary: string;
	paths: CursorHostPaths;
	overlay: {
		present: boolean;
		skillPath: string;
		rulePath: string | null;
		installStatePath: string;
		installState: CursorHostInstallState | null;
	};
	skills: {
		sourceCount: number;
		linked: string[];
		missing: string[];
		broken: string[];
		conflicts: string[];
		byClassification: Record<CursorSkillClassification, string[]>;
	};
	mcp: CursorMcpMergePlan;
}

export interface CursorHostDoctorIssue {
	code: string;
	severity: "error" | "warning";
	message: string;
}

export interface CursorHostDoctorReport {
	schemaVersion: string;
	timestamp: string;
	scope: CursorHostScope;
	summary: string;
	healthy: boolean;
	issues: CursorHostDoctorIssue[];
	nextSteps: string[];
	status: CursorHostStatusReport;
}

export function toIsoTimestamp(now = new Date()): string {
	return now.toISOString();
}

export function isCursorHostScope(value: string): value is CursorHostScope {
	return (CURSOR_HOST_SCOPES as readonly string[]).includes(value);
}

export function isCursorMcpTarget(value: string): value is CursorMcpTarget {
	return (CURSOR_MCP_TARGETS as readonly string[]).includes(value);
}

export function mcpServerNameForTarget(
	target: CursorMcpEnabledTarget,
): string {
	return target === "trace" ? "omx_trace" : "omx_wiki";
}

export function canonicalCursorMcpServer(
	target: CursorMcpEnabledTarget,
	omxCommand: string,
): CursorMcpServerSpec {
	return {
		command: omxCommand,
		args: ["mcp-serve", target],
	};
}
