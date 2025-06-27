# Task: Core Services Implementation for CCTracker

## Goal
Implement the five main services for the CCTracker application:
1. UsageService - handles JSONL parsing, cost calculation, and data storage
2. FileMonitorService - monitors file system for changes in Claude CLI output
3. SettingsService - manages application settings
4. CurrencyService - handles currency conversion
5. ExportService - handles data export to various formats

## Requirements
- Proper TypeScript typing
- Error handling and edge cases
- Follow architecture from CTRACKER_COMPLETE.md
- Use MODEL_PRICING constants for cost calculation
- Handle real-time data processing
- Include proper logging/debugging
- Production-ready code

## Implementation Plan
1. ✅ Create feature branch: feature/core-services-implementation
2. ✅ Analyze existing constants and types
3. ✅ Implement UsageService (JSONL parsing, cost calculation)
4. ✅ Implement FileMonitorService (file system monitoring)
5. ✅ Implement SettingsService (settings management)
6. ✅ Implement CurrencyService (currency conversion)
7. ✅ Implement ExportService (data export)
8. ✅ Fix IPC handlers and main.ts integration
9. ✅ TypeScript compilation successful
10. ⏳ Create PR for review

## Architecture Notes
- Services will be located in `/src/main/services/`
- Each service should be self-contained with clear interfaces
- Use shared types from `/src/shared/types.ts`
- Use constants from `/src/shared/constants.ts`
- Follow IPC patterns for Electron communication

## Progress
- [x] Branch created
- [x] Services implemented (5/5 completed)
- [x] Dependencies installed and configured
- [x] TypeScript compilation successful
- [x] IPC handlers fixed and integrated
- [ ] PR created and ready for review

## Services Implemented
1. **UsageService** - Complete JSONL parsing, cost calculation, data storage
2. **FileMonitorService** - File system monitoring with chokidar, real-time events
3. **SettingsService** - Application settings management with validation
4. **CurrencyService** - Currency conversion with caching and auto-updates
5. **ExportService** - Data export to CSV, JSON, Excel, PDF formats