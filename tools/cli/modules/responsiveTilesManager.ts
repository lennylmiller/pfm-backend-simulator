import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import { ProcessInfo, UserPartnerSelection } from '../types/workflow';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Responsive Tiles Manager Module
 * Handles responsive-tiles frontend process management
 */

// Global process reference
let responsiveTilesProcess: ChildProcess | null = null;

/**
 * Check if responsive-tiles dependencies are installed
 */
export function checkDependenciesInstalled(responsiveTilesPath: string): boolean {
  const nodeModulesPath = path.join(responsiveTilesPath, 'node_modules');
  return fs.existsSync(nodeModulesPath);
}

/**
 * Install responsive-tiles dependencies
 */
export async function installDependencies(responsiveTilesPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(chalk.blue('\n📦 Installing responsive-tiles dependencies...\n'));
    console.log(chalk.gray('  This may take a few minutes...\n'));

    const install = spawn('npm', ['install'], {
      cwd: responsiveTilesPath,
      stdio: 'inherit', // Show npm output directly
    });

    install.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green('\n✅ Dependencies installed successfully\n'));
        resolve(true);
      } else {
        console.log(chalk.red(`\n❌ Failed to install dependencies (exit code ${code})\n`));
        resolve(false);
      }
    });

    install.on('error', (error) => {
      console.log(chalk.red(`\n❌ Error installing dependencies: ${error.message}\n`));
      resolve(false);
    });
  });
}

/**
 * Start responsive-tiles with generated startup command
 */
export async function startResponsiveTiles(
  responsiveTilesPath: string,
  port: number,
  domain: string,
  selection: UserPartnerSelection,
  apiKey: string
): Promise<ProcessInfo | null> {
  try {
    if (responsiveTilesProcess) {
      console.log(chalk.yellow('\n⚠️  Responsive-tiles is already running\n'));
      return {
        pid: responsiveTilesProcess.pid!,
        running: true,
        port,
        startTime: new Date(),
      };
    }

    console.log(chalk.blue('\n🎨 Starting responsive-tiles...\n'));

    // Build environment for npm start
    const env = {
      ...process.env,
      API_KEY: apiKey,
      PARTNER_DOMAIN: domain,
      PCID: selection.userId.toString(),
      ENV: 'staging',
      PORT: port.toString(),
      DOMAIN: 'localhost',
    };

    // Start responsive-tiles with npm start
    responsiveTilesProcess = spawn('npm', ['start'], {
      cwd: responsiveTilesPath,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env,
    });

    if (!responsiveTilesProcess.pid) {
      console.log(chalk.red('❌ Failed to start responsive-tiles: no PID assigned\n'));
      responsiveTilesProcess = null;
      return null;
    }

    // Capture output
    responsiveTilesProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('webpack') || output.includes('Compiled') || output.includes('http://')) {
        console.log(chalk.green(`  ${output}`));
      }
    });

    responsiveTilesProcess.stderr?.on('data', (data) => {
      const error = data.toString().trim();
      // Filter out common webpack warnings
      if (!error.includes('DeprecationWarning') &&
          !error.includes('ExperimentalWarning') &&
          !error.includes('Critical dependency')) {
        console.log(chalk.yellow(`  ${error}`));
      }
    });

    responsiveTilesProcess.on('error', (error) => {
      console.log(chalk.red(`\n❌ Responsive-tiles process error: ${error.message}\n`));
      responsiveTilesProcess = null;
    });

    responsiveTilesProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.log(chalk.red(`\n❌ Responsive-tiles exited with code ${code}\n`));
      }
      responsiveTilesProcess = null;
    });

    // Wait for webpack to compile
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if process is still running after wait
    if (!responsiveTilesProcess || responsiveTilesProcess.killed) {
      console.log(chalk.red('\n❌ Responsive-tiles failed to start\n'));
      return null;
    }

    console.log(chalk.green(`\n✅ Responsive-tiles started on http://localhost:${port}\n`));

    return {
      pid: responsiveTilesProcess.pid,
      running: true,
      port,
      startTime: new Date(),
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error starting responsive-tiles: ${error.message}\n`));
    responsiveTilesProcess = null;
    return null;
  }
}

/**
 * Stop responsive-tiles
 */
export async function stopResponsiveTiles(): Promise<boolean> {
  try {
    if (!responsiveTilesProcess) {
      console.log(chalk.yellow('\n⚠️  Responsive-tiles is not running\n'));
      return true;
    }

    console.log(chalk.blue('\n🛑 Stopping responsive-tiles...\n'));

    // Kill the process
    responsiveTilesProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise(resolve => setTimeout(resolve, 1000));

    responsiveTilesProcess = null;

    console.log(chalk.green('✅ Responsive-tiles stopped successfully\n'));
    return true;
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Error stopping responsive-tiles: ${error.message}\n`));
    return false;
  }
}

