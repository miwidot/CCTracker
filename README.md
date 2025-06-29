# CCTracker - Claude Code CLI Cost Monitoring Tool

<div align="center">

![CCTracker Logo](https://via.placeholder.com/200x100/6366f1/ffffff?text=CCTracker)

**Professional Claude Code CLI usage monitoring and cost analytics**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-191970?logo=Electron&logoColor=white)](https://www.electronjs.org/)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Screenshots](#screenshots) • [Contributing](#contributing)

</div>

## Overview

CCTracker is a comprehensive desktop application specifically designed for monitoring **Claude Code CLI** usage and costs. Built with React and Electron, it provides real-time tracking, advanced analytics, and detailed insights into your Claude Code command-line tool consumption patterns.

> **Important**: This tool monitors the **Claude Code CLI** (claude.ai/code) usage and costs, not the Claude.ai web interface. CCTracker tracks API usage from the command-line tool that developers use for coding assistance.

### 🎯 Key Benefits

- **Real-time Monitoring**: Automatically tracks Claude Code CLI usage with live file monitoring
- **Cost Analytics**: Detailed cost breakdowns with multi-currency support (USD, EUR, GBP, JPY, CNY, MYR)
- **Business Intelligence**: Advanced analytics with predictive insights and optimization recommendations
- **Multi-language Support**: Available in 6 languages (English, German, French, Spanish, Japanese, Chinese)
- **Professional UI**: Modern, accessible interface with multiple themes including dark mode and Catppuccin themes

## Features

### 📊 **Dashboard & Analytics**
- **Real-time Usage Tracking**: Monitor Claude Code CLI API calls as they happen
- **Cost Breakdown**: Detailed analysis by model, project, and time period
- **Token Analytics**: Input/output token tracking with cache optimization metrics
- **Session Management**: Track coding sessions and their efficiency
- **Project-level Analytics**: Drill down into specific project usage patterns

### 💰 **Cost Management**
- **Multi-currency Support**: View costs in 6 different currencies with live exchange rates
- **Cache Savings Tracking**: Monitor cache read/write tokens and cost savings
- **Budget Predictions**: Forecast monthly costs based on usage patterns
- **Cost Optimization**: AI-powered recommendations for reducing API costs

### 📈 **Business Intelligence**
- **Usage Patterns**: Identify peak usage times and efficiency opportunities
- **Model Efficiency Analysis**: Compare performance and cost-effectiveness across Claude models
- **Anomaly Detection**: Automatic detection of unusual usage patterns
- **Trend Analysis**: Historical data analysis with growth projections

### 🌍 **Internationalization**
- **6 Languages**: English, German, French, Spanish, Japanese, Chinese (Simplified)
- **Cultural Localization**: Proper date/time formatting and currency display
- **RTL Support**: Ready for right-to-left languages

### 🎨 **User Experience**
- **Professional Themes**: Light, Dark, and 4 Catppuccin theme variants
- **Responsive Design**: Works seamlessly across different screen sizes
- **Accessibility**: WCAG 2.1 compliant with keyboard navigation and screen reader support
- **Smooth Animations**: Polished UI with smooth transitions and loading states

### 📤 **Data Export**
- **Multiple Formats**: Export data as CSV, JSON, or Excel
- **Flexible Filtering**: Export specific date ranges or projects
- **Scheduled Exports**: Set up automatic data exports (planned feature)

## Installation

### Prerequisites

- **Node.js**: Version 18.0 or higher
- **Claude Code CLI**: Installed and configured for API access ([claude.ai/code](https://claude.ai/code))
- **Operating System**: macOS 10.14+ or Linux (Ubuntu 18.04+)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CCTracker.git
   cd CCTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Building Distributables

```bash
# Build for current platform
npm run package

# Build for specific platforms
npm run package:mac      # macOS (Universal)
npm run package:linux    # Linux (x64)
```

## Usage

### Initial Setup

1. **Launch CCTracker**: Open the application after installation
2. **Configure Settings**: Set your preferred language, theme, and currency
3. **Start Claude Code CLI**: Use Claude Code CLI normally - CCTracker automatically detects usage
4. **Monitor Usage**: View real-time updates in the dashboard

### Core Workflows

#### **Dashboard Monitoring**
- View real-time cost and token usage
- Monitor active sessions and recent activity
- Track daily/weekly/monthly spending trends

#### **Project Analytics**
- Click on any project card to view detailed analytics
- Analyze model efficiency and cache utilization
- Review cost trends and optimization opportunities

#### **Business Intelligence**
- Access advanced analytics and predictive insights
- Generate cost forecasts and budget recommendations
- Identify usage patterns and optimization opportunities

#### **Data Export**
- Export usage data for external analysis
- Generate reports for cost accounting
- Archive historical data for compliance

### Configuration

CCTracker automatically detects Claude Code CLI configuration. For manual setup:

1. **Settings Panel**: Access via the gear icon in the header
2. **Data Location**: CCTracker monitors `~/.claude/projects/` by default (Claude Code CLI log files)
3. **Currency Rates**: Automatically updated with live exchange rates
4. **Themes & Language**: Customize appearance and localization

## Technical Architecture

### Technology Stack

- **Frontend**: React 18.3+ with TypeScript 5.8+
- **Desktop Framework**: Electron 37.0+
- **Build System**: Webpack 5.99+ with separate main/renderer configs
- **Styling**: Tailwind CSS 4.1+ with CSS custom properties
- **Charts**: Recharts 2.15+ for data visualization
- **Internationalization**: react-i18next 15.5+
- **Testing**: Jest 29.7+ with React Testing Library

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Claude Code CLI │───▶│   File System   │───▶│   CCTracker     │
│   (JSONL logs)  │    │   Monitoring    │    │   Dashboard     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Cost Engine   │
                    │   & Analytics   │
                    └─────────────────┘
```

- **File Monitoring**: Real-time JSONL file parsing from Claude Code CLI
- **Cost Calculation**: Accurate pricing with cache token optimization
- **Data Processing**: In-memory caching with persistent storage
- **IPC Communication**: Secure bridge between main and renderer processes

### Project Structure

```
CCTracker/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Application entry point
│   │   ├── ipc/             # IPC handlers
│   │   ├── services/        # Core business logic
│   │   └── utils/           # Utilities
│   ├── renderer/            # React frontend
│   │   ├── components/      # UI components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── i18n/           # Internationalization
│   │   └── styles/         # Global styles
│   └── shared/             # Shared types & utilities
│       ├── types.ts        # TypeScript interfaces
│       ├── constants.ts    # App constants
│       └── utils/          # Shared utilities
├── webpack.*.config.js     # Build configurations
├── package.json           # Dependencies & scripts
└── README.md             # This file
```

## Development

### Development Environment

1. **Clone & Install**
   ```bash
   git clone <repository-url>
   cd CCTracker
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```
   This starts:
   - Webpack dev server for React (port 8080)
   - Main process build watcher
   - Electron app with hot reload

3. **Code Quality**
   ```bash
   npm run lint          # ESLint checking
   npm run type-check    # TypeScript validation
   npm test             # Jest test suite
   ```

### Contributing Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow code standards**: ESLint, TypeScript strict mode, React best practices
3. **Add tests** for new functionality
4. **Update documentation** for any API changes
5. **Submit a pull request** with clear description

### Code Standards

- **TypeScript**: Strict mode enabled, comprehensive type coverage
- **React**: Modern hooks-based components, Context API for state
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Internationalization**: All user-facing text must be translatable
- **Testing**: Unit tests for business logic, integration tests for workflows

## Security & Privacy

### Data Handling

- **Local Storage**: All data stored locally on your machine
- **No Cloud Sync**: No data transmitted to external servers
- **File Access**: Only reads Claude CLI logs, no modification
- **Privacy First**: Your API usage data never leaves your device

### Security Features

- **Sandboxed Renderer**: Electron context isolation enabled
- **IPC Validation**: All inter-process communication validated
- **No Remote Code**: No external code execution
- **Audit Trail**: All file access logged for transparency

## Troubleshooting

### Common Issues

**Q: CCTracker not detecting Claude Code CLI usage**
- Verify Claude Code CLI is installed and configured ([claude.ai/code](https://claude.ai/code))
- Check that JSONL logging is enabled in Claude Code CLI
- Ensure CCTracker has file system permissions to read `~/.claude/projects/`

**Q: Cost calculations seem incorrect**
- Verify currency exchange rates are up to date
- Check if cache tokens are being calculated properly
- Review model pricing in settings

**Q: Application won't start**
- Ensure Node.js 18+ is installed
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check for port conflicts (default: 8080)

### Performance Optimization

- **Large Datasets**: CCTracker handles 10K+ entries efficiently
- **Memory Usage**: Automatic cleanup prevents memory leaks
- **File Monitoring**: Optimized for minimal CPU usage
- **UI Rendering**: Virtualized lists for large data sets

## Roadmap

### Upcoming Features

- **🔄 v1.1** (Q2 2024)
  - Automated backup and restore
  - Advanced filtering and search
  - Custom dashboard widgets

- **🎯 v1.2** (Q3 2024)
  - Team collaboration features
  - API usage quotas and alerts
  - Integration with project management tools

- **🚀 v2.0** (Q4 2024)
  - Enhanced Claude Code CLI integration
  - Advanced machine learning insights
  - Cloud sync option (optional)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

### Getting Help

- **Documentation**: Check this README and inline help
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Join community discussions
- **Email**: Contact maintainers for enterprise support

### Community

- **GitHub**: [CCTracker Repository](https://github.com/yourusername/CCTracker)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/CCTracker/discussions)
- **Issues**: [Bug Reports](https://github.com/yourusername/CCTracker/issues)

---

<div align="center">

**Built with ❤️ for the Claude Code CLI community**

[⭐ Star this repo](https://github.com/yourusername/CCTracker) if you find it helpful!

</div>