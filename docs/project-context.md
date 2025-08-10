cursovable – Developer Onboarding & Context

What is this?

cursovable is an Electron + React (Vite) desktop app that:
• Lets a user choose a local React/Vite project folder, runs its dev server, detects the URL/port from the terminal output, and embeds it in a left-hand preview (iframe).
• Provides a right-hand chat that turns user prompts into terminal commands to cursor-agent and waits for a success JSON result before displaying it as Markdown and saving it to a local history file.

This tool is meant to orchestrate a local “CTO agent” workflow while seeing the running app side-by-side.

⸻

Requirements
• Node.js 18+
• cursor-agent CLI available on PATH
• macOS/Windows/Linux

Optional: user may provide an API key in the UI. We pass it to the spawned process as OPENAI_API_KEY only for the cursor-agent call.

⸻

Repo layout

/ (project root)
package.json # scripts for dev (Electron + Vite renderer)
/electron
main.cjs # Electron main process
preload.cjs # Exposes limited IPC API to renderer
runner.cjs # Spawns `cursor-agent` and parses streaming JSON
viteRunner.cjs # Spawns chosen Vite app (`yarn|npm|pnpm dev`) and detects URL
historyStore.cjs # Persists history.json under app.getPath('userData')
/renderer
vite.config.cjs # Vite config for the renderer UI (port 5174)
index.html
/src
main.jsx
App.jsx # 2-panel layout (preview + chat)
/components
Chat.jsx # Chat UI; renders Markdown with `marked`
README.md

⸻

NPM scripts

{
"dev": "concurrently -k \"npm:renderer\" \"npm:electron\"",
"renderer": "vite --config renderer/vite.config.cjs",
"electron": "wait-on http://localhost:5174 && cross-env RENDERER_URL=http://localhost:5174 electron .",
"start": "electron ."
}

    •	npm run dev starts the renderer (http://localhost:5174) and then Electron pointing to it.
    •	npm start runs Electron against the built renderer (or loads renderer/index.html if packaged to file).

⸻

How it works (high level)

1. Preview side (left)

   1. User clicks Choose folder → ipcMain.handle('select-folder').
   2. User clicks Run Vite → viteRunner.startVite(folderPath, manager) spawns the chosen package manager:
      • yarn dev (default) or npm run dev or pnpm dev.
   3. We parse stdout/stderr until we find a URL like http://localhost:5173/ or http://127.0.0.1:5173/.
   4. Once detected, we send the URL back to the renderer via IPC and load it in an iframe.

2. Chat side (right)
   1. User types a prompt → renderer calls ipcMain.handle('cursor-run', { message, apiKey }).
   2. runner.cjs runs:

cursor-agent -p --output-format=json <user message>

with OPENAI_API_KEY set only for this spawned process (if the user provided one).

    3.	We stream and extract JSON objects from the CLI output until we find:

{ "type": "result", "subtype": "success", "is_error": false, ... }

    4.	On success:
    •	Persist the entire JSON to history.json in Electron userData.
    •	Return it to the renderer, which displays result as Markdown in the chat.
    5.	If no success JSON is found, we store/return the raw output as a fallback.

3. History
   • Stored at: path.join(app.getPath('userData'), 'history.json').
   • UI has Clear button → deletes history.
   • On load, renderer reads and rebuilds the chat from history (user/assistant pairs where possible).

⸻

IPC surface (preload → main)

selectFolder(): Promise<string | null>
startVite({ folderPath: string, manager: 'yarn'|'npm'|'pnpm' }): Promise<{ url: string }>
stopVite(): Promise<boolean>
runCursor({ message: string, apiKey?: string }): Promise<ResultJson | RawOutput>
getHistory(): Promise<Array<StoredItem>>
clearHistory(): Promise<[]>

Result contract

We resolve only when we see a JSON object like:

{
"type": "result",
"subtype": "success",
"is_error": false,
"duration_ms": 47348,
"duration_api_ms": 47348,
"result": "...markdown-friendly text...",
"session_id": "..."
}

Anything else becomes a RawOutput fallback:

{ type: 'raw', output: string }

⸻

Local development

npm install
npm run dev

In the Electron window: 1. Choose folder → pick a local React/Vite project. 2. Select package manager (default yarn). 3. Run Vite → wait for the detected URL, and the app loads in the left iframe. 4. (Optional) Enter API key in the header. 5. Send prompts in the chat; results render as Markdown and are persisted.

⸻

Error handling / edge cases
• Vite URL not detected: We look for http://localhost:<port> or http://127.0.0.1:<port> in logs. If your stack prints differently, update parseUrlFromViteOutput().
• Process lifecycle: stopVite() sends a simple kill; if your dev server spawns children, consider a tree-kill strategy.
• cursor-agent not found: We reject with a startup error; ensure the CLI is installed and on PATH.
• Non-standard JSON: If the CLI never prints the success-result JSON, we return type: 'raw' with the entire output and still show it in the chat.

⸻

Security
• Context isolation on; no nodeIntegration in the renderer.
• Preload exposes a minimal IPC API.
• API key is not persisted; it is injected into the environment only for the spawned cursor-agent process.

⸻

Extending the app
• Sessions: add a left sidebar to save multiple folder+history timelines.
• Streaming UI: surface real-time cursor-agent output lines in the chat while waiting for the final JSON.
• More frameworks: detect and preview Next.js, Astro, or static servers (custom URL parser per framework).
• Settings: configurable success-JSON predicate, custom key env var name, custom URL regex.
• Packaging: add electron-builder or electron-forge to produce installers (dmg/exe/AppImage).
• Auth: optional passphrase to open history; encrypt history at rest if needed.

⸻

Code style & dependencies
• UI uses React 18, Vite 5, marked for Markdown.
• Dev uses concurrently, wait-on, cross-env.
• Keep dependencies minimal; prefer small utilities over large frameworks for the main process.

⸻

QA checklist (before PR)
• cursor-agent call returns success JSON and UI renders Markdown.
• History written under userData and can be cleared from UI.
• Vite app URL auto-detected and loads in iframe.
• Works on both macOS and Windows (spawn shell flag is set for Windows).
• No renderer access to Node APIs; only allowed IPC routes are used.

⸻

License & ownership

Fill this section per your organization’s standards.
