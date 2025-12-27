## ADDED Requirements

### Requirement: Runtime Data Resilience
The system SHALL handle runtime data file errors gracefully without crashing the server or preventing startup.

#### Scenario: Missing config directory
- **WHEN** the server starts and the `cycani-proxy/config/` directory does not exist
- **THEN** the system SHALL create the directory automatically
- **AND** the server SHALL start successfully

#### Scenario: Missing data file
- **WHEN** the server attempts to load `watch-history.json` and the file does not exist
- **THEN** the system SHALL return an empty default data structure
- **AND** the server SHALL continue to operate normally

#### Scenario: Corrupted JSON data
- **WHEN** the server attempts to load `watch-history.json` and the file contains invalid JSON
- **THEN** the system SHALL preserve the corrupted file with a `.corrupted` timestamp suffix
- **AND** the system SHALL return an empty default data structure
- **AND** the server SHALL continue to operate normally

#### Scenario: Invalid data structure
- **WHEN** the server loads `watch-history.json` and the JSON structure is invalid
- **THEN** the system SHALL preserve the invalid file with a `.corrupted` timestamp suffix
- **AND** the system SHALL return an empty default data structure
- **AND** the server SHALL continue to operate normally

#### Scenario: Write failure recovery
- **WHEN** the server fails to write to `watch-history.json` due to permissions or disk space
- **THEN** the system SHALL log the error with details
- **AND** the server SHALL continue to operate
- **AND** API endpoints SHALL return appropriate error responses to the client

### Requirement: Automatic Config Directory Creation
The system SHALL ensure all required config directories exist before performing file operations.

#### Scenario: Directory creation on save
- **WHEN** the server attempts to save watch history and the `cycani-proxy/config/` directory does not exist
- **THEN** the system SHALL create the directory (including any parent directories)
- **AND** the save operation SHALL succeed

#### Scenario: Directory creation on startup
- **WHEN** the server starts and the `cycani-proxy/config/` directory does not exist
- **THEN** the system SHALL create the directory
- **AND** the server SHALL log the directory creation for visibility

### Requirement: Data File Backup and Recovery
The system SHALL preserve corrupted or invalid data files for potential recovery.

#### Scenario: Corrupted file backup
- **WHEN** a corrupted or invalid `watch-history.json` is detected
- **THEN** the system SHALL create a backup file named `watch-history.json.corrupted.YYYYMMDD-HHMMSS`
- **AND** the original corrupted content SHALL be preserved in the backup
- **AND** a new valid file SHALL be created with default data

#### Scenario: Pre-write backup
- **WHEN** the server is about to write to `watch-history.json`
- **THEN** the system SHALL create a backup file named `watch-history.json.backup`
- **AND** the backup SHALL be overwritten on each successful save (keep only latest)

#### Scenario: Recovery from backup
- **WHEN** data corruption is detected and a recent backup exists
- **THEN** the system MAY attempt to restore from the latest backup
- **AND** the restoration attempt SHALL be logged

### Requirement: Configuration and Runtime Data Separation
The system SHALL clearly distinguish between application configuration and runtime user data.

#### Scenario: Config directory location
- **WHEN** storing runtime data (watch history) and application configuration
- **THEN** files SHALL be placed in `cycani-proxy/config/` directory
- **AND** this directory SHALL be automatically created if missing
- **AND** files SHALL NOT be version controlled (excluded via .gitignore)

#### Scenario: Server independence from data
- **WHEN** runtime data files are deleted or corrupted
- **THEN** the server SHALL still start successfully
- **AND** core API endpoints SHALL still function
- **AND** only data-dependent features SHALL return empty/default results

### Requirement: Comprehensive Error Logging
The system SHALL provide meaningful error logging for all data file operations.

#### Scenario: Directory creation logging
- **WHEN** a data directory is created automatically
- **THEN** the system SHALL log the directory path and creation action
- **AND** the log level SHALL be informational (not warning or error)

#### Scenario: Data corruption logging
- **WHEN** a corrupted data file is detected
- **THEN** the system SHALL log the file path and error details
- **AND** the system SHALL log the backup file location
- **AND** the log level SHALL be warning

#### Scenario: File operation error logging
- **WHEN** a file operation fails (read, write, delete)
- **THEN** the system SHALL log the error code, message, and file path
- **AND** the system SHALL log the context (what operation was being attempted)
- **AND** the log level SHALL be error

#### Scenario: Successful recovery logging
- **WHEN** the system recovers from a data file error
- **THEN** the system SHALL log the recovery action taken
- **AND** the system SHALL log whether default data was returned or backup was used
- **AND** the log level SHALL be informational

## MODIFIED Requirements

### Requirement: File Path Reference Updates
All code references to data files SHALL be updated to match the new directory structure with added resilience features.

#### Scenario: Server data access with new location
- **WHEN** the proxy server accesses watch history
- **THEN** it SHALL use the path `cycani-proxy/config/watch-history.json`
- **AND** it SHALL automatically migrate existing data from `data/proxy/watch-history.json` if present
- **AND** it SHALL automatically create directories if missing
- **AND** it SHALL handle corrupted/missing files gracefully
- **AND** all file operations SHALL include error handling

#### Scenario: Documentation references for data resilience
- **WHEN** documentation mentions data file locations
- **THEN** it SHALL reference the new `cycani-proxy/config/` location
- **AND** it SHALL document the automatic migration from old location
- **AND** it SHALL document the automatic recovery behavior
- **AND** it SHALL explain the separation between configuration and runtime data
