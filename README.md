# CCTracker - Claude Code CLI Usage Monitor

<div align="center">

![CCTracker Dashboard](img/gh_img.png)

**Professional Claude Code CLI usage monitoring and cost analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Contributing](#contributing)

</div>

## Overview

CCTracker monitors **Claude Code CLI** usage and costs in real-time. Built with React and Electron, it provides comprehensive analytics for developers using the Claude Code command-line tool.

> **Note**: This monitors the Claude Code CLI ([claude.ai/code](https://claude.ai/code)), not the Claude.ai web interface.

## Features

- **📊 Real-time Monitoring**: Live tracking of Claude Code CLI usage and costs
- **💰 Multi-currency Support**: View costs in USD, EUR, GBP, JPY, CNY, MYR with live rates
- **📈 Advanced Analytics**: Usage patterns, model efficiency, anomaly detection
- **🌍 Internationalization**: 6 languages with proper localization
- **🎨 Professional UI**: Light/dark themes + 4 Catppuccin variants
- **📤 Data Export**: CSV, JSON, Excel export with flexible filtering
- **🔒 Privacy-first**: All data stored locally, no cloud sync

## Installation

### Download

Get the latest release from [GitHub Releases](https://github.com/miwi-fbsd/CCTracker/releases):
- **macOS**: Download `.dmg` file
- **Linux**: Download `.deb` or `.tar.gz` file

### Prerequisites

- **Claude Code CLI**: Must be installed and configured ([claude.ai/code](https://claude.ai/code))
- **Operating System**: macOS 10.14+ or Linux (Ubuntu 18.04+)

### From Source

```bash
git clone https://github.com/miwi-fbsd/CCTracker.git
cd CCTracker
npm install
npm run build
npm start
```

## Usage

1. **Install & Launch**: Download and install CCTracker
2. **Auto-detection**: CCTracker automatically monitors `~/.claude/projects/` for Claude CLI usage
3. **Configure**: Set language, theme, and currency in Settings
4. **Monitor**: View real-time usage and costs as you use Claude Code CLI

### Key Workflows

- **Dashboard**: Real-time cost tracking and usage analytics
- **Projects**: Detailed project-level analysis and trends
- **Export**: Generate CSV/JSON reports for external analysis
- **Settings**: Customize themes, language, and currency preferences

## Development

### Tech Stack

- **Frontend**: React 18 + TypeScript 5.8
- **Desktop**: Electron 37
- **Build**: Webpack 5 + Tailwind CSS
- **Charts**: Recharts for data visualization
- **i18n**: react-i18next for 6 languages
- **File Monitoring**: Chokidar for real-time JSONL parsing

### Architecture

```
Claude Code CLI → File Monitor → Cost Engine → React Dashboard
    (JSONL)         (Chokidar)    (Analytics)    (Electron)
```

### Setup

```bash
git clone https://github.com/miwi-fbsd/CCTracker.git
cd CCTracker
npm install
npm run dev          # Development with hot reload
npm run build        # Production build
npm run package      # Create distributable
```

### Scripts

- `npm run dev` - Start development server
- `npm run lint` - ESLint checking
- `npm run type-check` - TypeScript validation
- `npm test` - Jest test suite

## Contributing

1. Fork the repository and create a feature branch
2. Follow code standards: ESLint, TypeScript strict mode, React best practices
3. Add tests for new functionality
4. Submit a pull request with clear description

### Code Standards

- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **React**: Modern hooks-based components with Context API
- **Accessibility**: WCAG 2.1 Level AA compliance
- **i18n**: All user-facing text must be translatable

## Troubleshooting

**Not detecting Claude CLI usage?**
- Verify Claude Code CLI is installed ([claude.ai/code](https://claude.ai/code))
- Check file permissions for `~/.claude/projects/`

**Cost calculations incorrect?**
- Verify currency rates are updated
- Check cache token calculations

**App won't start?**
- Ensure Node.js 18+ is installed
- Clear and reinstall: `rm -rf node_modules && npm install`

## Security & Privacy

- **Local-only**: All data stored locally, no cloud sync
- **Read-only**: Only reads Claude CLI logs, never modifies
- **Sandboxed**: Electron context isolation enabled
- **Privacy-first**: Your usage data never leaves your device

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/miwi-fbsd/CCTracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/miwi-fbsd/CCTracker/discussions)

---

<div align="center">

**Built for the Claude Code CLI community**

[⭐ Star this repo](https://github.com/miwi-fbsd/CCTracker) if you find it helpful!

</div>