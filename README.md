# 🚀 Cursovable

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/BaronJensen/cursovable)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Electron](https://img.shields.io/badge/Electron-30.0.9-blue.svg)](https://electronjs.org/)

> **Your AI-powered development companion** - A desktop app that combines live project previews with intelligent AI assistance using Cursor Agent.

## ✨ What is Cursovable?

Cursovable is an Electron-based desktop application that revolutionizes your development workflow by providing:

- **🖥️ Live Project Preview**: Automatically detect and embed your React/Vite projects in real-time
- **🤖 AI Development Assistant**: Integrated chat interface powered by Cursor Agent
- **📱 Seamless Workflow**: Side-by-side development with instant AI feedback
- **💾 Persistent History**: Save and review all your AI interactions

Perfect for developers who want to see their code changes live while getting intelligent assistance from AI.

## 🎯 Key Features

### 🚀 Development Environment

- **Automatic Vite Detection**: Works with React/Vite projects out of the box
- **Package Manager Support**: Compatible with yarn, npm, and pnpm
- **Live Preview**: Real-time iframe preview of your development server
- **Smart URL Detection**: Automatically finds and loads your dev server

### 🤖 AI Assistant

- **Cursor Agent Integration**: Built-in chat interface for AI-powered development
- **Streaming Responses**: Real-time AI feedback as you develop
- **Markdown Rendering**: Rich display of AI responses with proper formatting
- **Session Management**: Persistent storage of all AI interactions

### 🖥️ Terminal & Process Management

- **Native PTY Support**: Full terminal emulation with node-pty
- **Process Monitoring**: Real-time status of running development servers
- **Smart Process Control**: Intelligent start/stop of development servers
- **Status Indicators**: Live updates on all system processes

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** and npm/yarn/pnpm
- **Cursor Agent CLI** installed and available in your PATH
- **On macOS**: Xcode Command Line Tools (for native dependencies)

## 📦 Installation

### Option 1: Download Pre-built Release

1. Go to the [Releases page](https://github.com/BaronJensen/cursovable/releases)
2. Download the appropriate version for your platform
3. Install and run the application

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/BaronJensen/cursovable.git
cd cursovable

# Install dependencies
npm install

# Rebuild native dependencies (required for node-pty)
npm run rebuild

# Start development mode
npm run dev
```

## 🚀 Quick Start

1. **Launch the App**: Start Cursovable from your applications menu
2. **Choose Your Project**: Click "Choose folder" and select your React/Vite project
3. **Select Package Manager**: Choose between yarn, npm, or pnpm
4. **Run Development Server**: Click "Run Vite" to start your project
5. **Start Chatting**: Use the AI assistant on the right panel for development help

## 💻 Development

### Available Scripts

```bash
# Development mode (Electron + Vite renderer)
npm run dev

# Development with debug mode enabled
npm run dev:debug

# Development with hot reload for Electron
npm run dev:hot

# Build the renderer (React app)
npm run build:renderer

# Build everything and create distributable packages
npm run dist

# Build everything and create unpacked directory (for testing)
npm run pack
```

### Project Structure

```
cursovable/
├── electron/           # Electron main process
│   ├── main.cjs       # Main entry point
│   ├── preload.cjs    # Preload script for IPC
│   ├── runner.cjs     # Cursor Agent integration
│   └── viteRunner.cjs # Vite project management
├── renderer/          # React application
│   ├── src/          # Source code
│   └── public/       # Static assets
└── docs/             # Documentation
```

## 🔧 Configuration

### Environment Variables

- `CURSOVABLE_DEBUG_MODE=1`: Enable debug mode for development
- `OPENAI_API_KEY`: Your OpenAI API key (optional, passed to cursor-agent)

### Build Configuration

The app is configured to build for multiple platforms:

- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer and `.zip` files
- **Linux**: `.AppImage`, `.deb`, and `.tar.gz` files

## 🐛 Troubleshooting

### Common Issues

**App won't open on macOS**

- Right-click the app and select "Open"
- Go to System Preferences → Security & Privacy → General → "Open Anyway"

**Cursor agent not found**

- Ensure `cursor-agent` is installed and in your PATH
- Verify with `which cursor-agent` in terminal

**Build issues with native dependencies**

- Run `npm run rebuild` to rebuild node-pty
- Ensure you have the latest Node.js version

**Vite detection issues**

- Check that your project has a valid `package.json` with dev scripts
- Verify the development server is running on localhost

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

### Areas for Contribution

- **UI/UX Improvements**: Better responsive design, accessibility
- **Framework Support**: Add support for Next.js, Astro, etc.
- **Performance**: Optimize build times and runtime performance
- **Documentation**: Improve guides and examples

## 📚 Documentation

- [Project Context](docs/project-context.md) - Detailed technical overview
- [Menu Features](docs/menu-features.md) - Custom menu bar documentation
- [Multi-session Implementation](docs/multi-session-implementation.md) - Session management details
- [Debug Mode](docs/debug-mode.md) - Troubleshooting and debugging

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/) for cross-platform desktop apps
- Powered by [Cursor Agent](https://cursor.sh/) for AI development assistance
- UI built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Terminal emulation powered by [node-pty](https://github.com/microsoft/node-pty)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/BaronJensen/cursovable/issues)
- **Discussions**: [GitHub Discussions](https://github.com/BaronJensen/cursovable/discussions)
- **Wiki**: [Project Wiki](https://github.com/BaronJensen/cursovable/wiki)

---

**Made with ❤️ by the Cursovable community**

If you find this project helpful, please consider giving it a ⭐ star on GitHub!
