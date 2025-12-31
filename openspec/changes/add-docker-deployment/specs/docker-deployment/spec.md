# docker-deployment Specification

## Purpose

定义 cycani-proxy 项目的 Docker 容器化部署规范,包括镜像构建、容器编排、数据持久化和自动更新机制。

## ADDED Requirements

### Requirement: Docker Image Construction

The project SHALL provide a Dockerfile that builds a production-ready container image.

#### Scenario: Multi-stage build with frontend compilation

- **GIVEN** a clean clone of the repository
- **WHEN** executing `docker build -t cycani-proxy .`
- **THEN** the build SHALL complete successfully
- **AND** the Vue frontend SHALL be compiled and bundled
- **AND** the backend dependencies SHALL be installed
- **AND** the final image SHALL contain the compiled frontend in `/app/dist/`

#### Scenario: Puppeteer integration

- **GIVEN** the Docker image is built
- **WHEN** the container starts
- **THEN** Chromium SHALL be installed via Alpine apk
- **AND** PUPPETEER_EXECUTABLE_PATH SHALL point to `/usr/bin/chromium-browser`
- **AND** Puppeteer SHALL be able to launch Chromium without downloading

#### Scenario: Code obfuscation

- **GIVEN** the Dockerfile is building the backend
- **WHEN** processing JavaScript files in `src/`
- **THEN** javascript-obfuscator SHALL process each `.js` file
- **AND** the obfuscated code SHALL replace the original file
- **AND** the obfuscated code SHALL remain functional

#### Scenario: Health check configuration

- **GIVEN** the container is running
- **WHEN** Docker performs health checks
- **THEN** the health check SHALL query `/api/health` endpoint
- **AND** checks SHALL occur every 30 seconds
- **AND** the container SHALL be marked healthy if the endpoint returns 200

### Requirement: Docker Compose Configuration

The project SHALL provide a docker-compose.yml file for easy service orchestration.

#### Scenario: Service startup

- **GIVEN** docker-compose.yml exists
- **WHEN** executing `docker-compose up -d`
- **THEN** both cycani-proxy and update-agent containers SHALL start
- **AND** cycani-proxy SHALL listen on port 3006
- **AND** containers SHALL have `restart: unless-stopped` policy

#### Scenario: Local directory binding

- **GIVEN** a project directory with `./config` and `./logs` subdirectories
- **WHEN** containers start
- **THEN** `./config` SHALL be mounted to `/app/config` in the container
- **AND** `./logs` SHALL be mounted to `/app/logs` in the container
- **AND** data written to these directories SHALL persist after container restart

#### Scenario: Volume isolation

- **GIVEN** the containers are running
- **WHEN** writing data to `/app/config/watch-history.json` inside the container
- **THEN** the file SHALL appear in `./config/watch-history.json` on the host
- **AND** the file SHALL survive container destruction and recreation

### Requirement: Update Agent

The project SHALL include an automated update mechanism that detects and deploys new container images.

#### Scenario: Update polling

- **GIVEN** the update-agent container is running
- **WHEN** the check interval elapses (default 300 seconds)
- **THEN** the agent SHALL fetch the remote image digest from GHCR
- **AND** the agent SHALL compare it with the local image digest
- **AND** if they differ, the agent SHALL initiate an update

#### Scenario: Automatic deployment

- **GIVEN** a new image is available in GHCR
- **WHEN** the update-agent detects the difference
- **THEN** the agent SHALL pull the new image
- **AND** execute `docker-compose up -d`
- **AND** prune old images to free disk space
- **AND** log all actions with timestamps

#### Scenario: Graceful service restart

- **GIVEN** an active user session with watch history
- **WHEN** the update-agent restarts the container
- **THEN** the new container SHALL mount the same local directories
- **AND** all watch history and configuration SHALL be preserved
- **AND** the service SHALL resume within 30 seconds

### Requirement: CI/CD Pipeline

The project SHALL use GitHub Actions to build and publish container images on code changes.

#### Scenario: Automatic build trigger

