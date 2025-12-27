## Context

The proxy server currently stores user watch history in `data/proxy/watch-history.json`. This location is outside the main application directory and causes organization issues. The `WatchHistoryManager` class handles file operations, but has several resilience issues:

1. **Missing directory creation**: `saveHistory()` doesn't ensure the parent directory exists before writing
2. **No data validation**: `loadHistory()` doesn't validate JSON structure beyond basic parsing
3. **No recovery from corruption**: Corrupted files require manual intervention
4. **Error propagation**: Some errors are caught but not properly handled for graceful degradation

**User concerns:**
- Deleting runtime data (watch history) should not crash the server
- Data file location seems disconnected from source code organization
- Configuration should be separated from runtime data

## Goals / Non-Goals

**Goals:**
- Server MUST start and run successfully even if data files are missing or corrupted
- Data directories MUST be created automatically if they don't exist
- Corrupted data files MUST be automatically recovered with backups
- Clear separation between application configuration and runtime user data
- Meaningful error logging for troubleshooting

**Non-Goals:**
- Moving data files to a different location (current `data/` structure is intentional)
- Implementing a full database system (JSON file storage is sufficient for current scale)
- Multi-user data isolation (current architecture supports future multi-user expansion)
- Data migration from old formats (no legacy data to migrate)

## Decisions

### Decision 1: Move Data Files to Application Directory

**Rationale:** Storing data in `cycani-proxy/config/` is better than the current `data/proxy/` location:
- Keeps application data within the application directory
- Clearer semantic meaning (`config/` indicates configuration/data)
- Easier to find and manage for users
- Still separated from `src/` source code
- Works well with existing `.gitignore` patterns

**Alternatives considered:**
- *Keep `data/proxy/`*: Too disconnected from application code
- *Store in `cycani-proxy/data/`*: Less semantic clarity than `config/`
- *Store in `src/data/`*: Would mix data with source code
- *Store in `cycani-proxy/` root*: Would clutter the root directory

**Migration approach:**
- Automatically migrate existing data from `data/proxy/watch-history.json` to `cycani-proxy/config/watch-history.json` on first run
- Delete old file after successful migration
- Log the migration action

### Decision 2: Add Automatic Directory Creation

**Implementation:** Add an `ensureConfigDirectory()` function that:
- Checks if `cycani-proxy/config/` directory exists
- Creates it with proper permissions if missing
- Logs creation for visibility
- Never throws errors that crash the server

### Decision 3: Add Data File Validation and Recovery

**Implementation:** Add a `validateAndRecoverDataFile()` function that:
- Validates JSON structure before parsing
- Creates backup of corrupted files (with timestamp)
- Returns default empty structure when recovery fails
- Logs all recovery actions for debugging

### Decision 4: Graceful Degradation Strategy

**Implementation approach:**
- All file operations are wrapped in try-catch blocks
- Errors are logged but never crash the server
- API endpoints return empty/default data when file operations fail
- Users see clear error messages via API responses

## Risks / Trade-offs

### Risk: Silent Data Loss

**Risk:** If data file is corrupted and recovery fails, user watch history could be lost.

**Mitigation:**
- Always create backups before any file write operation
- Preserve corrupted files with `.backup` and `.corrupted` extensions
- Log all recovery operations for manual recovery if needed
- Consider implementing periodic automatic backups

### Risk: Performance Impact

**Risk:** Additional validation and directory checking could slow down file operations.

**Mitigation:**
- Directory checks are fast (file system cache)
- JSON validation is minimal for current data sizes
- Only validate on load, not on every save
- Can add caching layer if needed (not required for current scale)

### Trade-off: Complexity vs. Resilience

**Trade-off:** Adding more error handling increases code complexity.

**Resolution:**
- Resilience is critical for user data protection
- Keep implementation focused and well-documented
- Use helper functions to avoid code duplication
- Tests ensure reliability

## Migration Plan

**Steps:**
1. Add new helper functions to `server.js`
2. Update `WatchHistoryManager` to use new functions
3. Test with various file states (missing, empty, corrupted)
4. Deploy and monitor error logs

**Rollback:**
- Changes are backward compatible
- Existing `watch-history.json` files will work without modification
- Can revert by removing new validation calls if needed

## Open Questions

None - the implementation is straightforward and based on established Node.js patterns.

## File Structure After Changes

```
D:\Code\ClaudeCode\
├── cycani-proxy/
│   ├── src/
│   │   └── server.js              # Updated WatchHistoryManager
│   └── config/
│       ├── watch-history.json     # Main data file (auto-created if missing)
│       ├── watch-history.json.backup*  # Automatic backups
│       └── watch-history.json.corrupted* # Preserved corrupted files
├── data/                          # No longer used for runtime data
│   └── archive/                   # Only for archived test artifacts
```

## Error Recovery Flow

```
loadHistory() called
    ↓
File exists?
    No → Return default empty structure
    Yes → Read file
            ↓
        Valid JSON?
            No → Create .corrupted backup
                  → Return default empty structure
            Yes → Validate structure
                      ↓
                  Valid structure?
                      No → Create .corrupted backup
                            → Return default empty structure
                      Yes → Return data
```
