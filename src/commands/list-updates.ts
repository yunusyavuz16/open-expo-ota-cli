import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import apiClient from '../utils/api-client';

export default function listUpdates(program: Command): void {
  program
    .command('list-updates')
    .description('List updates for an app')
    .option('-d, --dir <directory>', 'Project directory (defaults to current directory)')
    .option('-s, --slug <slug>', 'App slug (overrides ota.config.json)')
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

        // Get updates
        const updates = await apiClient.listUpdates(app.id);

        if (updates.length === 0) {
          console.log(chalk.yellow(`No updates found for ${app.name} (${app.slug}).`));
          console.log(chalk.gray('Run `ota publish` to publish your first update.'));
          return;
        }

        // Display updates
        console.log(chalk.blue(`Updates for ${app.name} (${app.slug}):`));
        console.log('');

        updates.forEach((update) => {
          const isRollback = update.isRollback ? ' (rollback)' : '';
          console.log(chalk.green(`Update ID: ${update.id}${isRollback}`));
          console.log(chalk.gray(`  Version: ${update.version}`));
          console.log(chalk.gray(`  Channel: ${update.channel}`));
          console.log(chalk.gray(`  Runtime Version: ${update.runtimeVersion}`));
          console.log(chalk.gray(`  Published: ${new Date(update.createdAt).toLocaleString()}`));
          console.log('');
        });
      } catch (error) {
        console.error(chalk.red('Error listing updates:'), error);
        process.exit(1);
      }
    });
}