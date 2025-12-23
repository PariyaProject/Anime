# project-structure Specification

## Purpose
TBD - created by archiving change refactor-project-structure. Update Purpose after archive.
## Requirements
### Requirement: Unified Data Storage Structure
The project SHALL organize all data files in a dedicated `data/` directory with clear separation of concerns.

#### Scenario: Data file organization
- **WHEN** new data files are created during development
- **THEN** they SHALL be placed in appropriate subdirectories under `data/`
- **AND** SHALL follow the naming convention `data/{purpose}/{category}/`

#### Scenario: Production vs. test data separation
- **WHEN** locating data files
- **THEN** production data SHALL be in `data/proxy/`
- **AND** testing artifacts SHALL be in `data/testing/`
- **AND** archived data SHALL be in `data/archive/`

### Requirement: Clean Project Root Directory
The project root directory SHALL contain only essential project files and directories.

#### Scenario: Root directory contents
- **WHEN** viewing the project root
- **THEN** it SHALL contain only: `cycani-proxy/`, `openspec/`, `data/`, `CLAUDE.md`, `README.md`, `.gitignore`
- **AND** SHALL NOT contain debug or testing JSON files
- **AND** SHALL NOT contain the legacy `clean/` directory

### Requirement: Proxy Server Code Organization
The cycani-proxy server SHALL separate source code from data files.

#### Scenario: Server directory structure
- **WHEN** examining the cycani-proxy directory
- **THEN** source code SHALL be in `cycani-proxy/src/`
- **AND** static web files SHALL remain in `cycani-proxy/public/`
- **AND** configuration SHALL be in `cycani-proxy/` root
- **AND** data files SHALL NOT be in the cycani-proxy directory

### Requirement: File Path Reference Updates
All code references to data files SHALL be updated to match the new directory structure.

#### Scenario: Server data access
- **WHEN** the proxy server accesses watch history
- **THEN** it SHALL use the new path `../data/proxy/watch-history.json`
- **AND** all file operations SHALL work correctly with the new paths

#### Scenario: Documentation references
- **WHEN** documentation mentions file locations
- **THEN** it SHALL reference the new organized structure
- **AND** SHALL NOT contain outdated file paths

### Requirement: Legacy Code Removal
The project SHALL remove legacy userscripts that are no longer maintained while preserving their content for archival purposes.

#### Scenario: Legacy userscript directory cleanup
- **WHEN** handling the `clean/` directory
- **THEN** its contents SHALL be archived to `data/archive/legacy-userscripts/`
- **AND** the empty `clean/` directory SHALL be deleted
- **AND** no functional code SHALL be lost (the scripts are legacy)

### Requirement: Version Control Configuration
The project SHALL include a comprehensive .gitignore file to prevent unnecessary files from being committed to version control.

#### Scenario: .gitignore rules
- **WHEN** examining the .gitignore file
- **THEN** it SHALL exclude Node.js artifacts (`node_modules/`, `npm-debug.log`)
- **AND** it SHALL exclude runtime data and cache files
- **AND** it SHALL exclude OS and IDE files
- **AND** it SHALL include important configuration and data files

#### Scenario: .gitignore effectiveness
- **WHEN** running `git status`
- **THEN** only essential project files SHALL appear as untracked
- **AND** ignored files SHALL NOT appear in git status

### Requirement: Redundant File Cleanup
The project SHALL remove redundant and unnecessary debug/testing files while preserving important information.

#### Scenario: Debug file cleanup
- **WHEN** reviewing test snapshots
- **THEN** clearly redundant files SHALL be moved to `data/archive/`
- **AND** unique test data SHALL be organized in `data/testing/`
- **AND** no important debugging information SHALL be lost

