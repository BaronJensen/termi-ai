# Menu Features

## Overview

The Electron app now includes a custom menu bar that follows the app's dark theme and provides easy access to terminal status information and common actions.

## Menu Structure

### File Menu

- **Select Folder** (Cmd/Ctrl+O): Open folder selection dialog
- **Quit** (Cmd/Ctrl+Q): Exit the application

### View Menu

- **Reload**: Reload the current view
- **Force Reload**: Force reload the current view
- **Toggle DevTools**: Show/hide developer tools
- **Zoom Controls**: Adjust zoom level
- **Toggle Fullscreen**: Enter/exit fullscreen mode

### Terminal Status Menu

This is the main menu that displays the current status of various components:

- **Status**: Shows if terminal is active (PTY Active, Fallback Active, or Inactive)
- **Processes**: Shows the current number of running agent processes
- **PTY**: Shows if PTY is available (✓ Available or ✗ Not Available)
- **Vite**: Shows if Vite is running (✓ Running or ✗ Stopped)
- **Working Dir**: Shows the current working directory
- **Start Vite**: Start Vite development server (enabled when folder is selected)
- **Stop Vite**: Stop Vite development server (enabled when Vite is running)
- **Force Cleanup**: Force cleanup all terminal processes

### Help Menu

- **About**: Shows application information

## Status Updates

The menu status is automatically updated every 2 seconds and whenever relevant events occur:

- When Vite starts/stops
- When terminal processes are created/destroyed
- When persistent terminals are created/destroyed
- After cleanup operations

## Theme Integration

The menu now follows the app's dark theme, making all status information clearly visible. The status items are disabled (non-clickable) but display real-time information about the system state.

## Keyboard Shortcuts

- **Cmd/Ctrl+O**: Select folder
- **Cmd/Ctrl+Q**: Quit application
- **F12**: Toggle DevTools (system default)

## Benefits

1. **Visibility**: Status information is now clearly visible in the menu bar
2. **Accessibility**: Easy access to common actions without navigating the UI
3. **Real-time Updates**: Status information is always current
4. **Theme Consistency**: Menu follows the app's dark theme
5. **Quick Actions**: Direct access to start/stop Vite and cleanup operations
