import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import apiClient from '../utils/api-client';
import { getExpoConfig } from '../utils/bundle';
import { getConfig } from '../utils/api-client';
import { ReleaseChannel } from '../types';

export default function init(program: Command): void {
  program
    .command('init')
    .description('Initialize OpenExpoOTA in your Expo project')
    .option('-d, --dir <directory>', 'Project directory (defaults to current directory)')
    .option('-c, --default-channel <channel>', 'Default release channel (production, staging, development)')
    .option('-r, --default-runtime-version <version>', 'Default runtime version')
    .action(async (options) => {
      try {
        // Verify user is logged in
        const isTokenValid = await apiClient.checkToken();
        if (!isTokenValid) {
          console.log(chalk.red('You are not logged in. Please run `ota login` first.'));
          return;
        }

        // Set project directory
        const projectDir = options.dir || process.cwd();

        // Check if directory exists
        if (!fs.existsSync(projectDir)) {
          console.log(chalk.red(`Directory not found: ${projectDir}`));
          return;
        }

        // Try to detect Expo project
        let expoConfig;
        try {
          expoConfig = await getExpoConfig(projectDir);
          console.log(chalk.green('Expo project detected!'));
          console.log(chalk.gray(`Name: ${expoConfig.name}`));
          console.log(chalk.gray(`Version: ${expoConfig.version}`));
        } catch (error) {
          console.log(chalk.yellow('Warning: Could not detect an Expo project. Are you in the right directory?'));
          const { proceed } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'proceed',
              message: 'Do you want to proceed anyway?',
              default: false,
            },
          ]);

          if (!proceed) {
            console.log(chalk.gray('Initialization cancelled.'));
            return;
          }
        }

        // Set default channel if provided
        if (options.defaultChannel) {
          if (Object.values(ReleaseChannel).includes(options.defaultChannel as ReleaseChannel)) {
            apiClient.setDefaultChannel(options.defaultChannel);
            console.log(chalk.green(`Default channel set to ${options.defaultChannel}`));
          } else {
            console.log(chalk.yellow(`Invalid channel: ${options.defaultChannel}. Using default: ${apiClient.getDefaultChannel()}`));
          }
        }

        // Set default runtime version if provided
        if (options.defaultRuntimeVersion) {
          apiClient.setDefaultRuntimeVersion(options.defaultRuntimeVersion);
          console.log(chalk.green(`Default runtime version set to ${options.defaultRuntimeVersion}`));
        } else if (expoConfig?.version) {
          // Use Expo version as default runtime version if available
          apiClient.setDefaultRuntimeVersion(expoConfig.version);
          console.log(chalk.green(`Default runtime version set to ${expoConfig.version} (from Expo config)`));
        }

        // Check for existing app or create new one
        const apps = await apiClient.listApps();

        // Ask user if they want to select an existing app or create a new one
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Create a new app', value: 'create' },
              ...(apps.length > 0
                ? [{ name: 'Select an existing app', value: 'select' }]
                : []),
            ],
          },
        ]);

        let appSlug = '';

        if (action === 'select') {
          // Select existing app
          const { selectedApp } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedApp',
              message: 'Select an app',
              choices: apps.map((app) => ({
                name: `${app.name} (${app.slug})`,
                value: app.slug,
              })),
            },
          ]);

          appSlug = selectedApp;
        } else {
          // Create new app
          const { name, slug, description } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'App name:',
              validate: (input) => (input ? true : 'Name is required'),
            },
            {
              type: 'input',
              name: 'slug',
              message: 'App slug (used in URLs, lowercase letters, numbers, and hyphens only):',
              validate: (input) => {
                if (!input) return 'Slug is required';
                if (!/^[a-z0-9-]+$/.test(input)) {
                  return 'Slug must contain only lowercase letters, numbers, and hyphens';
                }
                return true;
              },
            },
            {
              type: 'input',
              name: 'description',
              message: 'App description:',
              default: 'An Expo app with self-hosted OTA updates',
            },
          ]);

          // Create the app
          try {
            const newApp = await apiClient.createApp({ name, slug, description });
            console.log(chalk.green(`App created: ${newApp.name} (${newApp.slug})`));
            appSlug = newApp.slug;
          } catch (error) {
            console.error(chalk.red('Error creating app:'), error);
            return;
          }
        }

        // Set current app
        apiClient.setCurrentApp(appSlug);
        console.log(chalk.green(`Current app set to ${appSlug}`));

        // Create ota.config.json file
        const configPath = path.join(projectDir, 'ota.config.json');
        await fs.writeJson(
          configPath,
          {
            slug: appSlug,
            api: getConfig().apiUrl,
          },
          { spaces: 2 }
        );

        console.log(chalk.green(`Created configuration file: ${configPath}`));
        console.log(chalk.blue('Your project is now set up with OpenExpoOTA!'));
        console.log('');
        console.log(chalk.gray('Next steps:'));
        console.log(chalk.gray('1. Run `ota publish` to publish your first update'));
        console.log(chalk.gray('2. Install the client library in your Expo app'));
      } catch (error) {
        console.error(chalk.red('Error initializing project:'), error);
        process.exit(1);
      }
    });
}