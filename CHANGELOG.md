# Changelog

All notable changes to Cursovable will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-08-25

### Fixed

- Fixed performance issue with terminal not cleaning up properly

## [0.1.0] - 2024-12-19

### Added

- **Core Application**: Electron-based desktop app with React/Vite integration
- **Live Project Preview**: Automatic detection and iframe embedding of React/Vite projects
- **AI Development Assistant**: Integrated chat interface powered by Cursor Agent
- **Package Manager Support**: Works with yarn, npm, and pnpm
- **Terminal Integration**: Native PTY support with node-pty
- **Process Management**: Real-time monitoring of development servers
- **History Persistence**: Local storage of AI interactions
- **Cross-platform Support**: macOS, Windows, and Linux compatibility
- **Custom Menu Bar**: Real-time status updates and quick actions
- **Responsive Design**: Tablet and desktop optimized interface

### Technical Features

- **Vite Integration**: Automatic URL detection and preview loading
- **IPC Communication**: Secure inter-process communication between Electron and React
- **Markdown Rendering**: Rich display of AI responses using marked library
- **Session Management**: Multi-session support for different projects
- **Debug Mode**: Enhanced logging and troubleshooting capabilities
- **Hot Reload**: Development mode with automatic reloading

### Build & Distribution

- **Electron Builder**: Automated packaging for multiple platforms
- **Vite Build System**: Modern build tooling for the renderer
- **Asset Management**: Automatic inclusion of static assets
- **Platform-specific Icons**: Custom icons for each operating system

## [Pre-release] - Development Phase

### Foundation

- **Project Architecture**: Established Electron + React architecture
- **Core Components**: Basic chat interface and project preview
- **Terminal Integration**: Initial PTY implementation
- **Vite Runner**: Basic project detection and server management

---

## Version History

- **0.1.0**: Initial stable release with core functionality
- **Pre-release**: Development and testing phase

## Release Notes

### Breaking Changes

- None in current release

### Migration Guide

- No migration required for initial release

### Known Issues

- macOS unsigned app warnings (see README for solutions)
- Some edge cases in Vite URL detection for non-standard configurations

### Future Roadmap

- Enhanced framework support (Next.js, Astro, etc.)
- Improved UI/UX with better responsive design
- Performance optimizations
- Additional AI model integrations
- Plugin system for extensibility

---

For detailed information about each release, please refer to the [GitHub releases page](https://github.com/yourusername/cursovable/releases).
