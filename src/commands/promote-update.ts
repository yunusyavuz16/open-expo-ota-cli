import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import apiClient from '../utils/api-client';
import { ReleaseChannel } from '../types';

export default function promoteUpdate(program: Command): void {
  program
    .command('promote')
    .description('Promote an update to a different release channel')
    .option('-d, --dir <directory>', 'Project directory (defaults to current directory)')
    .option('-s, --slug <slug>', 'App slug (overrides ota.config.json)')
    .option('-u, --update-id <updateId>', 'ID of the update to promote')
    .option('-c, --channel <channel>', 'Target channel (production, staging, development)')
    .action(async (options) => {
      try {
        // Verify user is logged in
        const isTokenValid = await apiClient.checkToken();
        if (!isTokenValid) {
          console.log(chalk.red('You are not logged in. Please run `ota login` first.'));
          return;
        }

        let appSlug = options.slug;

        // If no slug provided, try to get from config
        if (!appSlug) {
          // Set project directory
          const projectDir = options.dir || process.cwd();

          // Check if directory exists
          if (!fs.existsSync(projectDir)) {
            console.log(chalk.red(`Directory not found: ${projectDir}`));
            return;
          }

          // Check for ota.config.json
          const configPath = path.join(projectDir, 'ota.config.json');
          if (!fs.existsSync(configPath)) {
            console.log(chalk.red('Project is not initialized. Please run `ota init` first.'));
            return;
          }

          // Read config
          const otaConfig = await fs.readJson(configPath);
          appSlug = otaConfig.slug;
        }

        // If still no slug, use current app
        if (!appSlug) {
          appSlug = apiClient.getCurrentApp();
          if (!appSlug) {
            console.log(chalk.red('No app specified. Please specify an app slug or use a project directory.'));
            return;
          }
        }

        // Get app by slug
        const app = await apiClient.getAppBySlug(appSlug);
        if (!app) {
          console.log(chalk.red(`App with slug "${appSlug}" not found.`));
          return;
        }

        // Get update ID from options or prompt
        let updateId = options.updateId ? parseInt(options.updateId, 10) : undefined;

        if (!updateId) {
          // Get updates to let user select one
          const updates = await apiClient.listUpdates(app.id);

          if (updates.length === 0) {
            console.log(chalk.yellow(`No updates found for ${app.name} (${app.slug}).`));
            console.log(chalk.gray('Run `ota publish` to publish your first update.'));
            return;
          }

          // Let user select an update
          const { selectedUpdate } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedUpdate',
              message: 'Select an update to promote:',
              choices: updates.map((update) => ({
                name: `${update.version} (${update.channel}) - ID: ${update.id}`,
                value: update.id,
              })),
            },
          ]);

          updateId = selectedUpdate;
        }

        // Get target channel from options or prompt
        let channel = options.channel as ReleaseChannel;

        if (!channel || !Object.values(ReleaseChannel).includes(channel as ReleaseChannel)) {
          // Prompt for channel
          const { selectedChannel } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedChannel',
              message: 'Select a target channel:',
              choices: Object.values(ReleaseChannel).map((ch) => ({
                name: ch,
                value: ch,
              })),
            },
          ]);

          channel = selectedChannel;
        }

        // Confirm with user
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to promote update ID ${updateId} to the ${channel} channel?`,
            default: false,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray('Promotion cancelled.'));
          return;
        }

        // Promote update
        console.log(chalk.blue(`Promoting update ID ${updateId} to ${channel} channel...`));
        const result = await apiClient.promoteUpdate(app.id, updateId, channel);

        console.log(chalk.green('Update promoted successfully!'));
        console.log(chalk.gray(`New update ID: ${result.update.id}`));
        console.log(chalk.gray(`Channel: ${result.update.channel}`));
        console.log(chalk.gray(`Version: ${result.update.version}`));
      } catch (error) {
        console.error(chalk.red('Error promoting update:'), error);
        process.exit(1);
      }
    });
}