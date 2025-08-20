# Permission Improvements for Cursor-Agent

## Overview

This document describes the improvements made to fix issues where cursor-agent gets stuck due to insufficient permissions when creating new projects.

## Problem Description

When creating new projects, cursor-agent would sometimes get stuck or hang, typically due to:

- Insufficient read/write permissions in the project directory
- Directory ownership issues
- File system permission restrictions
- macOS-specific permission problems

## Solutions Implemented

### 1. Enhanced Project Creation (`electron/main.cjs`)

- **Pre-creation permission check**: Verifies parent directory has write access before creating project
- **Post-creation verification**: Tests if the created project directory allows file creation/deletion
- **Automatic cleanup**: Removes partially created directories if permission issues are detected
- **Detailed error messages**: Provides specific information about what permissions are missing

### 2. Cursor-Agent Startup Permission Validation (`electron/runner.cjs`)

- **Pre-execution check**: Verifies working directory permissions before starting cursor-agent
- **File operation test**: Creates and deletes a test file to ensure cursor-agent can work properly
- **Early failure**: Returns permission error immediately instead of hanging

### 3. Enhanced Timeout Handling

- **Quick timeout**: 30-second timeout specifically for permission-related hangs
- **Idle timeout**: 5-minute timeout for general inactivity
- **Overall timeout**: 15-minute maximum execution time
- **Permission warnings**: Specific error messages for permission-related timeouts

### 4. Permission Management APIs

- **`check-directory-permissions`**: Comprehensive permission analysis
- **`fix-directory-permissions`**: macOS-specific permission fixing using chmod/chown
- **Permission status display**: Real-time permission information in the UI

### 5. Improved User Interface (`CreateTemplateModal.jsx`)

- **Permission check button**: Allows users to verify folder permissions before creating projects
- **Permission status display**: Shows detailed permission information with visual indicators
- **Permission fix button**: macOS users can attempt automatic permission fixing
- **Troubleshooting guide**: Platform-specific instructions for fixing permission issues

## New IPC Handlers

### `check-directory-permissions`

```javascript
// Request
{ directoryPath: '/path/to/directory' }

// Response
{
  ok: true,
  permissions: {
    read: true,
    write: true,
    execute: true,
    createFiles: true,
    deleteFiles: true,
    mode: "755",
    owner: 501,
    group: 20
  }
}
```

### `fix-directory-permissions`

```javascript
// Request
{ directoryPath: '/path/to/directory' }

// Response
{
  ok: true,
  message: "Permissions fixed successfully. New mode: 755",
  newMode: "755"
}
```

## Usage Examples

### Checking Permissions Before Project Creation

```javascript
// In CreateTemplateModal.jsx
const permCheck = await window.cursovable.checkDirectoryPermissions({
  directoryPath: parentDir,
});

if (!permCheck.permissions.createFiles) {
  throw new Error("Insufficient permissions for cursor-agent to work");
}
```

### Fixing Permissions (macOS)

```javascript
const fixResult = await window.cursovable.fixDirectoryPermissions({
  directoryPath: "/path/to/project",
});

if (fixResult.ok) {
  console.log("Permissions fixed:", fixResult.message);
}
```

## Platform-Specific Notes

### macOS

- Automatic permission fixing using `chmod 755` and `chown`
- Common issues with external drives or network locations
- Finder permission settings can override command line changes

### Linux

- Manual permission fixing required using `chmod` and `chown`
- SELinux contexts may need adjustment
- Group permissions may need configuration

### Windows

- Manual permission configuration through Properties → Security
- User account control (UAC) may restrict operations
- Network drive permissions may differ from local drives

## Testing

Run the permission test script to verify functionality:

```bash
node test-permissions.js
```

## Troubleshooting

### Common Permission Issues

1. **"Permission denied" errors**

   - Check folder ownership: `ls -la /path/to/folder`
   - Verify user permissions: `id` command
   - Check parent directory permissions

2. **"Operation not permitted" on macOS**

   - Check System Preferences → Security & Privacy
   - Verify Full Disk Access for terminal applications
   - Check folder sharing settings

3. **"Read-only file system"**
   - Check if drive is mounted read-only
   - Verify disk permissions and ownership
   - Check for disk errors

### Manual Permission Fixes

```bash
# macOS/Linux
chmod 755 /path/to/project
chown $USER /path/to/project

# Windows (PowerShell as Administrator)
icacls "C:\path\to\project" /grant "$env:USERNAME:(OI)(CI)F"
```

## Future Improvements

- [ ] Cross-platform permission fixing
- [ ] Permission inheritance handling
- [ ] Advanced permission analysis
- [ ] Permission monitoring and alerts
- [ ] Integration with system permission dialogs
