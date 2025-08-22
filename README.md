# cursovable

Electron-based runner that:

- Lets you **select a React/Vite project**, runs its dev server (`yarn dev` | `npm run dev` | `pnpm dev`), auto-detects the URL/port, and embeds it in an **iframe preview**.
- Provides a **chat UI** that sends your prompt to `cursor-agent -p --output-format=json`, waits until the **success result JSON** arrives, **saves it to history**, and renders the `result` as Markdown.

> You must have `cursor-agent` installed and on your PATH. Optionally, provide an API key in the UI (exported to the process as `OPENAI_API_KEY` only for the cursor-agent call).

## Features

### Development Environment

- **Vite Integration**: Automatic detection and running of React/Vite projects
- **Live Preview**: Embedded iframe preview of your development server
- **Package Manager Support**: Works with yarn, npm, or pnpm

### AI Assistant

- **Cursor Agent Integration**: Built-in chat interface for AI-powered development
- **History Management**: Persistent storage of AI interactions
- **Markdown Rendering**: Rich display of AI responses

### Terminal Management

- **PTY Support**: Native terminal emulation with node-pty
- **Process Monitoring**: Real-time status of running processes
- **Status Menu**: Custom menu bar with live terminal status updates

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- `cursor-agent` installed and available in your PATH
- On macOS: Xcode Command Line Tools (for native dependencies)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd cursovable

# Install dependencies
npm install

# Rebuild native dependencies (required for node-pty)
npm run rebuild
```

## Development

```bash
# Start development mode
npm run dev

# Start with debug mode enabled
npm run dev:debug

# Start with hot reload for Electron
npm run dev:hot
```

This will launch Vite for the renderer at `http://localhost:5174` and then start Electron.

## Building the Project

### Build Commands

```bash
# Build the renderer (React app)
npm run build:renderer

# Build everything and create distributable packages
npm run dist

# Build everything and create unpacked directory (for testing)
npm run pack
```

### Build Process Details

The build process includes:

1. **Renderer Build**: Uses Vite to build the React app to `renderer/dist/`
2. **Asset Copying**: Automatically copies `public/snake-game.html` to the build output
3. **Electron Packaging**: Uses electron-builder to create platform-specific packages

The build configuration ensures that:

- `snake-game.html` is included in the final build
- All necessary Electron files are bundled
- Platform-specific icons and configurations are applied

### Build Output

After running `npm run dist`, you'll find the built packages in the `dist/` directory:

- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer and `.zip` files
- **Linux**: `.AppImage`, `.deb`, and `.tar.gz` files

## Running on macOS (Unsigned Apps)

Since this app is not code-signed, macOS will block it by default. Here are the steps to run it:

### Method 1: Right-click and Open (Recommended)

1. Navigate to the built app in Finder
2. **Right-click** (or Control+click) on the app
3. Select **"Open"** from the context menu
4. Click **"Open"** in the security dialog that appears
5. The app will now run normally

### Method 2: System Preferences

1. Go to **System Preferences** → **Security & Privacy**
2. Click the **"General"** tab
3. Look for a message about the blocked app
4. Click **"Open Anyway"** to allow the app to run

### Method 3: Terminal Command

```bash
# Remove quarantine attribute (use with caution)
xattr -rd com.apple.quarantine /path/to/your/app.app

# Or run directly from terminal
open /path/to/your/app.app
```

### Method 4: Developer Mode (macOS 13+)

1. Go to **System Preferences** → **Privacy & Security**
2. Scroll down to **Developer Tools**
3. Enable **"Developer Tools"**
4. This allows unsigned apps to run more easily

## Using the App

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

## Menu Features

The app includes a custom menu bar that provides:

- **Real-time Status**: Live updates of terminal, PTY, Vite, and process status
- **Quick Actions**: Direct access to start/stop Vite and cleanup operations
- **Theme Integration**: Dark theme that matches the app's appearance
- **Keyboard Shortcuts**: Quick access to common functions

See [Menu Features](docs/menu-features.md) for detailed documentation.

## Troubleshooting

### Build Issues

- **Native dependencies**: If you encounter issues with `node-pty`, run `npm run rebuild`
- **Vite build errors**: Ensure all dependencies are installed with `npm install`
- **Electron build failures**: Check that electron-builder is properly configured

### Runtime Issues

- **App won't open on macOS**: Use the right-click "Open" method described above
- **Cursor agent not found**: Ensure `cursor-agent` is installed and in your PATH
- **Vite detection issues**: Check that your project has a valid `package.json` with dev scripts

### Performance Issues

- **Slow builds**: Consider using `npm run pack` for development testing
- **Memory usage**: The app includes terminal emulation which can be resource-intensive

## Notes

- We try `yarn dev`, or `npm run dev`, or `pnpm dev` based on your selection.
- URL detection looks for `http://localhost:<port>` or `http://127.0.0.1:<port>` in Vite output.
- Stopping dev uses a simple `child.kill()`; on some setups you may need more robust tree-kill.
- If the CLI emits different JSON shapes, we store raw output as a fallback.
- The `snake-game.html` file is automatically included in builds via the build script.

## Development

For developers working on the project:

- **Hot reload**: Use `npm run dev:hot` for faster development cycles
- **Debug mode**: Set `CURSOVABLE_DEBUG_MODE=1` for additional logging
- **Testing builds**: Use `npm run pack` to test the built app without creating installers