- **GIVEN** a GitHub repository with the workflow configured
- **WHEN** code is pushed to the master branch
- **THEN** GitHub Actions SHALL trigger the build-and-push workflow
- **AND** the workflow SHALL build both the main image and update-agent image

#### Scenario: Multi-platform support

- **GIVEN** the build workflow is running
- **WHEN** building the Docker image
- **THEN** the image SHALL be built for linux/amd64 platform
- **AND** the image SHALL be built for linux/arm64 platform
- **AND** both platforms SHALL be pushed to GHCR as a single manifest

#### Scenario: Image publishing

- **GIVEN** the build completes successfully
- **WHEN** pushing to GitHub Container Registry
- **THEN** the image SHALL be tagged as `ghcr.io/owner/repo:latest`
- **AND** the image SHALL be tagged with the commit SHA
- **AND** the image SHALL be publicly accessible (no authentication required)

#### Scenario: Build caching

- **GIVEN** previous builds have completed
- **WHEN** running a new build
- **THEN** GitHub Actions cache SHALL be used for layer caching
- **AND** build time SHALL be reduced compared to a clean build

### Requirement: Deployment Documentation

The project SHALL provide comprehensive documentation for deploying and maintaining the Docker-based system.

#### Scenario: Initial deployment guide

- **GIVEN** a new Mac Mini with Docker Desktop installed
- **WHEN** following the DEPLOYMENT.md instructions
- **THEN** the user SHALL be able to deploy the application
- **AND** the service SHALL be accessible at `http://localhost:3006`
- **AND** the update-agent SHALL be running

#### Scenario: Data management

- **GIVEN** the application is running
- **WHEN** the user needs to backup data
- **THEN** documentation SHALL provide backup commands for config directory
- **AND** documentation SHALL provide restore procedures
- **AND** documentation SHALL explain data persistence behavior

#### Scenario: Troubleshooting guide

- **GIVEN** a deployment issue occurs
- **WHEN** consulting DEPLOYMENT.md
- **THEN** common issues SHALL be documented with solutions
- **AND** log viewing commands SHALL be provided
- **AND** manual update procedures SHALL be explained

### Requirement: Security and Privacy

The project SHALL ensure source code protection and secure deployment practices.

#### Scenario: Code obfuscation

- **GIVEN** the Docker image is built
- **WHEN** inspecting JavaScript files in the image
- **THEN** variable names SHALL be obfuscated
- **AND** control flow SHALL be transformed
- **AND** the code SHALL be difficult to reverse engineer
- **AND** the application SHALL function correctly

#### Scenario: No sensitive data in images

- **GIVEN** the Dockerfile is building the image
- **WHEN** copying files to the image
- **THEN** config/ directory SHALL be excluded
- **AND** logs/ directory SHALL be excluded
- **AND** .env files SHALL be excluded
- **AND** no API keys or secrets SHALL be included in the image

#### Scenario: Local-only data access

- **GIVEN** the containers are running
- **WHEN** storing user watch history
- **THEN** data SHALL only be written to local bind mounts
- **AND** data SHALL NOT be sent to external services
- **AND** data SHALL remain on the local Mac Mini

### Requirement: Development vs Production Isolation

The Docker configuration SHALL support both development and production modes.

#### Scenario: Development mode

- **GIVEN** a developer is working on the project
- **WHEN** using `npm run dev`
- **THEN** the standard development workflow SHALL work
- **AND** Docker SHALL NOT be required
- **AND** hot reload SHALL function normally

#### Scenario: Production mode

- **GIVEN** the project is deployed via Docker
- **WHEN** running `docker-compose up`
- **THEN** NODE_ENV SHALL be set to 'production'
- **AND** the application SHALL run in production mode
- **AND** development tools SHALL not be included in the image

#### Scenario: Local testing

- **GIVEN** a developer wants to test the Docker image locally
- **WHEN** running `docker build -t local-test . && docker run -p 3006:3006 local-test`
- **THEN** the image SHALL run successfully
- **AND** the application SHALL be accessible
- **AND** all features SHALL work as expected
