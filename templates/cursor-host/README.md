# Cursor host overlay templates

These files are the packaged copies of the OMX-owned Cursor overlay for this clone ([`sesquicadaver/oh-my-codex-cursor`](https://github.com/sesquicadaver/oh-my-codex-cursor)). Official OMX remains [`Yeachan-Heo/oh-my-codex`](https://github.com/Yeachan-Heo/oh-my-codex).

- `SKILL.md` is written to `~/.cursor/skills/omx-cursor-host/SKILL.md` (user) or `.cursor/skills/omx-cursor-host/SKILL.md` (project) by `omx cursor init --write`.
- `rule.mdc` is written only for `--scope project` as `.cursor/rules/omx-cursor-host.mdc`.

Source of truth is `src/cursor-host/overlay.ts`. Tests fail if these files drift from the renderer.
