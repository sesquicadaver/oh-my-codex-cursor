import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * True when this machine or worktree has Cursor host traces.
 *
 * Absence means `omx doctor` should not fail a Codex-only layout; this fork
 * still warns so Cursor+OMX setup is not silently skipped.
 */
export function isCursorHostInUse(homedir: string, cwd: string): boolean {
	return (
		existsSync(join(homedir, ".cursor", "skills")) ||
		existsSync(join(homedir, ".cursor", "mcp.json")) ||
		existsSync(join(cwd, ".cursor"))
	);
}
