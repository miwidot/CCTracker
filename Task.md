# Task: Replace ALL 'any' Types with Proper TypeScript Interfaces

## Goal
Complete elimination of all 'any' types throughout the codebase, replacing them with proper TypeScript interfaces for 100% type safety.

## Plan
1. **Audit current 'any' usage** - Found 12 files with 'any' types
2. **Examine shared/types.ts** - ✅ Complete - Rich type definitions available
3. **High Priority Files:**
   - preload.ts - IPC method signatures
   - ipcHandlers.ts - IPC handler implementations  
   - Component files with 'any' usage
4. **Create missing interfaces** as needed in shared/types.ts
5. **Fix type assertions** - Replace 'as any' with proper narrowing
6. **Ensure runtime safety** with type guards where needed

## Progress
- [x] Examine shared/types.ts - Rich type system already exists
- [ ] Fix preload.ts IPC signatures
- [ ] Fix ipcHandlers.ts
- [ ] Fix component files
- [ ] Replace type assertions
- [ ] Add missing interfaces
- [ ] Test for any remaining 'any' types

## Files to Fix
1. `/Users/miwi/dev/claudi/CCTracker/src/main/preload.ts`
2. `/Users/miwi/dev/claudi/CCTracker/src/main/ipc/ipcHandlers.ts`
3. `/Users/miwi/dev/claudi/CCTracker/src/renderer/components/UsageDashboard.tsx`
4. `/Users/miwi/dev/claudi/CCTracker/src/renderer/components/SimpleUsageAnalytics.tsx`
5. `/Users/miwi/dev/claudi/CCTracker/src/renderer/components/LanguageSelector.tsx`
6. `/Users/miwi/dev/claudi/CCTracker/src/renderer/components/SettingsModal.tsx`
7. Service files with 'any' usage
8. Test files with 'any' usage

## Notes
- Rich type system already exists in shared/types.ts
- Need to add i18n function types
- Need to add chart/analytics component prop types
- Focus on type safety without breaking functionality