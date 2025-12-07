# TODO: Bundle and run CLI tools inside Electron

## Goal
Ship claude-code and codex CLIs with the app so users never install global tools or system Node; run them using the Electron-bundled Node.

## Tasks
- Move `@anthropic-ai/claude-code` and `@openai/codex` to `dependencies` so they are bundled.
- Update `build` config in `package.json` to set `asarUnpack` for both packages (e.g. `**/node_modules/@anthropic-ai/claude-code/**`, `**/node_modules/@openai/codex/**`) to keep their bins executable.
- In process-spawn logic, resolve `binDir` from the unpacked app (`process.resourcesPath/app.asar.unpacked/node_modules/.bin` in production, `node_modules/.bin` in dev) and invoke with `process.execPath`; prepend `binDir` to `PATH`.
- When running CLIs for a project, spawn child processes with `cwd` set to the target project and `env.ELECTRON_RUN_AS_NODE = "1"` so the bundled Node drives the CLI.
- For project-specific npm installs, run `npm ci --prefix <projectDir>` via `process.execPath`; display progress in-app; optionally support offline installs using a cached registry/tarballs.
- Add tests/manual checks: packaged build can run `claude-code --help` and `codex --help` from inside the app; verify on clean OS images with no Node installed.
