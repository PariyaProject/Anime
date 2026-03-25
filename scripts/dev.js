#!/usr/bin/env node

const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const fileContent = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of fileContent.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function parseArgs(argv) {
  const args = { backend: null, frontend: null };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if ((current === '--backend' || current === '-b') && next) {
      args.backend = next;
      index += 1;
      continue;
    }

    if ((current === '--frontend' || current === '-f') && next) {
      args.frontend = next;
      index += 1;
    }
  }

  return args;
}

function normalizePort(value, fallback) {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function canListen(port, host) {
  return new Promise(resolve => {
    const server = net.createServer();

    server.unref();
    server.on('error', () => resolve(false));

    const listenOptions = host ? { port, host } : { port };

    server.listen(listenOptions, () => {
      server.close(() => resolve(true));
    });
  });
}

async function isFrontendPortAvailable(port) {
  const hostsToCheck = ['127.0.0.1', '::1'];

  for (const host of hostsToCheck) {
    const available = await canListen(port, host);
    if (!available) {
      return false;
    }
  }

  return true;
}

function isBackendPortAvailable(port) {
  return canListen(port);
}

async function findAvailablePort(startPort, isAvailable, reservedPorts = new Set()) {
  let port = startPort;

  while (reservedPorts.has(port) || !(await isAvailable(port))) {
    port += 1;
  }

  return port;
}

async function buildDevEnv() {
  const fileEnv = {
    ...parseEnvFile(path.join(rootDir, '.env')),
    ...parseEnvFile(path.join(rootDir, '.env.local'))
  };
  const cliArgs = parseArgs(process.argv.slice(2));
  const env = {
    ...fileEnv,
    ...process.env
  };

  const backendPortRequested = normalizePort(cliArgs.backend || env.BACKEND_PORT || env.PORT, 3006);
  const frontendPortRequested = normalizePort(cliArgs.frontend || env.FRONTEND_PORT, 3000);
  const frontendHost = env.FRONTEND_HOST || '0.0.0.0';
  const backendHost = env.BACKEND_HOST || '0.0.0.0';
  const reservedPorts = new Set();
  const backendPort = await findAvailablePort(
    backendPortRequested,
    isBackendPortAvailable,
    reservedPorts
  );
  reservedPorts.add(backendPort);
  const frontendPort = await findAvailablePort(
    frontendPortRequested,
    isFrontendPortAvailable,
    reservedPorts
  );
  const apiBaseUrl = '';
  const devProxyTarget = `http://localhost:${backendPort}`;

  env.BACKEND_PORT = String(backendPort);
  env.BACKEND_HOST = backendHost;
  env.PORT = String(backendPort);
  env.FRONTEND_PORT = String(frontendPort);
  env.FRONTEND_HOST = frontendHost;
  env.VITE_API_BASE_URL = apiBaseUrl;
  env.VITE_DEV_PROXY_TARGET = devProxyTarget;
  env.RESOLVED_BACKEND_PORT = String(backendPort);
  env.RESOLVED_FRONTEND_PORT = String(frontendPort);
  env.REQUESTED_BACKEND_PORT = String(backendPortRequested);
  env.REQUESTED_FRONTEND_PORT = String(frontendPortRequested);

  return env;
}

function startService(scriptName, env) {
  return spawn(npmCommand, ['run', scriptName], {
    cwd: rootDir,
    env,
    stdio: 'inherit'
  });
}

async function main() {
  const env = await buildDevEnv();

  console.log(`Using frontend port ${env.FRONTEND_PORT} and backend port ${env.BACKEND_PORT}`);
  console.log(`Frontend host: ${env.FRONTEND_HOST}`);
  console.log(`Backend host: ${env.BACKEND_HOST}`);
  console.log(`Frontend API base: ${env.VITE_API_BASE_URL || '(same-origin /api via Vite proxy)'}`);
  console.log(`Frontend API target: ${env.VITE_DEV_PROXY_TARGET}`);

  if (env.REQUESTED_BACKEND_PORT !== env.RESOLVED_BACKEND_PORT) {
    console.log(
      `Backend port ${env.REQUESTED_BACKEND_PORT} is busy, switched to ${env.RESOLVED_BACKEND_PORT}`
    );
  }

  if (env.REQUESTED_FRONTEND_PORT !== env.RESOLVED_FRONTEND_PORT) {
    console.log(
      `Frontend port ${env.REQUESTED_FRONTEND_PORT} is busy, switched to ${env.RESOLVED_FRONTEND_PORT}`
    );
  }

  const children = [
    startService('dev:backend', env),
    startService('dev:frontend', env)
  ];

  let shuttingDown = false;

  function stopChildren(signal) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  }

  process.on('SIGINT', () => stopChildren('SIGINT'));
  process.on('SIGTERM', () => stopChildren('SIGTERM'));

  let remaining = children.length;
  let exitCode = 0;

  for (const child of children) {
    child.on('exit', (code, signal) => {
      remaining -= 1;

      if (!shuttingDown) {
        stopChildren(signal || 'SIGTERM');
      }

      if (code && exitCode === 0) {
        exitCode = code;
      }

      if (remaining === 0) {
        process.exit(exitCode);
      }
    });
  }
}

main().catch(error => {
  console.error('Failed to prepare development environment:', error);
  process.exit(1);
});
