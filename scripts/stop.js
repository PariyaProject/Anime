#!/usr/bin/env node

/**
 * Stop Script - Gracefully terminate all running development services
 *
 * This script stops any running node processes associated with the
 * current Anime workspace development environment.
 *
 * Usage: npm run stop
 */

const { execSync } = require('child_process');
const os = require('os');

function isWindows() {
  return os.platform() === 'win32';
}

function stopProcessesWindows() {
  try {
    // Find all node processes running in the workspace directories
    const result = execSync(
      'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv',
      { encoding: 'utf8' }
    );

    const lines = result.split('\n').filter(line =>
      line.includes('\\Anime\\backend') || line.includes('\\Anime\\frontend') || line.includes('\\Anime')
    );
    const pids = lines
      .map(line => {
        const match = line.match(/(\d+),/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (pids.length === 0) {
      console.log('No running development services found.');
      return;
    }

    console.log(`Stopping ${pids.length} development service(s)...`);

    pids.forEach(pid => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(` Stopped process ${pid}`);
      } catch (err) {
        // Process may have already exited
      }
    });

    console.log('All services stopped.');
  } catch (err) {
    console.log('No running development services found.');
  }
}

function stopProcessesUnix() {
  try {
    // Find all node processes running in the workspace directories
    const result = execSync(
      'ps aux | grep -E "node.*/Anime/(backend|frontend)|npm.*(--prefix (backend|frontend)|run dev)" | grep -v grep',
      { encoding: 'utf8' }
    );

    if (!result.trim()) {
      console.log('No running development services found.');
      return;
    }

    const lines = result.trim().split('\n');
    const pids = lines
      .map(line => {
        const parts = line.trim().split(/\s+/);
        return parts[1];
      })
      .filter(Boolean);

    console.log(`Stopping ${pids.length} development service(s)...`);

    pids.forEach(pid => {
      try {
        execSync(`kill ${pid}`, { stdio: 'ignore' });
        console.log(`  Stopped process ${pid}`);
      } catch (err) {
        // Process may have already exited
      }
    });

    console.log('All services stopped.');
  } catch (err) {
    console.log('No running development services found.');
  }
}

// Main execution
if (isWindows()) {
  stopProcessesWindows();
} else {
  stopProcessesUnix();
}
