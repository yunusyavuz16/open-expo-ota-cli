import { Command } from 'commander';
import chalk from 'chalk';
import apiClient from '../utils/api-client';

export default function listApps(program: Command): void {
  program
    .command('list-apps')
    .description('List your apps on the OpenExpoOTA server')
    .action(async () => {
      try {
        // Verify user is logged in
        const isTokenValid = await apiClient.checkToken();
        if (!isTokenValid) {
          console.log(chalk.red('You are not logged in. Please run `ota login` first.'));
          return;
        }

        // Get apps
        const apps = await apiClient.listApps();

        if (apps.length === 0) {
          console.log(chalk.yellow('You don\'t have any apps yet.'));
          console.log(chalk.gray('Run `ota init` to create your first app.'));
          return;
        }

        // Display apps
        console.log(chalk.blue(`You have ${apps.length} app(s):`));
        console.log('');

        apps.forEach((app) => {
          console.log(chalk.green(`${app.name} (${app.slug})`));
          console.log(chalk.gray(`  ID: ${app.id}`));
          console.log(chalk.gray(`  Description: ${app.description}`));
          console.log(chalk.gray(`  Created: ${new Date(app.createdAt).toLocaleString()}`));
          console.log('');
        });

        // Show current app
        const currentApp = apiClient.getCurrentApp();
        if (currentApp) {
          const app = apps.find((a) => a.slug === currentApp);
          if (app) {
            console.log(chalk.blue(`Current app: ${app.name} (${app.slug})`));
          }
        }
      } catch (error) {
        console.error(chalk.red('Error listing apps:'), error);
        process.exit(1);
      }
    });
}