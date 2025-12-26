# Change: Add Unified Development Experience

## Why
Currently, developers must navigate to separate directories (`cycani-proxy/` and `cycani-proxy/frontend/`) and run different commands to start the backend server and frontend dev server. This manual process is inefficient, error-prone, and increases friction during development. There is no centralized way to configure custom ports or manage both services simultaneously.

## What Changes
- **NEW** Root-level npm scripts for unified service management
- **NEW** Configuration file for custom port settings
- **NEW** Process management scripts for starting/stopping both frontend and backend
- **NEW** Development mode script that runs both services concurrently with configurable ports
- **NEW** Build integration script to build frontend and start backend in one command
- **MODIFIED** CLAUDE.md documentation to reflect new development workflow
- **MODIFIED** README.md with updated quick start instructions

## Impact
- **Affected specs**: `dev-automation` (NEW capability)
- **Affected code**:
  - Root `package.json` (NEW)
  - Root `dev.config.js` or `dev.config.json` (NEW configuration file)
  - `CLAUDE.md` (updated Commands section)
  - `README.md` (updated quick start)
  - `.gitignore` (updated for new config files)
- **Breaking changes**: None (existing workflows still work, new commands are additive)
- **Migration**: Developers may opt-in to using new commands, old manual process still functional
