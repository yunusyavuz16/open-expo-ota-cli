/**
 * This script tests the connection to the OpenExpoOTA server.
 * Run it using: npx ts-node src/scripts/test-connection.ts
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import os from 'os';

// Config file paths
const CONFIG_PATH = path.join(os.homedir(), '.openexpoota');
const CONFIG_FILE = path.join(CONFIG_PATH, 'config.json');
const TOKEN_PATH = path.join(CONFIG_PATH, 'token');

// Default API URL
const DEFAULT_API_URL = 'http://localhost:3000/api';

// Load config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config;
    }
  } catch (error) {
    console.log(chalk.yellow('Could not load config file. Using defaults.'));
  }
  return { apiUrl: DEFAULT_API_URL };
}

// Load token
function loadToken() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return fs.readFileSync(TOKEN_PATH, 'utf8');
    }
  } catch (error) {
    console.log(chalk.yellow('Could not load token file.'));
  }
  return null;
}

async function testConnection() {
  const config = loadConfig();
  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const token = loadToken();

  console.log(chalk.cyan('OpenExpoOTA CLI - Connection Test'));
  console.log(chalk.cyan('---------------------------------'));
  console.log(chalk.white(`API URL: ${apiUrl}`));
  console.log(chalk.white(`Auth Token: ${token ? '[Set]' : '[Not Set]'}`));
  console.log('');

  try {
    // Test server health check
    console.log(chalk.cyan('Testing server health...'));
    const healthResponse = await axios.get(`${apiUrl.replace(/\/api\/?$/, '')}/health`);

    if (healthResponse.status === 200) {
      console.log(chalk.green('✓ Server is healthy!'));
      console.log(chalk.white(`  Server time: ${healthResponse.data.timestamp || 'not provided'}`));
    } else {
      console.log(chalk.red(`✗ Server health check failed with status ${healthResponse.status}`));
    }
  } catch (error) {
    console.log(chalk.red('✗ Could not connect to server health endpoint.'));
    console.log(chalk.yellow('  Make sure the server is running and the API URL is correct.'));

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.log(chalk.red(`  Connection refused. Server might be down or incorrect URL.`));
      } else if (error.response) {
        console.log(chalk.red(`  Server responded with status: ${error.response.status}`));
      } else {
        console.log(chalk.red(`  Error: ${error.message}`));
      }
    } else {
      console.log(chalk.red(`  Unexpected error: ${error}`));
    }

    process.exit(1);
  }

  // Test API endpoints if token is available
  if (token) {
    console.log('');
    console.log(chalk.cyan('Testing API authentication...'));

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const meResponse = await axios.get(`${apiUrl}/auth/me`, { headers });

      if (meResponse.status === 200 && meResponse.data) {
        console.log(chalk.green('✓ Authentication successful!'));
        console.log(chalk.white(`  Logged in as: ${meResponse.data.username || 'unknown'}`));
      } else {
        console.log(chalk.red('✗ Authentication check returned unexpected response.'));
      }
    } catch (error) {
      console.log(chalk.red('✗ Authentication failed.'));

      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 401) {
          console.log(chalk.yellow('  Your authentication token might be invalid or expired.'));
          console.log(chalk.yellow('  Try logging in again with: ota login'));
        } else {
          console.log(chalk.red(`  Server responded with status: ${error.response.status}`));
        }
      } else {
        console.log(chalk.red(`  Error: ${error}`));
      }
    }
  } else {
    console.log('');
    console.log(chalk.yellow('! Authentication token not found. Some tests skipped.'));
    console.log(chalk.yellow('  Run "ota login" to authenticate.'));
  }

  console.log('');
  console.log(chalk.cyan('Connection test completed.'));
}

testConnection().catch(error => {
  console.error('Test failed with unexpected error:', error);
  process.exit(1);
});