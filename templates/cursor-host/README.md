# Cursor host overlay templates

These files are the packaged copies of the OMX-owned Cursor overlay.

- `SKILL.md` is written to `~/.cursor/skills/omx-cursor-host/SKILL.md` (user) or `.cursor/skills/omx-cursor-host/SKILL.md` (project) by `omx cursor init --write`.
- `rule.mdc` is written only for `--scope project` as `.cursor/rules/omx-cursor-host.mdc`.

Source of truth is `src/cursor-host/overlay.ts`. Tests fail if these files drift from the renderer.
