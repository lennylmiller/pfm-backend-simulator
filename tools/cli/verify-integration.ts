/**
 * Integration test for CLI - verifies API client works with server
 * Run this with: ts-node tools/cli/verify-integration.ts
 */

import { ApiClient } from './api';
const chalk = require('chalk');

async function verify() {
  console.log(chalk.blue('\n🔍 Verifying CLI Integration...\n'));

  const api = new ApiClient();
  api.toggleRequestLogging(false); // Quiet mode for verification

  try {
    // Test 1: Server is reachable
    console.log(chalk.yellow('1. Testing server connection...'));
    try {
      await api.get('/api/v2/health');
      console.log(chalk.green('   ✅ Server is reachable'));
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        console.log(chalk.red('   ❌ Server not running!'));
        console.log(chalk.yellow('   💡 Start server with: npm run dev'));
        return false;
      }
      // Health endpoint might not exist, that's OK
      console.log(chalk.yellow('   ⚠️  Server reached but /health endpoint not found (OK)'));
    }

    // Test 2: Authentication
    console.log(chalk.yellow('\n2. Testing authentication...'));
    try {
      const response = await api.login('Kacie84@hotmail.com', 'Password123!');
      if (response && 'token' in response && response.token) {
        console.log(chalk.green('   ✅ Authentication works'));
      } else {
        console.log(chalk.red('   ❌ Authentication response missing token'));
        return false;
      }

      // Test 3: Authenticated request (get accounts)
      console.log(chalk.yellow('\n3. Testing authenticated request...'));
      const accountsResponse = await api.getAccounts('396'); // User ID from database
      if (accountsResponse.status === 200) {
        console.log(chalk.green('   ✅ Authenticated requests work'));
      } else {
        console.log(chalk.red('   ❌ Authenticated request failed'));
        return false;
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log(chalk.red('   ❌ Authentication failed (401)'));
        console.log(chalk.yellow('   💡 Run: npm run seed'));
        return false;
      }
      throw error;
    }

    console.log(chalk.green('\n✅ All integration tests passed!\n'));
    console.log(chalk.blue('You can now run: npm run cli\n'));
    return true;
  } catch (error: any) {
    console.log(chalk.red('\n❌ Integration test failed:'));
    console.log(error.message);
    if (error.response) {
      console.log('Response:', error.response.status, error.response.data);
    }
    return false;
  }
}

verify()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
