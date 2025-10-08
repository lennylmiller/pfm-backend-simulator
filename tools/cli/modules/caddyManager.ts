import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import { ProcessInfo } from '../types/workflow';
import * as path from 'path';

/**
 * Caddy Manager Module
 * Handles Caddy reverse proxy process management
 */

// Global process reference
let caddyProcess: ChildProcess | null = null;

/**
 * Start Caddy reverse proxy
 */
export async function startCaddy(projectRoot: string): Promise<ProcessInfo | null> {
  try {
    if (caddyProcess) {
      console.log(chalk.yellow('\n⚠️  Caddy is already running\n'));
      return {
        pid: caddyProcess.pid!,
        running: true,
        port: 443,
        startTime: new Date(),
      };
    }

    const caddyfilePath = path.join(projectRoot, 'Caddyfile');

    console.log(chalk.blue('\n🔒 Starting Caddy reverse proxy...\n'));
    console.log(chalk.yellow('⚠️  Caddy requires sudo to bind to port 443 (privileged port)'));
    console.log(chalk.yellow('   If prompted, please enter your password.\n'));
    console.log(chalk.gray(`  Caddyfile: ${caddyfilePath}`));
    console.log(chalk.gray('  Proxying: https://pfm.backend.simulator.com:443 → http://localhost:3000\n'));

    // Start Caddy with sudo (required for port 443)
    caddyProcess = spawn('sudo', ['caddy', 'run', '--config', caddyfilePath], {
      cwd: projectRoot,
      stdio: 'inherit', // Allows password prompt to appear
      detached: false,
    });

    if (!caddyProcess.pid) {
      console.log(chalk.red('❌ Failed to start Caddy: no PID assigned\n'));
      caddyProcess = null;
      return null;
    }

    // Note: Using stdio: 'inherit' means output goes directly to terminal
    // No need to capture stdout/stderr

    caddyProcess.on('error', (error) => {
      console.log(chalk.red(`\n❌ Caddy process error: ${error.message}\n`));
      caddyProcess = null;
    });

    caddyProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(chalk.red(`\n❌ Caddy exited with code ${code}\n`));
      }
      caddyProcess = null;
    });

    // Wait for Caddy to start (increased to account for sudo prompt)
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log(chalk.green('\n✅ Caddy reverse proxy started successfully\n'));
    console.log(chalk.blue('  HTTPS endpoint: https://pfm.backend.simulator.com\n'));

    return {
      pid: caddyProcess.pid,
      running: true,
      port: 443,
      startTime: new Date(),
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error starting Caddy: ${error.message}\n`));
    caddyProcess = null;
    return null;
  }
}

/**
 * Stop Caddy reverse proxy
 */
export async function stopCaddy(): Promise<boolean> {
  try {
    if (!caddyProcess) {
      console.log(chalk.yellow('\n⚠️  Caddy is not running\n'));
      return true;
    }

    console.log(chalk.blue('\n🛑 Stopping Caddy...\n'));

    // Caddy was started with sudo, so we need sudo to stop it
    // Use pkill to stop the caddy process
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('sudo pkill -f "caddy run"');
    } catch (error: any) {
      // pkill returns exit code 1 if no processes found, which is fine
      if (!error.message.includes('exit code 1')) {
        throw error;
      }
    }

    // Wait for process to exit
    await new Promise(resolve => setTimeout(resolve, 1000));

    caddyProcess = null;

    console.log(chalk.green('✅ Caddy stopped successfully\n'));
    return true;
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error stopping Caddy: ${error.message}\n`));
    return false;
  }
}

/**
 * Get current Caddy process info
 */
export function getCaddyInfo(): ProcessInfo | null {
  if (!caddyProcess || !caddyProcess.pid) {
    return null;
  }

  return {
    pid: caddyProcess.pid,
    running: !caddyProcess.killed,
    port: 443,
    startTime: new Date(),
  };
}

/**
 * Check if Caddy is running
 */
export function isCaddyRunning(): boolean {
  return caddyProcess !== null && !caddyProcess.killed;
}

/**
 * Display Caddy status
 */
export function displayCaddyStatus(): void {
  const caddyInfo = getCaddyInfo();

  console.log(chalk.blue.bold('\n🔒 Caddy Reverse Proxy Status\n'));

  if (caddyInfo && caddyInfo.running) {
    console.log(chalk.green(`✅ Running (PID: ${caddyInfo.pid})`));
    console.log(chalk.gray('   HTTPS: https://pfm.backend.simulator.com:443'));
    console.log(chalk.gray('   Backend: http://localhost:3000\n'));
  } else {
    console.log(chalk.gray('⚪ Not running\n'));
  }
}

/**
 * Check if Caddy is installed
 */
export async function checkCaddyInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const check = spawn('which', ['caddy'], { stdio: 'pipe' });

    check.on('close', (code) => {
      resolve(code === 0);
    });

    check.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Pre-cache sudo credentials for seamless Caddy startup
 * This prompts for password once and caches it for ~5 minutes
 */
export async function verifySudoAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(chalk.blue('\n🔐 Verifying sudo access for privileged port 443...\n'));
    console.log(chalk.yellow('Please enter your password when prompted:\n'));

    const sudoCheck = spawn('sudo', ['-v'], {
      stdio: 'inherit', // Allows password prompt
    });

    sudoCheck.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✅ Sudo access verified\n'));
        resolve(true);
      } else {
        console.log(chalk.red('\n❌ Sudo access denied\n'));
        resolve(false);
      }
    });

    sudoCheck.on('error', (error) => {
      console.log(chalk.red(`\n❌ Error verifying sudo: ${error.message}\n`));
      resolve(false);
    });
  });
}

/**
 * Display Caddy installation instructions
 */
export function displayCaddyInstallInstructions(): void {
  console.log(chalk.yellow('\n⚠️  Caddy is not installed\n'));
  console.log(chalk.gray('Caddy is required for HTTPS reverse proxy functionality.\n'));
  console.log(chalk.blue('To install Caddy:\n'));
  console.log(chalk.white('  brew install caddy\n'));
  console.log(chalk.gray('Or visit: https://caddyserver.com/docs/install\n'));
}
