## Context

The project currently has a two-tier architecture:
- **Backend**: Node.js/Express server in `cycani-proxy/` (default port 3006)
- **Frontend**: Vue 3 + Vite SPA in `cycani-proxy/frontend/` (default port 3000)

Developers must currently:
1. Navigate to `cycani-proxy/` and run `npm run dev` for backend
2. Navigate to `cycani-proxy/frontend/` and run `npm run dev` for frontend
3. Manage two separate terminal windows
4. Manually configure ports via editing individual files or using env vars

This creates friction for:
- New developers onboarding
- Quick development iterations
- Port customization for running multiple instances
- CI/CD pipeline configuration

**Stakeholders**:
- Developers (primary) - need faster startup workflow
- CI/CD systems - need unified build and start commands
- Project maintainers - need consistent onboarding experience

## Goals / Non-Goals

**Goals**:
1. Single command to start both frontend and backend for development
2. Configurable ports via configuration file (not code editing)
3. Environment variable overrides for port customization
4. Graceful shutdown of both services with one command
5. Backward compatibility - existing workflows must still work
6. Production build + server start with single command

**Non-Goals**:
1. Hot reload between frontend and backend (out of scope for this change)
2. Advanced process monitoring (PID files, auto-restart on crash)
3. Cross-platform process management beyond npm scripts
4. Docker or container orchestration (separate concern)
5. Production deployment automation (this is dev-experience focused)

## Decisions

### Decision 1: Tool Selection for Concurrent Process Management

**Choice**: Use `npm-run-all` for concurrent process management

**Rationale**:
- Lightweight, widely used in Node.js ecosystem
- Already npm-based, consistent with existing tooling
- Cross-platform (Windows, macOS, Linux)
- Simple syntax: `npm-run-all --parallel dev:backend dev:frontend`
- No additional build steps or native dependencies

**Alternatives considered**:
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| `concurrently` | More features, better output formatting | Heavier dependency | `npm-run-all` is simpler for basic needs |
| `nodemon` clusters | Already a dependency | Backend-only, can't manage frontend dev server | Not suitable for multi-process |
| Custom Node script | Maximum control | More code to maintain, reinventing the wheel | Prefer existing tool |
| Shell scripts | No dependencies | Platform-specific, harder to maintain | Want cross-platform solution |

### Decision 2: Configuration File Format

**Choice**: JavaScript configuration file (`dev.config.js`) with fallback to JSON

**Rationale**:
- JavaScript allows for comments and programmatic configuration
- Can validate ports at load time (numeric range checking)
- Can support environment variable interpolation
- Fallback to JSON for simpler use cases

**Configuration schema**:
```javascript
{
  backend: {
    port: 3006,           // Default backend port
    command: 'npm run dev',
    directory: './cycani-proxy'
  },
  frontend: {
    port: 3000,           // Default frontend port
    command: 'npm run dev',
    directory: './cycani-proxy/frontend'
  },
  build: {
    command: 'npm run build',
    directory: './cycani-proxy/frontend'
  }
}
```

**Environment variable overrides**:
- `BACKEND_PORT` - Override backend port
- `FRONTEND_PORT` - Override frontend port
- `DEV_CONFIG` - Path to custom config file

### Decision 3: Root Package.json Structure

**Choice**: Create new root `package.json` with workspace-aware scripts

**Rationale**:
- Standard npm approach for multi-service projects
- No new tooling required for developers
- Scripts can delegate to subdirectories using `--prefix` flag
- Consistent with Node.js ecosystem conventions

**Root package.json scripts**:
```json
{
  "scripts": {
    "dev": "npm-run-all --parallel dev:backend dev:frontend",
    "dev:backend": "npm run dev --prefix cycani-proxy",
    "dev:frontend": "npm run dev --prefix cycani-proxy/frontend",
    "build": "npm run build --prefix cycani-proxy/frontend",
    "start": "npm start --prefix cycani-proxy",
    "stop": "node scripts/stop.js",
    "install:all": "npm install && npm install --prefix cycani-proxy && npm install --prefix cycani-proxy/frontend"
  }
}
```

### Decision 4: Process Cleanup Strategy

**Choice**: Spawn processes with stdio inheritance and trap SIGINT/SIGTERM

**Rationale**:
- Simple, reliable cleanup using Node.js `child_process`
- Inherits parent process stdio for visible output
- Standard signal handling for graceful shutdown
- No external dependencies for process management

**Implementation**:
```javascript
// scripts/dev.js - optional enhanced script
const { spawn } = require('child_process');

const processes = [];

function startService(config) {
  const proc = spawn('npm', ['run', config.command], {
    cwd: config.directory,
    stdio: 'inherit',
    env: { ...process.env, PORT: config.port }
  });
  processes.push(proc);
  return proc;
}

process.on('SIGINT', () => {
  processes.forEach(p => p.kill('SIGINT'));
});
```

## Risks / Trade-offs

### Risk 1: Port Conflicts

**Risk**: Developer's configured ports may already be in use by other services

**Mitigation**:
- Check port availability before starting services
- Provide helpful error message with alternative port suggestion
- Document port conflict resolution in troubleshooting guide

### Risk 2: Platform-Specific Issues

**Risk**: Windows vs Unix differences in process management

**Mitigation**:
- Use cross-platform tools (`npm-run-all`, `cross-env`)
- Test on both Windows and Unix-like systems
- Document any platform-specific workarounds

### Risk 3: Dependency Bloat

**Risk**: Adding `npm-run-all` increases project dependencies

**Mitigation**:
- Single, well-maintained dependency (not a proliferation)
- Can be removed if project moves to different approach
- Alternative: use native npm `&` operator for Unix-only (not chosen for cross-platform requirement)

### Risk 4: Breaking Existing Workflows

**Risk**: Changes might break developer muscle memory or scripts

**Mitigation**:
- Keep all existing commands functional (additive only)
- Document both old and new workflows
- New commands are opt-in; old directory-specific commands still work

## Migration Plan

**For existing developers** (optional, no breaking changes):
1. Run `npm install` at project root to install new dependencies
2. Optionally create `dev.config.js` for custom port configuration
3. Use `npm run dev` from root instead of navigating to subdirectories

**For new developers**:
1. Clone repository
2. Run `npm run install:all` from project root (installs all dependencies)
3. Run `npm run dev` to start development environment

**Rollback**:
- If issues arise, developers can revert to old workflow (navigate to directories, run individual commands)
- No changes to existing `cycani-proxy/package.json` or `cycani-proxy/frontend/package.json` required

## Open Questions

1. **Should we include a `scripts/` directory with Node.js helper scripts?**
   - **Decision**: Start with npm-run-all only; add custom scripts only if needed for features like port checking
   - **Rationale**: Minimize complexity; npm-run-all handles basic use case

2. **Should the build command also start the production server?**
   - **Decision**: No, keep `build` and `start` separate
   - **Rationale**: Flexibility for CI/CD pipelines; some may want to build without starting

3. **Should we support hot reload between frontend and backend?**
   - **Decision**: Not in scope for this change
   - **Rationale**: Significant complexity; existing dev servers already have hot reload within their respective domains

4. **What should be the default ports?**
   - **Decision**: Backend: 3006 (current default), Frontend: 3000 (current default)
   - **Rationale**: Maintain consistency with existing setup; configurable via config file
