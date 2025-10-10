import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import * as backendManager from './backendManager';
import * as responsiveTilesManager from './responsiveTilesManager';
import * as caddyManager from './caddyManager';

const execAsync = promisify(exec);

/**
 * Cleanup Module
 * Handles graceful shutdown of all services and port management
 */

/**
 * Check if a port is in use
 */
async function isPortInUse(port: number): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    return stdout.trim().length > 0;
  } catch (error) {
    // lsof returns exit code 1 if no processes found
    return false;
  }
}

/**
 * Kill process using a specific port
 */
async function killProcessOnPort(port: number, useSudo: boolean = false): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`lsof -i :${port} -t`);
    const pids = stdout.trim().split('\n').filter(pid => pid);

    if (pids.length === 0) {
      return false;
    }

    for (const pid of pids) {
      const killCmd = useSudo ? `sudo kill -9 ${pid}` : `kill -9 ${pid}`;
      try {
        await execAsync(killCmd);
      } catch (error) {
        // Process might already be dead
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all ports needed for services
 */
export async function clearPorts(): Promise<void> {
  console.log(chalk.blue('\n🔍 Checking for processes using required ports...\n'));

  const ports = [
    { port: 443, name: 'Caddy (HTTPS)', sudo: true },
    { port: 3000, name: 'Backend', sudo: false },
    { port: 8080, name: 'Responsive-tiles', sudo: false },
  ];

  let clearedCount = 0;

  for (const { port, name, sudo } of ports) {
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log(chalk.yellow(`  ⚠️  Port ${port} (${name}) is in use, clearing...`));
      const killed = await killProcessOnPort(port, sudo);
      if (killed) {
        console.log(chalk.green(`  ✅ Cleared port ${port}`));
        clearedCount++;
      } else {
        console.log(chalk.red(`  ❌ Failed to clear port ${port}`));
      }
    }
  }

  if (clearedCount === 0) {
    console.log(chalk.green('  ✅ All ports are available\n'));
  } else {
    console.log(chalk.green(`\n✅ Cleared ${clearedCount} port(s)\n`));
    // Wait a moment for ports to be fully released
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

/**
 * Stop all running services
 */
export async function stopAllServices(): Promise<void> {
  console.log(chalk.blue('\n🛑 Stopping all services...\n'));

  let stoppedCount = 0;

  // Stop responsive-tiles
  if (responsiveTilesManager.isResponsiveTilesRunning()) {
    await responsiveTilesManager.stopResponsiveTiles();
    stoppedCount++;
  }

  // Stop backend
  if (backendManager.isBackendRunning()) {
    await backendManager.stopBackend();
    stoppedCount++;
  }

  // Stop Caddy
  if (await caddyManager.isCaddyRunning()) {
    await caddyManager.stopCaddy();
    stoppedCount++;
  }

  if (stoppedCount === 0) {
    console.log(chalk.gray('  No services were running\n'));
  } else {
    console.log(chalk.green(`\n✅ Stopped ${stoppedCount} service(s)\n`));
  }
}

/**
 * Get status of all services
 */
export async function getServicesStatus(): Promise<{
  backend: boolean;
  caddy: boolean;
  responsiveTiles: boolean;
}> {
  return {
    backend: backendManager.isBackendRunning(),
    caddy: await caddyManager.isCaddyRunning(),
    responsiveTiles: responsiveTilesManager.isResponsiveTilesRunning(),
  };
}

/**
 * Display services status banner
 */
export async function displayServicesStatus(): Promise<void> {
  const status = await getServicesStatus();

  console.log(chalk.blue('📊 Services Status:'));
  console.log(
    status.caddy
      ? chalk.green('  ✅ Caddy (port 443)')
      : chalk.gray('  ⚪ Caddy (port 443)')
  );
  console.log(
    status.backend
      ? chalk.green('  ✅ Backend (port 3000)')
      : chalk.gray('  ⚪ Backend (port 3000)')
  );
  console.log(
    status.responsiveTiles
      ? chalk.green('  ✅ Responsive-tiles (port 8080)')
      : chalk.gray('  ⚪ Responsive-tiles (port 8080)')
  );
  console.log('');
}

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupSignalHandlers(): void {
  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚠️  Interrupt received, cleaning up...\n'));
    await stopAllServices();
    console.log(chalk.blue('👋 Goodbye!\n'));
    process.exit(0);
  });

  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n\n⚠️  Termination signal received, cleaning up...\n'));
    await stopAllServices();
    process.exit(0);
  });

  // Handle process exit
  process.on('exit', () => {
    // Synchronous cleanup only
    console.log(chalk.gray('\nProcess exiting...'));
  });
}
