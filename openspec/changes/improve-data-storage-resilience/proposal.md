# Change: Improve Data Storage Resilience and Organization

## Why

The current implementation has several issues that affect server stability and code organization:

1. **Server crash vulnerability**: When the `watch-history.json` file is corrupted or contains invalid JSON, the `JSON.parse()` error is caught, but if the file is deleted along with its parent directory, or if there's a race condition during file operations, the server can crash or fail to start.

2. **Data and configuration not separated**: Runtime user data (watch history) is mixed with application configuration concerns. Deleting runtime data should not affect server startup or operation.

3. **Data file location concerns**: The user raised concerns about data files being placed in locations that seem disconnected from the source code organization (`data/` directory is outside the main application directory).

## What Changes

- **Relocate data files to application directory**: Move `watch-history.json` from `data/proxy/` to `cycani-proxy/config/` for better organization
- **Add graceful data file initialization**: Ensure data directories and files are created automatically if missing, with proper error handling that never crashes the server
- **Add data file validation**: Validate data file content before parsing and recover from corrupted files automatically
- **Add comprehensive error handling**: All file operations should handle errors gracefully and provide meaningful logging

## Impact

- Affected specs: `project-structure`
- Affected code:
  - `cycani-proxy/src/server.js` - `WatchHistoryManager` class and file path constants
  - `data/proxy/watch-history.json` → `cycani-proxy/config/watch-history.json` (migrate existing data)
  - New error recovery and validation logic
- Breaking changes:
  - Data file location changes (existing data will be migrated automatically)
- Benefits:
  - Server will continue to run even if data files are deleted or corrupted
  - Clear separation between configuration and runtime data
  - Better error messages and recovery capabilities
  - No breaking changes to existing functionality
