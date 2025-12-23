# Change: Refactor Project Structure and Consolidate Data Storage

## Why
The current project structure has become cluttered with numerous debug JSON files, scattered data storage, and mixed testing/production files, making it difficult to maintain and navigate the codebase effectively.

## What Changes
- **Reorganize debug/snapshot files**: Move all testing and debugging JSON files to a dedicated `data/` directory
- **Consolidate data storage**: Create unified data storage structure for proxy server JSON files
- **Clean up unnecessary files**: Remove redundant test snapshots, debug files, and legacy clean/ directory
- **Organize by purpose**: Separate production code, testing artifacts, and data files clearly
- **Optimize proxy server structure**: Better organize cycani-proxy directory contents
- **Add .gitignore**: Create comprehensive .gitignore file for proper version control

## Impact
- **Affected specs**: None (structural organization only)
- **Affected code**: Project file structure, data file locations
- **Benefits**: Improved maintainability, cleaner development environment, better separation of concerns
- **Files moved**: ~20 JSON debug/testing files, 1 PNG screenshot file
- **Files deleted**: Redundant test snapshots, outdated debug files, and entire clean/ directory
- **Files added**: New .gitignore file for proper version control

**NOTE**: This is a pure organizational change - no functional code behavior will be modified. The clean/ directory contains legacy userscripts that are no longer needed.