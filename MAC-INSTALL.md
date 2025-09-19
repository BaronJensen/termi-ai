# Mac Installation Guide for Termi AI

This guide provides step-by-step instructions for installing and running Termi AI on macOS, specifically addressing the challenges of running unsigned applications.

## Quick Start

1. **Download** the latest release from the project
2. **Extract** the `.dmg` or `.zip` file
3. **Right-click** the app and select "Open"
4. **Click "Open"** in the security dialog

## Detailed Installation Steps

### Step 1: Download and Extract

- Download the latest `.dmg` file for your Mac's architecture:
  - **Apple Silicon (M1/M2/M3)**: `Termi-AI-0.1.0-arm64.dmg`
  - **Intel Macs**: `Termi-AI-0.1.0-x64.dmg`
- Double-click the `.dmg` file to mount it
- Drag the app to your Applications folder

### Step 2: First Launch (Security Gate)

When you first try to launch the app, macOS will block it with a security warning:

1. **Right-click** (or Control+click) on the Termi AI app
2. Select **"Open"** from the context menu
3. Click **"Open"** in the security dialog that appears
4. The app will now launch successfully

### Alternative Methods to Run Unsigned Apps

#### Method A: System Preferences (Recommended for First Time)

1. Go to **System Preferences** → **Security & Privacy**
2. Click the **"General"** tab
3. Look for a message about "Termi AI was blocked from opening"
4. Click **"Open Anyway"** to allow the app to run
5. Try launching the app again

#### Method B: Terminal Command

```bash
# Remove the quarantine attribute (use with caution)
xattr -rd com.apple.quarantine /Applications/Termi-AI.app

# Then launch normally
open /Applications/Termi-AI.app
```

#### Method C: Developer Mode (macOS 13+)

1. Go to **System Preferences** → **Privacy & Security**
2. Scroll down to **Developer Tools**
3. Enable **"Developer Tools"**
4. This allows unsigned apps to run more easily

#### Method D: Run from Terminal

```bash
# Navigate to the app and run directly
cd /Applications
./Termi-AI.app/Contents/MacOS/Termi-AI
```

## Troubleshooting

### "App is Damaged" Error

If you see "App is damaged and can't be opened":

```bash
# Remove quarantine attribute
xattr -rd com.apple.quarantine /Applications/Termi-AI.app

# Or check what attributes are set
xattr -l /Applications/Termi-AI.app
```

### "Unidentified Developer" Warning

This is normal for unsigned apps. Use the right-click "Open" method described above.

### App Won't Launch After Security Dialog

1. Check if the app is running in Activity Monitor
2. Try restarting your Mac
3. Re-download the app if issues persist

### Permission Denied Errors

```bash
# Check file permissions
ls -la /Applications/Termi-AI.app

# Fix permissions if needed
chmod +x /Applications/Termi-AI.app/Contents/MacOS/Termi-AI
```

## Security Considerations

### Why This App is Unsigned

- **Cost**: Code signing requires an Apple Developer account ($99/year)
- **Development**: This is a development tool, not a commercial application
- **Open Source**: The code is open source and can be reviewed

### Is It Safe?

- **Source Code**: Available for review on GitHub
- **Dependencies**: Uses standard Electron and Node.js packages
- **Permissions**: Only requests necessary system access
- **Network**: Only connects to local development servers

### What the App Does

- Runs local development servers
- Provides terminal emulation
- Integrates with cursor-agent for AI assistance
- No network calls to external services (unless configured)

## Updating the App

### Automatic Updates

Currently, the app doesn't support automatic updates. To update:

1. Download the new version
2. Replace the old app in Applications
3. Follow the security steps again for the new version

### Manual Update Process

```bash
# Remove old version
rm -rf /Applications/Termi-AI.app

# Install new version
# (Follow installation steps above)
```

## System Requirements

- **macOS**: 10.15 (Catalina) or later
- **Architecture**: Intel (x64) or Apple Silicon (arm64)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free space
- **Node.js**: Not required (bundled with the app)

## Support

If you encounter issues:

1. Check this guide first
2. Try the troubleshooting steps above
3. Check the main README.md for general issues
4. Open an issue on the project's GitHub page

## Why These Steps Are Necessary

macOS includes security features to protect users from potentially malicious software:

- **Gatekeeper**: Blocks unsigned apps by default
- **Quarantine**: Marks downloaded files as potentially unsafe
- **Notarization**: Requires Apple's approval for distribution

These steps bypass these protections for trusted applications. The right-click "Open" method is the safest approach as it explicitly tells macOS that you trust this application.
