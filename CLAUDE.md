# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains specifications for CCTracker - a comprehensive cost tracking system for Claude API usage. The project is transitioning from a Rust/Tauri implementation to a React/Electron standalone application.

## Architecture

**Technology Stack:**
- **Frontend**: React 18.3.1 with TypeScript 5.8.3
- **Desktop Framework**: Electron 37.0.0
- **Build System**: Webpack 5.99.9 with separate configs for main/renderer processes
- **Styling**: Tailwind CSS 4.1.10 with pure CSS transitions
- **Internationalization**: react-i18next 15.5.3
- **Charts**: Recharts 2.15.0
- **Icons**: Heroicons 2.2.0
- **Testing**: Jest 29.7.0

**Core Architecture:**
- **Electron Main Process**: Node.js backend handling file system operations, data processing, and IPC communication
- **Electron Renderer Process**: React frontend with dashboard components, charts, and user interface
- **Data Flow**: Claude CLI → JSONL Files → File System Monitor → Parser → Cost Calculator → In-Memory Cache → IPC → React UI

## Development Commands

```bash
# Development (concurrent main and renderer processes)
npm run dev

# Individual development processes
npm run dev:renderer    # Start webpack dev server for React frontend
npm run dev:main        # Build and watch Electron main process

# Production build
npm run build           # Build both main and renderer processes
npm run build:main      # Build Electron main process only
npm run build:renderer  # Build React frontend only

# Application lifecycle
npm start              # Start built Electron app
npm run package        # Package app with electron-builder

# Code quality
npm run lint           # ESLint on TypeScript/React files
npm run type-check     # TypeScript compilation check without emit
npm test              # Run Jest tests
```

## File Structure

```
src/
├── main/              # Electron main process (Node.js)
│   ├── main.ts        # Main Electron entry point
│   ├── ipc/           # IPC handlers for renderer communication
│   ├── services/      # Data processing, file monitoring, cost calculation
│   └── utils/         # Utility functions
├── renderer/          # React frontend (Electron renderer)
│   ├── index.tsx      # React entry point
│   ├── components/    # React components including UsageDashboard
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API layer and data services
│   ├── types/         # TypeScript interfaces
│   ├── i18n/          # Internationalization files
│   └── styles/        # Global styles and Tailwind config
└── shared/            # Shared types and utilities between main/renderer
```

## Key Features

- **Multi-language Support**: English, German, French, Spanish, Japanese, Chinese
- **Theme System**: Light, Dark, Catppuccin themes with pure CSS transitions
- **Multi-currency Support**: USD, EUR, GBP, JPY, CNY, MYR with real-time conversion
- **Real-time Monitoring**: File system monitoring of Claude CLI JSONL output
- **Advanced Analytics**: Cost breakdown, usage patterns, session tracking
- **Export Capabilities**: Multiple format support for usage data

## Data Processing Pipeline

1. **File Monitoring**: Watch ~/.claude/projects/ for JSONL files
2. **Stream Processing**: Parse JSONL entries in real-time
3. **Deduplication**: Prevent double-counting of usage events
4. **Cost Calculation**: Apply latest 2025 pricing models
5. **Caching**: In-memory storage with persistence
6. **IPC Communication**: Secure bridge between main and renderer processes
7. **UI Updates**: React components with real-time data updates

## Development Guidelines

- **Webpack Configuration**: Separate configs for main (Node.js target) and renderer (web target) processes
- **IPC Security**: Use context isolation with secure preload scripts
- **Performance**: Optimize bundle size with tree-shaking and code splitting
- **Accessibility**: WCAG 2.1 compliance for all UI components
- **Type Safety**: Full TypeScript coverage with strict compiler options
- **Testing**: Unit tests for core algorithms, integration tests for IPC communication

## Migration Context

This project migrates from an existing Rust/Tauri implementation, maintaining 100% feature parity while adding enhanced capabilities. All Rust algorithms have equivalent JavaScript implementations with identical logic and data structures.