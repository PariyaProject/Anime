## ADDED Requirements

### Requirement: Unified Development Startup
The project SHALL provide a single command to start both the frontend and backend development servers concurrently.

#### Scenario: Starting development environment
- **WHEN** a developer runs `npm run dev` from the project root
- **THEN** both the backend server and frontend dev server SHALL start concurrently
- **AND** output from both services SHALL be visible in the terminal
- **AND** the service URLs and ports SHALL be displayed on startup

#### Scenario: Service startup order
- **WHEN** `npm run dev` is executed
- **THEN** both services SHALL start without dependency on each other
- **AND** if one service fails to start, the other SHALL continue running
- **AND** appropriate error messages SHALL be displayed for failed services

### Requirement: Configurable Service Ports
The project SHALL allow developers to configure custom ports for the frontend and backend services through a configuration file.

#### Scenario: Default port configuration
- **WHEN** no custom configuration is provided
- **THEN** the backend SHALL use port 3006 by default
- **AND** the frontend SHALL use port 3000 by default

#### Scenario: Custom port via configuration file
- **WHEN** a `dev.config.js` file exists with custom port settings
- **THEN** the services SHALL start on the configured ports
- **AND** the configuration SHALL be validated before starting services
- **AND** invalid port numbers (outside 1024-65535 range) SHALL produce an error message

#### Scenario: Environment variable override
- **WHEN** `BACKEND_PORT` or `FRONTEND_PORT` environment variables are set
- **THEN** the services SHALL use the environment variable values instead of config file values
- **AND** environment variables SHALL take precedence over configuration file settings

### Requirement: Individual Service Control
The project SHALL provide commands to start frontend and backend services independently.

#### Scenario: Starting backend only
- **WHEN** a developer runs `npm run dev:backend` from the project root
- **THEN** only the backend service SHALL start
- **AND** it SHALL use the configured or default backend port

#### Scenario: Starting frontend only
- **WHEN** a developer runs `npm run dev:frontend` from the project root
- **THEN** only the frontend service SHALL start
- **AND** it SHALL use the configured or default frontend port

### Requirement: Graceful Service Shutdown
The project SHALL provide a command to stop all running development services gracefully.

#### Scenario: Stopping all services
- **WHEN** a developer runs `npm run stop` from the project root
- **OR** presses Ctrl+C while services are running
- **THEN** all running development services SHALL receive a shutdown signal
- **AND** services SHALL terminate cleanly (close connections, save state if needed)
- **AND** all child processes SHALL be terminated

#### Scenario: Partial shutdown handling
- **WHEN** one service crashes or is stopped individually
- **THEN** the other service SHALL continue running
- **AND** the developer SHALL be notified which service stopped

### Requirement: Production Build Integration
The project SHALL provide commands to build the frontend and start the production server with a single workflow.

#### Scenario: Building for production
- **WHEN** a developer runs `npm run build` from the project root
- **THEN** the frontend SHALL be built into the `cycani-proxy/dist/` directory
- **AND** the build output SHALL confirm successful completion

#### Scenario: Starting production server
- **WHEN** a developer runs `npm run start` from the project root
- **THEN** the production server SHALL start serving the built frontend
- **AND** the server SHALL serve the Vue SPA from the `/dist` directory
- **AND** all API routes SHALL be functional

### Requirement: Unified Dependency Installation
The project SHALL provide a command to install dependencies for all sub-projects.

#### Scenario: Installing all dependencies
- **WHEN** a developer runs `npm run install:all` from the project root
- **THEN** dependencies SHALL be installed for the root project
- **AND** dependencies SHALL be installed for `cycani-proxy/` (backend)
- **AND** dependencies SHALL be installed for `cycani-proxy/frontend/` (frontend)
- **AND** installation progress SHALL be displayed for each sub-project

### Requirement: Configuration File Management
The project SHALL support a JavaScript-based configuration file for development settings.

#### Scenario: Configuration file schema
- **WHEN** creating or reading `dev.config.js`
- **THEN** the file SHALL export an object with `backend` and `frontend` properties
- **AND** each property SHALL include `port`, `command`, and `directory` settings
- **AND** the file MAY include comments for documentation

#### Scenario: Missing configuration file
- **WHEN** no `dev.config.js` file exists in the project root
- **THEN** default settings SHALL be used automatically
- **AND** no error SHALL be raised
- **AND** a developer MAY create the file optionally to customize settings

### Requirement: Backward Compatibility
The new unified development commands SHALL not break existing development workflows.

#### Scenario: Existing workflow still functional
- **WHEN** a developer navigates to `cycani-proxy/` and runs `npm run dev`
- **THEN** the backend SHALL start as it did before this change
- **AND** when a developer navigates to `cycani-proxy/frontend/` and runs `npm run dev`
- **THEN** the frontend SHALL start as it did before this change

#### Scenario: Mixed workflow usage
- **WHEN** a developer uses the new `npm run dev` from root
- **AND** also starts services individually from subdirectories
- **THEN** both methods SHALL work without conflicts
- **AND** port conflicts SHALL be detected and reported

### Requirement: Port Conflict Detection
The project SHALL detect and report port conflicts before starting services.

#### Scenario: Port already in use
- **WHEN** a configured port is already in use by another process
- **THEN** the service SHALL fail to start with a clear error message
- **AND** the error message SHALL indicate which port is in use
- **AND** the error message SHALL suggest using a different port or stopping the conflicting process

#### Scenario: Automatic port selection for frontend
- **WHEN** Vite's default port is in use and the frontend dev server starts
- **THEN** Vite SHALL automatically try the next available port (3001, 3002, etc.)
- **AND** the actual port used SHALL be displayed in the terminal

### Requirement: Cross-Platform Compatibility
The development automation scripts SHALL work across Windows, macOS, and Linux.

#### Scenario: Command execution on Windows
- **WHEN** a developer runs `npm run dev` on Windows
- **THEN** both services SHALL start correctly
- **AND** process termination SHALL work cleanly
- **AND** environment variables SHALL be properly set

#### Scenario: Command execution on Unix-like systems
- **WHEN** a developer runs `npm run dev` on macOS or Linux
- **THEN** both services SHALL start correctly
- **AND** process termination SHALL work cleanly
- **AND** environment variables SHALL be properly set
