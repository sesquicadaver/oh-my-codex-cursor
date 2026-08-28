import { join } from "node:path";
import {
	CURSOR_HOST_OVERLAY_NAME,
	type CursorHostContext,
	type CursorHostPaths,
	type CursorHostScope,
} from "./contracts.js";

export interface CursorHostPathInput {
	cwd: string;
	homedir: string;
	codexHome: string;
	scope: CursorHostScope;
}

export function resolveCursorHostPaths(
	input: CursorHostPathInput | CursorHostContext,
): CursorHostPaths {
	const cursorRoot =
		input.scope === "user"
			? join(input.homedir, ".cursor")
			: join(input.cwd, ".cursor");
	const cursorSkillsDir = join(cursorRoot, "skills");
	const cursorRulesDir =
		input.scope === "project" ? join(cursorRoot, "rules") : null;
	const overlayDir = join(cursorSkillsDir, CURSOR_HOST_OVERLAY_NAME);

	return {
		scope: input.scope,
		cwd: input.cwd,
		homedir: input.homedir,
		codexHome: input.codexHome,
		cursorSkillsDir,
		cursorMcpPath: join(cursorRoot, "mcp.json"),
		cursorRulesDir,
		overlayDir,
		overlaySkillPath: join(overlayDir, "SKILL.md"),
		overlayRulePath: cursorRulesDir
			? join(cursorRulesDir, `${CURSOR_HOST_OVERLAY_NAME}.mdc`)
			: null,
		installStatePath: join(overlayDir, "install.json"),
		userSkillsDir: join(input.codexHome, "skills"),
		projectSkillsDir: join(input.cwd, ".codex", "skills"),
	};
}