/**
 * Generate a new cryptographically secure shared secret
 */
export function generateSharedSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Generate responsive-tiles startup command string
 */
export function generateStartupCommand(
  domain: string,
  selection: UserPartnerSelection,
  apiKey: string,
  port: number = 8080
): string {
  return `API_KEY=${apiKey} PARTNER_DOMAIN='${domain}' PCID=${selection.userId} ENV=staging PORT=${port} npm start`;
}

/**
 * Display startup command and instructions
 */
export function displayStartupCommand(
  domain: string,
  selection: UserPartnerSelection,
  apiKey: string,
  responsiveTilesPath: string
): void {
  const command = generateStartupCommand(domain, selection, apiKey);

  console.log(chalk.blue.bold('\n🎨 Responsive Tiles Start Command\n'));
  console.log(chalk.gray('Copy and run this command in the responsive-tiles directory:'));
  console.log(chalk.gray(`${responsiveTilesPath}\n`));
  console.log(chalk.green(command));
  console.log(chalk.gray('\nHow it works:'));
  console.log(chalk.gray('  • API_KEY = Newly generated JWT shared secret (128-char hex)'));
  console.log(chalk.gray('  • Frontend uses this secret to sign tokens in webpack'));
  console.log(chalk.gray('  • Backend JWT_SECRET must match this key'));
  console.log(chalk.gray(`  • PARTNER_DOMAIN = ${domain} (JWT audience claim)`));
  console.log(chalk.gray(`  • PCID = ${selection.userId} (JWT subject claim)`));
  console.log(chalk.gray('  • ENV = staging (drop-in replacement for staging environment)\n'));
}

/**
 * Get current responsive-tiles process info
 */
export function getResponsiveTilesInfo(): ProcessInfo | null {
  if (!responsiveTilesProcess || !responsiveTilesProcess.pid) {
    return null;
  }

  return {
    pid: responsiveTilesProcess.pid,
    running: !responsiveTilesProcess.killed,
    port: 8080, // Default port
    startTime: new Date(),
  };
}

/**
 * Check if responsive-tiles is running
 */
export function isResponsiveTilesRunning(): boolean {
  return responsiveTilesProcess !== null && !responsiveTilesProcess.killed;
}

/**
 * Display status of both processes
 */
export function displayProcessStatus(
  backendInfo: ProcessInfo | null,
  responsiveTilesInfo: ProcessInfo | null
): void {
  console.log(chalk.blue.bold('\n📊 Process Status\n'));

  // Backend status
  if (backendInfo && backendInfo.running) {
    console.log(chalk.green(`✅ Backend: Running (PID: ${backendInfo.pid}, Port: ${backendInfo.port})`));
  } else {
    console.log(chalk.gray('⚪ Backend: Not running'));
  }

  // Responsive-tiles status
  if (responsiveTilesInfo && responsiveTilesInfo.running) {
    console.log(chalk.green(`✅ Responsive-tiles: Running (PID: ${responsiveTilesInfo.pid}, Port: ${responsiveTilesInfo.port})`));
  } else {
    console.log(chalk.gray('⚪ Responsive-tiles: Not running'));
  }

  console.log('');
}
