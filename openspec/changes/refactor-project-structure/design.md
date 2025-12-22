## Context
The project has evolved organically with extensive development and testing activities, resulting in scattered files and mixed purposes throughout the directory structure. The codebase contains dual components (Tampermonkey userscripts and Node.js proxy server) with different organizational needs.

### Current Issues Identified:
1. **Root directory clutter**: 13 debug/snapshot JSON files in root
2. **Data file scattering**: 16 JSON files mixed with server code in cycani-proxy/
3. **Testing artifacts mixed with production**: Screenshots and debug files alongside production code
4. **Redundant files**: Multiple similar snapshot files with overlapping content
5. **Legacy code**: clean/ directory contains outdated userscripts that are no longer needed
6. **No version control**: Missing .gitignore file leading to potential commit of unnecessary files
7. **No clear separation**: Development artifacts vs. production files

## Goals / Non-Goals
- **Goals**:
  - Clean, maintainable project structure
  - Clear separation of production code, data, and testing artifacts
  - Unified data storage strategy
  - Improved developer experience
- **Non-Goals**:
  - No functional code changes
  - No API modifications
  - No breaking changes to existing functionality

## Decisions
- **Decision**: Create dedicated `data/` directory for all JSON data files
- **Rationale**: Separates data concerns from code, easier backup and management
- **Decision**: Subdivide `data/` by purpose (testing, production, cache)
- **Rationale**: Clear organization, prevents mixing of different data types
- **Decision**: Remove clearly redundant test snapshots
- **Rationale**: Reduces clutter, keeps only meaningful test artifacts
- **Alternatives considered**:
  - Keep current structure (rejected - too messy)
  - Move everything to cycani-proxy/data/ (rejected - couples data too tightly to server)

## Target Directory Structure
```
D:\Code\ClaudeCode\
├── cycani-proxy/                   # Proxy server (cleaned)
│   ├── public/                     # Static web files
│   ├── src/                        # Server source code (moved from root)
│   ├── package.json                # Dependencies
│   └── package-lock.json           # Lock file
├── data/                           # NEW: Unified data storage
│   ├── proxy/                      # Proxy server data
│   │   ├── watch-history.json
│   │   ├── anime-cache/
│   │   └── runtime/
│   ├── testing/                    # Test and debug artifacts
│   │   ├── snapshots/
│   │   ├── debug/
│   │   └── screenshots/
│   └── archive/                    # Old/backed up data
├── openspec/                       # Specifications (unchanged)
├── docs/                          # Documentation (cleaned)
├── .gitignore                     # NEW: Version control rules
├── CLAUDE.md                      # Project instructions
└── README.md                      # Project documentation
```

## Risks / Trade-offs
- **Risk**: Breaking existing file path references in code/scripts
- **Mitigation**: Update all file paths in code during implementation
- **Risk**: Losing important debug information during cleanup
- **Mitigation**: Review files before deletion, archive important ones
- **Risk**: Accidentally deleting important legacy userscripts
- **Mitigation**: clean/ directory contains outdated v14.x userscripts that are no longer maintained
- **Trade-off**: More directories vs. clearer organization
- **Decision**: Favor clarity over minimal directory count

## .gitignore Strategy
The new .gitignore file will exclude:
- Node.js artifacts: `node_modules/`, `npm-debug.log`, `.env`
- Runtime data: `data/proxy/runtime/*`, `data/testing/debug/*`
- Large files: `*.log`, `*.tmp`, cache files
- OS files: `.DS_Store`, `Thumbs.db`
- IDE files: `.vscode/`, `.idea/`
- Backup files: `*~`, `*.bak`

Included in version control:
- Source code and configuration files
- Important static data: `watch-history.json`
- Documentation and specs
- Test snapshots (organized structure)

## Migration Plan
1. **Phase 1**: Create new directory structure
2. **Phase 2**: Move data files systematically
3. **Phase 3**: Update code references to new paths
4. **Phase 4**: Clean up redundant files
5. **Phase 5**: Verify all functionality works
6. **Rollback**: Keep backup of original structure until verification complete

## Open Questions
- Should version control ignore certain data files (.gitignore updates)?
- How to handle cycani-proxy runtime data vs. static configuration data?
- Archive strategy for old test snapshots - keep some as reference?