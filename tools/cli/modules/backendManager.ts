import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { ServerHealth, ProcessInfo } from '../types/workflow';
import * as path from 'path';
import fetch from 'isomorphic-fetch';

const execAsync = promisify(exec);

/**
 * Backend Manager Module
 * Handles backend server process management: start, stop, restart, health checks
 */

// Global process reference
let backendProcess: ChildProcess | null = null;

/**
 * Start the backend server
 */
export async function startBackend(config: { backendPath: string; port: number }): Promise<ProcessInfo | null> {
  try {
    if (backendProcess) {
      console.log(chalk.yellow('\n⚠️  Backend is already running\n'));
      return {
        pid: backendProcess.pid!,
        running: true,
        port: config.port,
        startTime: new Date(),
      };
    }

    console.log(chalk.blue('\n🚀 Starting backend server...\n'));

    // Start backend with npm run dev
    backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: config.backendPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        PORT: config.port.toString(),
      },
    });

    if (!backendProcess.pid) {
      console.log(chalk.red('❌ Failed to start backend: no PID assigned\n'));
      backendProcess = null;
      return null;
    }

    // Capture output
    backendProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Server running') || output.includes('listening')) {
        console.log(chalk.green(`  ✓ ${output}`));
      }
    });

    backendProcess.stderr?.on('data', (data) => {
      const error = data.toString().trim();
      if (!error.includes('DeprecationWarning') && !error.includes('ExperimentalWarning')) {
        console.log(chalk.red(`  ⚠️  ${error}`));
      }
    });

    backendProcess.on('error', (error) => {
      console.log(chalk.red(`\n❌ Backend process error: ${error.message}\n`));
      backendProcess = null;
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(chalk.red(`\n❌ Backend exited with code ${code}\n`));
      }
      backendProcess = null;
    });

    // Wait for server to start (increased from 2s to 4s for better reliability)
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Verify server is healthy
    const health = await checkHealth(config.port);
    if (health.healthy) {
      console.log(chalk.green(`\n✅ Backend started successfully on port ${config.port}\n`));
      return {
        pid: backendProcess.pid,
        running: true,
        port: config.port,
        startTime: new Date(),
      };
    } else {
      console.log(chalk.yellow(`\n⚠️  Backend started but health check failed: ${health.error}\n`));
      return {
        pid: backendProcess.pid,
        running: true,
        port: config.port,
        startTime: new Date(),
      };
    }
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error starting backend: ${error.message}\n`));
    backendProcess = null;
    return null;
  }
}

/**
 * Stop the backend server
 */
export async function stopBackend(): Promise<boolean> {
  try {
    if (!backendProcess) {
      console.log(chalk.yellow('\n⚠️  Backend is not running\n'));
      return true;
    }

    console.log(chalk.blue('\n🛑 Stopping backend server...\n'));

    // Kill the process
    backendProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise(resolve => setTimeout(resolve, 1000));

    backendProcess = null;

    console.log(chalk.green('✅ Backend stopped successfully\n'));
    return true;
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error stopping backend: ${error.message}\n`));
    return false;
  }
}

/**
 * Restart the backend server
 */
export async function restartBackend(config: { backendPath: string; port: number }): Promise<ProcessInfo | null> {
  console.log(chalk.blue.bold('\n🔄 Restarting Backend\n'));

  // Stop if running
  await stopBackend();

  // Start again
  return await startBackend(config);
}

/**
 * Check if backend server is healthy
 */
export async function checkHealth(port: number, domain: string = 'localhost'): Promise<ServerHealth> {
  const url = `http://${domain}:${port}/health`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data: any = await response.json();
      return {
        healthy: data.status === 'ok',
        port,
        url,
        responseTime,
      };
    } else {
      return {
        healthy: false,
        port,
        url,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error: any) {
    return {
      healthy: false,
      port,
      url,
      error: error.message,
    };
  }
}

/**
 * Get current backend process info
 */
export function getBackendInfo(): ProcessInfo | null {
  if (!backendProcess || !backendProcess.pid) {
    return null;
  }

  return {
    pid: backendProcess.pid,
    running: !backendProcess.killed,
    port: parseInt(process.env.PORT || '3000'),
    startTime: new Date(), // Note: actual start time not tracked, using current time
  };
}

/**
 * Check if backend is running
 */
export function isBackendRunning(): boolean {
  return backendProcess !== null && !backendProcess.killed;
}

/**
 * Update backend .env file with new JWT secret
 */
export async function updateEnvJwtSecret(backendPath: string, jwtSecret: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const envPath = path.join(backendPath, '.env');

    // Read existing .env
    const envContent = await fs.readFile(envPath, 'utf-8');

    // Update JWT_SECRET line or add it
    const lines = envContent.split('\n');
    let found = false;

    const updatedLines = lines.map(line => {
      if (line.startsWith('JWT_SECRET=')) {
        found = true;
        return `JWT_SECRET=${jwtSecret}`;
      }
      return line;
    });

    // If JWT_SECRET not found, add it
    if (!found) {
      updatedLines.push(`JWT_SECRET=${jwtSecret}`);
    }

    // Write back to .env
    await fs.writeFile(envPath, updatedLines.join('\n'), 'utf-8');

    console.log(chalk.green('✅ Updated backend .env with new JWT_SECRET\n'));
    return true;
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error updating .env: ${error.message}\n`));
    return false;
  }
}
