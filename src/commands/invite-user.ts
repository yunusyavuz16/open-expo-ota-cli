import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import apiClient from '../utils/api-client';
import { UserRole } from '../types';

export default function inviteUser(program: Command): void {
  program
    .command('invite')
    .description('Invite a GitHub user to collaborate on an app')
    .option('-d, --dir <directory>', 'Project directory (defaults to current directory)')
    .option('-s, --slug <slug>', 'App slug (overrides ota.config.json)')
    .option('-u, --username <username>', 'GitHub username to invite')
    .option('-r, --role <role>', 'User role (admin or developer)')
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

        // Get GitHub username from options or prompt
        let username = options.username;

        if (!username) {
          // Prompt for username
          const { inputUsername } = await inquirer.prompt([
            {
              type: 'input',
              name: 'inputUsername',
              message: 'Enter GitHub username to invite:',
              validate: (input) => input ? true : 'Username is required',
            },
          ]);

          username = inputUsername;
        }

        // Get role from options or prompt
        let role = options.role as UserRole;

        if (!role || !Object.values(UserRole).includes(role as UserRole)) {
          // Prompt for role
          const { selectedRole } = await inquirer.prompt([
            {
              type: 'list',
              name: 'selectedRole',
              message: 'Select role for the invited user:',
              choices: Object.values(UserRole).map((r) => ({
                name: r,
                value: r,
              })),
              default: UserRole.DEVELOPER,
            },
          ]);

          role = selectedRole;
        }

        // Confirm with user
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to invite GitHub user "${username}" to ${app.name} (${app.slug}) as ${role}?`,
            default: true,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray('Invitation cancelled.'));
          return;
        }

        // Invite user
        console.log(chalk.blue(`Inviting ${username} to ${app.name} (${app.slug}) as ${role}...`));
        try {
          const result = await apiClient.inviteUserToApp(app.id, username, role);

          console.log(chalk.green(result.message));
        } catch (error: any) {
          if (error.response && error.response.status === 404) {
            console.log(chalk.red('User not found.'));
            console.log(chalk.gray('The user must have logged in to the system at least once to be invited.'));
          } else {
            throw error;
          }
        }
      } catch (error) {
        console.error(chalk.red('Error inviting user:'), error);
        process.exit(1);
      }
    });
}