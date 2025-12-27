## 1. Analysis and Planning
- [x] 1.1 Review current `WatchHistoryManager` implementation in `server.js`
- [x] 1.2 Identify all data file access points that could fail
- [x] 1.3 Review the `project-structure` spec for relevant requirements

## 2. Data File Relocation
- [x] 2.1 Update `WATCH_HISTORY_FILE` constant to point to `cycani-proxy/config/watch-history.json`
- [x] 2.2 Add `migrateOldDataFile()` function to migrate from `data/proxy/watch-history.json`
- [x] 2.3 Add migration logic to server startup
- [x] 2.4 Test migration with existing data file
- [x] 2.5 Update `.gitignore` to include `cycani-proxy/config/` pattern

## 3. Data Storage Resilience Implementation
- [x] 3.1 Add `ensureConfigDirectory()` function to create directories if missing
- [x] 3.2 Add `validateAndRecoverDataFile()` function to handle corrupted/invalid data
- [x] 3.3 Update `loadHistory()` to use new validation and recovery
- [x] 3.4 Update `saveHistory()` to ensure directory exists before writing
- [x] 3.5 Add backup creation before any file write operation

## 4. Error Handling Improvements
- [x] 4.1 Add specific error types for different failure scenarios (ENOENT, EACCES, EISDIR)
- [x] 4.2 Add meaningful error logging for all file operations
- [x] 4.3 Ensure server starts successfully even with missing/corrupted data files
- [x] 4.4 Add graceful degradation when file operations fail

## 5. Testing
- [x] 5.1 Test server startup with missing `watch-history.json` file
- [x] 5.2 Test server startup with corrupted JSON in `watch-history.json`
- [x] 5.3 Test server startup with missing `cycani-proxy/config/` directory
- [x] 5.4 Test data migration from old `data/proxy/` location
- [x] 5.5 Test watch history save/load operations after recovery
- [x] 5.6 Test API endpoints continue to work after data file errors

## 6. Documentation Updates
- [x] 6.1 Update CLAUDE.md with new config location and error recovery behavior
- [x] 6.2 Update README.md with new file locations
- [x] 6.3 Add comments explaining data storage resilience strategy
- [x] 6.4 Document the separation between configuration and runtime data
- [x] 6.5 Add troubleshooting section for data file issues
