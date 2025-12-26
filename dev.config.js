/**
 * Development Configuration for cycani-proxy project
 *
 * This file allows you to customize port settings and service configurations
 * for both frontend and backend development servers.
 *
 * Environment Variable Overrides:
 * - BACKEND_PORT: Override backend port (default: 3006)
 * - FRONTEND_PORT: Override frontend port (default: 3000)
 */

module.exports = {
  // Backend server configuration (Express server in cycani-proxy/)
  backend: {
    port: parseInt(process.env.BACKEND_PORT, 10) || 3006,
    command: 'dev',
    directory: './cycani-proxy',
    name: 'Backend Server'
  },

  // Frontend development server configuration (Vite in cycani-proxy/frontend/)
  frontend: {
    port: parseInt(process.env.FRONTEND_PORT, 10) || 3000,
    command: 'dev',
    directory: './cycani-proxy/frontend',
    name: 'Frontend Dev Server'
  },

  // Build configuration
  build: {
    command: 'build',
    directory: './cycani-proxy/frontend',
    name: 'Frontend Build'
  },

  // Production server configuration
  production: {
    port: parseInt(process.env.BACKEND_PORT, 10) || 3006,
    command: 'start',
    directory: './cycani-proxy',
    name: 'Production Server'
  }
};
