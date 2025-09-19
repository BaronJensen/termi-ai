# Contributing to Termi AI

Thank you for your interest in contributing to Termi AI! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Search existing issues** to see if your problem has already been reported
2. **Check the documentation** to see if there's a solution already documented
3. **Provide detailed information** including:
   - Your operating system and version
   - Node.js version
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Any error messages or logs

### Suggesting Features

We welcome feature suggestions! When proposing a new feature:

1. **Describe the problem** you're trying to solve
2. **Explain your proposed solution** in detail
3. **Consider the impact** on existing functionality
4. **Provide examples** of how it would work

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/cursovable.git`
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes**
5. **Test thoroughly** (see Testing section below)
6. **Commit your changes** with clear commit messages
7. **Push to your fork**: `git push origin feature/your-feature-name`
8. **Create a Pull Request**

#### Development Setup

```bash
# Install dependencies
npm install

# Rebuild native dependencies
npm run rebuild

# Start development mode
npm run dev

# Run tests (when available)
npm test

# Build the project
npm run build:renderer
```

#### Code Style Guidelines

- **JavaScript/JSX**: Follow the existing code style and use modern ES6+ features
- **React**: Use functional components with hooks when possible
- **CSS**: Follow the existing styling patterns in the project
- **Electron**: Keep main process code minimal and focused
- **Documentation**: Update relevant documentation when adding new features

#### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:

- `feat(chat): add support for markdown rendering`
- `fix(vite): resolve URL detection on Windows`
- `docs(readme): update installation instructions`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 🧪 Testing

### Manual Testing

Before submitting a PR, please test:

- **Cross-platform compatibility** (macOS, Windows, Linux)
- **Different package managers** (npm, yarn, pnpm)
- **Various React/Vite project configurations**
- **Error handling** and edge cases
- **Performance** with different project sizes

### Testing Checklist

- [ ] App launches without errors
- [ ] Project selection works correctly
- [ ] Vite detection and preview functions
- [ ] AI chat integration works
- [ ] History persistence functions
- [ ] Menu features work as expected
- [ ] No console errors or warnings
- [ ] Responsive design on different screen sizes

## 🏗️ Project Architecture

### Key Components

- **`electron/main.cjs`**: Main Electron process
- **`electron/preload.cjs`**: Preload script for secure IPC
- **`electron/runner.cjs`**: Cursor Agent integration
- **`electron/viteRunner.cjs`**: Vite project management
- **`renderer/src/`**: React application components
- **`renderer/src/components/Chat/`**: Chat interface components

### Design Principles

- **Security first**: Context isolation, minimal IPC surface
- **Performance**: Efficient process management and resource usage
- **User experience**: Intuitive interface and responsive design
- **Cross-platform**: Consistent behavior across operating systems
- **Extensibility**: Modular design for future enhancements

## 📋 Pull Request Guidelines

### Before Submitting

1. **Ensure all tests pass** (when available)
2. **Update documentation** if adding new features
3. **Add screenshots** for UI changes
4. **Test on multiple platforms** if possible
5. **Follow the existing code style**

### PR Description Template

```markdown
## Description

Brief description of what this PR accomplishes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tested on macOS
- [ ] Tested on Windows
- [ ] Tested on Linux
- [ ] Manual testing completed

## Screenshots

Add screenshots for UI changes

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🚀 Release Process

### Version Bumping

- **Patch**: Bug fixes and minor improvements
- **Minor**: New features (backward compatible)
- **Major**: Breaking changes

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Release notes written
- [ ] Pre-built binaries tested

## 📚 Additional Resources

- [Project Context](docs/project-context.md) - Technical overview
- [Menu Features](docs/menu-features.md) - Menu system documentation
- [Debug Mode](docs/debug-mode.md) - Troubleshooting guide
- [Electron Documentation](https://electronjs.org/docs)
- [React Documentation](https://reactjs.org/docs)

## 🆘 Need Help?

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Project Wiki**: For detailed documentation

## 🙏 Recognition

Contributors will be recognized in:

- Project README
- Release notes
- Contributor hall of fame (when implemented)

Thank you for contributing to Termi AI! 🚀
