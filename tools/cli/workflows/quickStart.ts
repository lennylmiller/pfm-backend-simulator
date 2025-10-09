import chalk from 'chalk';
import * as inquirer from 'inquirer';
import { CLIConfig } from '../config/defaults';
import { WorkflowContext, WorkflowExecutionResult } from '../types/workflow';
import * as databaseManager from '../modules/databaseManager';
import * as backendManager from '../modules/backendManager';
import * as userSelector from '../modules/userSelector';
import * as responsiveTilesManager from '../modules/responsiveTilesManager';
import * as caddyManager from '../modules/caddyManager';
import * as cleanup from '../modules/cleanup';

/**
 * Quick Start Workflow
 * Automated one-command setup: clear → seed → select → start everything
 */

export async function executeQuickStart(config: CLIConfig): Promise<WorkflowExecutionResult> {
  const context: WorkflowContext = {
    config,
  };

  const completedSteps: string[] = [];

  try {
    console.log(chalk.blue.bold('\n🚀 Quick Start Workflow\n'));
    console.log(chalk.gray('This will automate the entire setup process:\n'));
    console.log(chalk.gray('  1. Check and clear required ports (443, 3000, 8080)'));
    console.log(chalk.gray('  2. Clear existing seed data'));
    console.log(chalk.gray('  3. Regenerate new seed data'));
    console.log(chalk.gray('  4. Select user and partner'));
    console.log(chalk.gray('  5. Generate JWT shared secret'));
    console.log(chalk.gray('  6. Update backend .env with JWT_SECRET'));
    console.log(chalk.gray('  7. Verify sudo access (for port 443)'));
    console.log(chalk.gray('  8. Start Caddy reverse proxy (HTTPS)'));
    console.log(chalk.gray('  9. Start backend server'));
    console.log(chalk.gray(' 10. Check/install responsive-tiles dependencies'));
    console.log(chalk.gray(' 11. Start responsive-tiles frontend\n'));

    // Check Caddy installation
    const caddyInstalled = await caddyManager.checkCaddyInstalled();
    if (!caddyInstalled) {
      caddyManager.displayCaddyInstallInstructions();
      return {
        success: false,
        completedSteps,
        context,
      };
    }

    // Confirmation
    if (config.workflow.confirmDestructiveActions) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'This will clear all existing data. Continue?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\n⚠️  Quick start cancelled\n'));
        return {
          success: false,
          completedSteps,
          context,
        };
      }
    }

    // Step 1: Clear ports (ensure no conflicts)
    console.log(chalk.blue('📋 Step 1: Checking and clearing required ports\n'));
    await cleanup.clearPorts();
    completedSteps.push('clear_ports');

    // Step 2: Clear seed data
    console.log(chalk.blue('📋 Step 2: Clearing seed data\n'));
    const clearResult = await databaseManager.clearSeed();
    if (!clearResult.success) {
      throw new Error(`Failed to clear seed data: ${clearResult.message}`);
    }
    completedSteps.push('clear_seed');

    // Step 3: Regenerate seed data
    console.log(chalk.blue('📋 Step 3: Regenerating seed data\n'));
    const seedResult = await databaseManager.regenerateSeed(config.database.seedDefaults);
    if (!seedResult.success) {
      throw new Error(`Failed to regenerate seed data: ${seedResult.message}`);
    }
    completedSteps.push('regenerate_seed');

    // Step 4: Select user and partner
    console.log(chalk.blue('📋 Step 4: Selecting user and partner\n'));
    const selection = await userSelector.selectUserAndPartner();
    if (!selection) {
      throw new Error('Failed to select user and partner');
    }
    context.selectedUser = selection;
    completedSteps.push('select_user');

    // Step 5: Generate JWT shared secret
    console.log(chalk.blue('📋 Step 5: Generating JWT shared secret\n'));
    const jwtSecret = responsiveTilesManager.generateSharedSecret();
    context.jwtSecret = jwtSecret;
    console.log(chalk.gray(`Generated secret: ${jwtSecret.substring(0, 32)}...\n`));
    completedSteps.push('generate_secret');

    // Step 6: Update backend .env with new JWT_SECRET
    console.log(chalk.blue('📋 Step 6: Updating backend .env\n'));
    const envUpdated = await backendManager.updateEnvJwtSecret(config.paths.backend, jwtSecret);
    if (!envUpdated) {
      throw new Error('Failed to update backend .env file');
    }
    completedSteps.push('update_env');

    // Step 7: Verify sudo access (pre-cache credentials)
    console.log(chalk.blue('📋 Step 7: Verifying sudo access\n'));
    const sudoVerified = await caddyManager.verifySudoAccess();
    if (!sudoVerified) {
      throw new Error('Sudo access required to start Caddy on port 443');
    }
    completedSteps.push('verify_sudo');

    // Step 8: Start Caddy reverse proxy
    console.log(chalk.blue('📋 Step 8: Starting Caddy reverse proxy\n'));
    const caddyInfo = await caddyManager.startCaddy(config.paths.backend);
    if (!caddyInfo) {
      throw new Error('Failed to start Caddy reverse proxy');
    }
    context.caddyProcess = caddyInfo;
    completedSteps.push('start_caddy');

    // Step 9: Start backend server
    console.log(chalk.blue('📋 Step 9: Starting backend server\n'));
    const backendInfo = await backendManager.startBackend({
      backendPath: config.paths.backend,
      port: config.server.backendPort,
    });
    if (!backendInfo) {
      throw new Error('Failed to start backend server');
    }
    context.backendProcess = backendInfo;
    completedSteps.push('start_backend');

    // Step 10: Check and install responsive-tiles dependencies
    console.log(chalk.blue('📋 Step 10: Checking responsive-tiles dependencies\n'));
    const depsInstalled = responsiveTilesManager.checkDependenciesInstalled(config.paths.responsiveTiles);
    if (!depsInstalled) {
      console.log(chalk.yellow('⚠️  Dependencies not found, installing...\n'));
      const installSuccess = await responsiveTilesManager.installDependencies(config.paths.responsiveTiles);
      if (!installSuccess) {
        throw new Error('Failed to install responsive-tiles dependencies');
      }
    } else {
      console.log(chalk.green('✅ Dependencies already installed\n'));
    }
    completedSteps.push('check_dependencies');

    // Step 11: Start responsive-tiles
    console.log(chalk.blue('📋 Step 11: Starting responsive-tiles\n'));
    const responsiveTilesInfo = await responsiveTilesManager.startResponsiveTiles(
      config.paths.responsiveTiles,
      config.server.responsiveTilesPort,
      config.server.domain,
      selection,
      jwtSecret
    );
    if (!responsiveTilesInfo) {
      throw new Error('Failed to start responsive-tiles');
    }
    context.responsiveTilesProcess = responsiveTilesInfo;
    completedSteps.push('start_responsive_tiles');

    // Success summary
    console.log(chalk.green.bold('\n✅ Quick Start Complete!\n'));
    console.log(chalk.blue('🎉 Your development environment is ready!\n'));

    console.log(chalk.gray('Services:'));
    console.log(chalk.green(`  ✓ Reverse Proxy: https://${config.server.domain} (Caddy)`));
    console.log(chalk.green(`  ✓ Backend: http://${config.server.domain}:${config.server.backendPort}`));
    console.log(chalk.green(`  ✓ Frontend: http://localhost:${config.server.responsiveTilesPort}\n`));

    console.log(chalk.gray('Selected Configuration:'));
    console.log(chalk.gray(`  Partner: ${selection.partnerName} (ID: ${selection.partnerId})`));
    console.log(chalk.gray(`  User: ${selection.userName} (ID: ${selection.userId})\n`));

    console.log(chalk.gray('JWT Configuration:'));
    console.log(chalk.gray(`  Shared Secret: ${jwtSecret.substring(0, 32)}...`));
    console.log(chalk.gray(`  Backend .env updated: ✓\n`));

    console.log(chalk.yellow('💡 Frontend makes API calls to: https://pfm.backend.simulator.com'));
    console.log(chalk.yellow('   (Caddy proxies this to http://localhost:3000)\n'));

    console.log(chalk.gray('💡 Services Management:'));
    console.log(chalk.gray('   • Services will continue running in the background'));
    console.log(chalk.gray('   • Use "Stop All Services" from main menu to stop them'));
    console.log(chalk.gray('   • Or press Ctrl+C to stop all services and exit CLI\n'));

    return {
      success: true,
      completedSteps,
      context,
    };
  } catch (error: any) {
    console.log(chalk.red(`\n❌ Quick start failed: ${error.message}\n`));
    console.log(chalk.gray('Completed steps before failure:'));
    completedSteps.forEach(step => console.log(chalk.gray(`  ✓ ${step}`)));
    console.log('');

    return {
      success: false,
      completedSteps,
      failedStep: completedSteps[completedSteps.length] || 'unknown',
      error,
      context,
    };
  }
}
