# Build Instructions for Cursovable

This document provides detailed instructions for building and distributing the Cursovable Electron application.

## Prerequisites

Before building, ensure you have:

- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Git** for cloning the repository
- **Xcode Command Line Tools** (macOS only) - install with `xcode-select --install`

## Project Structure

```
cursovable/
├── electron/           # Main Electron process
├── renderer/           # React frontend
│   ├── src/           # React source code
│   ├── public/        # Static assets (including snake-game.html)
│   └── dist/          # Build output (created during build)
├── package.json        # Dependencies and build scripts
└── vite.config.cjs     # Vite configuration
```

## Build Process Overview

The build process consists of three main steps:

1. **Renderer Build**: Vite builds the React app
2. **Asset Copying**: Static files are copied to the build output
3. **Electron Packaging**: electron-builder creates distributable packages

## Step-by-Step Build Instructions

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd cursovable

# Install dependencies
npm install

# Rebuild native dependencies (required for node-pty)
npm run rebuild
```

### 2. Build the Renderer

```bash
# Build the React app with Vite
npm run build:renderer
```

This command:

- Builds the React app using Vite
- Outputs to `renderer/dist/`
- Automatically copies `public/snake-game.html` to the build output
- Creates optimized production assets

**Expected output**: `renderer/dist/` directory with built files

### 3. Create Distributable Packages

```bash
# Create distributable packages for all platforms
npm run dist

# Or create unpacked directory for testing
npm run pack
```

## Build Scripts Explained

### `npm run build:renderer`

```bash
vite build --config renderer/vite.config.cjs && cp renderer/public/snake-game.html renderer/dist/
```

- Uses Vite to build the React app
- Copies `snake-game.html` to the build output
- Ensures the game file is included in the final package

### `npm run pack`

```bash
yarn build:renderer && electron-builder --dir
```

- Builds the renderer first
- Creates an unpacked Electron app directory
- Useful for testing before creating installers

### `npm run dist`

```bash
yarn build:renderer && electron-builder
```

- Builds the renderer first
- Creates platform-specific distributable packages
- Generates installers (.dmg, .exe, .AppImage, etc.)

## Build Configuration

### Vite Configuration (`renderer/vite.config.cjs`)

```javascript
module.exports = defineConfig(({ command, mode }) => ({
  root: __dirname,
  base: command === "build" ? "./" : "/", // Relative paths for Electron
  server: {
    port: 5174,
    strictPort: true,
  },
  plugins: [react()],
  build: {
    outDir: "dist",
  },
}));
```

### Electron Builder Configuration (`package.json`)

```json
{
  "build": {
    "appId": "com.cursovable.app",
    "productName": "Cursovable",
    "files": ["electron/**", "renderer/dist/**", "package.json"],
    "directories": {
      "buildResources": "assets"
    }
  }
}
```

## Platform-Specific Builds

### macOS

```bash
# Build for macOS
npm run dist

# Output files in dist/:
# - Cursovable-0.1.0-arm64.dmg
# - Cursovable-0.1.0-arm64.zip
# - Cursovable-0.1.0-x64.dmg
# - Cursovable-0.1.0-x64.zip
```

**Note**: macOS builds include both Intel (x64) and Apple Silicon (arm64) versions.

### Windows

```bash
# Build for Windows
npm run dist

# Output files in dist/:
# - Cursovable Setup 0.1.0.exe
# - Cursovable-0.1.0-win.zip
```

### Linux

```bash
# Build for Linux
npm run dist

# Output files in dist/:
# - Cursovable-0.1.0-x86_64.AppImage
# - Cursovable-0.1.0_amd64.deb
# - Cursovable-0.1.0-x86_64.tar.gz
```

## Including snake-game.html

The `snake-game.html` file is automatically included in builds through the build script:

```bash
# This command ensures snake-game.html is copied
npm run build:renderer
```

The file is copied from `renderer/public/snake-game.html` to `renderer/dist/snake-game.html` during the build process.

## Troubleshooting Build Issues

### Common Build Errors

#### 1. Native Dependencies Fail to Build

**Error**: `node-pty` build failures

**Solution**:

```bash
# Rebuild native dependencies
npm run rebuild

# If that fails, try:
npm install --build-from-source
```

#### 2. Vite Build Errors

**Error**: Module resolution or dependency issues

**Solution**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for missing dependencies
npm ls
```

#### 3. Electron Builder Failures

**Error**: Build process hangs or fails

**Solution**:

```bash
# Clear build cache
rm -rf node_modules/.cache
rm -rf dist/

# Rebuild step by step
npm run build:renderer
npm run pack  # Test with unpacked build first
```

#### 4. File Not Found Errors

**Error**: `snake-game.html` not found in build

**Solution**:

```bash
# Ensure the file exists
ls renderer/public/snake-game.html

# Manually copy if needed
cp renderer/public/snake-game.html renderer/dist/
```

### Build Performance Optimization

#### 1. Faster Development Builds

```bash
# Use pack instead of dist for testing
npm run pack

# This creates an unpacked directory without installers
```

#### 2. Parallel Builds

```bash
# Build renderer and pack in parallel (if supported)
npm run build:renderer & npm run pack
```

#### 3. Build Caching

```bash
# Vite automatically caches builds
# Clear cache if needed:
rm -rf renderer/dist/
```

## Testing Builds

### 1. Test Unpacked Build

```bash
# Create unpacked build
npm run pack

# Test the app
open dist/mac/Cursovable.app  # macOS
# or
start dist/win-unpacked/Cursovable.exe  # Windows
```

### 2. Test Installer

```bash
# Create full distribution
npm run dist

# Test the installer
open dist/Cursovable-0.1.0-arm64.dmg  # macOS
```

## Distribution

### 1. Release Files

After a successful build, distribute these files:

- **macOS**: `.dmg` files for easy installation
- **Windows**: `.exe` installer
- **Linux**: `.AppImage` for universal compatibility

### 2. Code Signing (Optional)

For production distribution, consider code signing:

```bash
# macOS code signing (requires Apple Developer account)
# Add to package.json build configuration:
"mac": {
  "identity": "Your Developer ID"
}
```

### 3. Notarization (macOS)

For macOS apps distributed outside the App Store:

```bash
# Add to package.json build configuration:
"mac": {
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

## Build Verification

After building, verify:

1. **File Structure**: Check that `snake-game.html` is in the build output
2. **App Launch**: Test that the built app launches without errors
3. **Functionality**: Verify core features work in the built version
4. **File Sizes**: Ensure build outputs are reasonable sizes

## Continuous Integration

For automated builds, consider adding to CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Build Application
  run: |
    npm install
    npm run rebuild
    npm run dist
```

## Support

If you encounter build issues:

1. Check this document for common solutions
2. Verify all prerequisites are met
3. Check the project's issue tracker
4. Ensure you're using compatible versions of Node.js and npm
