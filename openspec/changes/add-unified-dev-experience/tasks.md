## 1. Project Root Setup

- [x] 1.1 Create root `package.json` with unified development scripts
- [x] 1.2 Create `dev.config.js` configuration file for port and service settings
- [x] 1.3 Update root `.gitignore` to exclude config overrides and process files

## 2. Development Scripts Implementation

- [x] 2.1 Implement `npm run dev` command to start both frontend and backend concurrently
- [x] 2.2 Implement `npm run dev:backend` to start backend server with custom port
- [x] 2.3 Implement `npm run dev:frontend` to start frontend dev server with custom port
- [x] 2.4 Implement `npm run build` to build frontend and prepare for production
- [x] 2.5 Implement `npm run start` to start production server with built frontend
- [x] 2.6 Implement `npm run stop` command to gracefully stop all running services

## 3. Configuration Management

- [x] 3.1 Add `dev.config.js` with default port configurations (backend: 3006, frontend: 3000)
- [x] 3.2 Support environment variable overrides for ports
- [x] 3.3 Support custom config file via `--config` flag
- [x] 3.4 Add config validation with helpful error messages

## 4. Process Management

- [x] 4.1 Implement concurrent process spawning using `npm-run-all` or similar
- [x] 4.2 Add process cleanup on exit (SIGINT, SIGTERM)
- [x] 4.3 Implement health check for both services
- [x] 4.4 Add startup logging showing service URLs and ports

## 5. Documentation Updates

- [x] 5.1 Update `CLAUDE.md` Commands section with new unified workflow
- [x] 5.2 Update root `README.md` with new quick start guide
- [x] 5.3 Add troubleshooting section for port conflicts
- [x] 5.4 Document configuration options in `README.md`

## 6. Testing and Validation

- [x] 6.1 Test `npm run dev` starts both services correctly
- [x] 6.2 Test custom port configuration via config file and env vars
- [x] 6.3 Test `npm run stop` gracefully terminates all processes
- [x] 6.4 Test `npm run build` creates production build correctly
- [x] 6.5 Test `npm run start` serves production build
- [x] 6.6 Verify existing manual workflow still works (backward compatibility)
