import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readCatalogManifest } from "../../catalog/reader.js";
import { isCatalogInstallableStatus } from "../../catalog/installable.js";
import { getPackageRoot } from "../../utils/package.js";
import {
	CURSOR_HOST_SAFE_SKILLS,
	CURSOR_PARTIAL_SKILLS,
	CURSOR_RUNTIME_GATED_SKILLS,
	classifyCursorSkill,
	renderCursorHostOverlayRule,
	renderCursorHostOverlaySkill,
} from "../index.js";

describe("cursor-host skill classification", () => {
	it("keeps host-safe, partial, and runtime-gated sets disjoint", () => {
		const hostSafe = new Set<string>(CURSOR_HOST_SAFE_SKILLS);
		const partial = new Set<string>(CURSOR_PARTIAL_SKILLS);
		const runtimeGated = new Set<string>(CURSOR_RUNTIME_GATED_SKILLS);

		for (const name of hostSafe) {
			assert.equal(partial.has(name), false, `${name} is in host-safe and partial`);
			assert.equal(
				runtimeGated.has(name),
				false,
				`${name} is in host-safe and runtime-gated`,
			);
		}
		for (const name of partial) {
			assert.equal(
				runtimeGated.has(name),
				false,
				`${name} is in partial and runtime-gated`,
			);
		}
	});

	it("classifies every installable catalog skill exactly once", () => {
		const manifest = readCatalogManifest();
		const installable = manifest.skills
			.filter((skill) => isCatalogInstallableStatus(skill.status))
			.map((skill) => skill.name)
			.sort();
		const classified = [
			...CURSOR_HOST_SAFE_SKILLS,
			...CURSOR_PARTIAL_SKILLS,
			...CURSOR_RUNTIME_GATED_SKILLS,
		].sort();

		assert.deepEqual(
			classified,
			installable,
			"cursor-host classification must cover active+internal catalog skills with no extras",
		);

		for (const name of installable) {
			assert.notEqual(
				classifyCursorSkill(name),
				"unclassified",
				`${name} is installable but unclassified for Cursor`,
			);
		}
	});

	it("locks the published Cursor fitness counts", () => {
		assert.equal(CURSOR_HOST_SAFE_SKILLS.length, 14);
		assert.equal(CURSOR_PARTIAL_SKILLS.length, 8);
		assert.equal(CURSOR_RUNTIME_GATED_SKILLS.length, 7);
	});

	it("embeds every classified skill name in the Cursor overlay", () => {
		const overlay = renderCursorHostOverlaySkill();
		for (const name of [
			...CURSOR_HOST_SAFE_SKILLS,
			...CURSOR_PARTIAL_SKILLS,
			...CURSOR_RUNTIME_GATED_SKILLS,
		]) {
			assert.match(overlay, new RegExp(`\`\\$${name}\``));
		}
		assert.match(overlay, /Never register `omx_state` or `omx_hermes`/);
	});

	it("keeps packaged templates in sync with the overlay renderer", () => {
		const root = getPackageRoot();
		assert.equal(
			readFileSync(join(root, "templates", "cursor-host", "SKILL.md"), "utf8"),
			renderCursorHostOverlaySkill(),
		);
		assert.equal(
			readFileSync(join(root, "templates", "cursor-host", "rule.mdc"), "utf8"),
			renderCursorHostOverlayRule(),
		);
	});

	it("keeps the in-repo Cursor project overlay in sync with the renderer", () => {
		const root = getPackageRoot();
		assert.equal(
			readFileSync(
				join(root, ".cursor", "skills", "omx-cursor-host", "SKILL.md"),
				"utf8",
			),
			renderCursorHostOverlaySkill(),
		);
		assert.equal(
			readFileSync(
				join(root, ".cursor", "rules", "omx-cursor-host.mdc"),
				"utf8",
			),
			renderCursorHostOverlayRule(),
		);
	});
});
