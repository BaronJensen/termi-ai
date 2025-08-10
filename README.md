
# cursovable

Electron-based runner that:

- Lets you **select a React/Vite project**, runs its dev server (`yarn dev` | `npm run dev` | `pnpm dev`), auto-detects the URL/port, and embeds it in an **iframe preview**.
- Provides a **chat UI** that sends your prompt to `cursor-agent -p --output-format=json`, waits until the **success result JSON** arrives, **saves it to history**, and renders the `result` as Markdown.

> You must have `cursor-agent` installed and on your PATH. Optionally, provide an API key in the UI (exported to the process as `OPENAI_API_KEY` only for the cursor-agent call).

## Dev run

```bash
npm install
npm run dev
```
That will launch Vite for the renderer at `http://localhost:5174` and then start Electron.

## Using it

1. Click **Choose folder** and pick your React/Vite project.
2. Click **Run Vite**. The app waits for Vite's URL (e.g., `http://localhost:5173/`) and shows it on the left.
3. On the right, type a message. We run:
   ```
   cursor-agent -p --output-format=json "<your message>"
   ```
   (The full command isn't shown in the UI.)
4. We parse the CLI output until we see a JSON object with `"type":"result","subtype":"success","is_error":false` and then:
   - Save that JSON to a local `history.json` under Electron's userData path.
   - Render the `result` string as Markdown in chat.

Use **Clear** to wipe the stored history.

## Notes

- We try `yarn dev`, or `npm run dev`, or `pnpm dev` based on your selection.
- URL detection looks for `http://localhost:<port>` or `http://127.0.0.1:<port>` in Vite output.
- Stopping dev uses a simple `child.kill()`; on some setups you may need more robust tree-kill.
- If the CLI emits different JSON shapes, we store raw output as a fallback.
