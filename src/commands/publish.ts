import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import apiClient from '../utils/api-client';
import { getExpoConfig, createBundle } from '../utils/bundle';
import { ReleaseChannel, Platform } from '../types';

export default function publish(program: Command): void {
  program
    .command('publish')
    .description('Publish an update to your OpenExpoOTA server')
    .option('-d, --dir <directory>', 'Project directory (defaults to current directory)')
    .option('-c, --channel <channel>', 'Release channel (production, staging, development)')
    .option('-v, --version <version>', 'Version of the update (defaults to app.json version)')
    .option('-r, --runtime-version <runtimeVersion>', 'Runtime version (defaults to app.json version)')
    .option('-p, --platform <platform>', 'Platform(s) to target (comma-separated: ios,android,web)')
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

        // Check for ota.config.json
        const configPath = path.join(projectDir, 'ota.config.json');
        if (!fs.existsSync(configPath)) {
          console.log(chalk.red('Project is not initialized. Please run `ota init` first.'));
          return;
        }

        // Read config
        const otaConfig = await fs.readJson(configPath);

        // Get app by slug
        const app = await apiClient.getAppBySlug(otaConfig.slug);
        if (!app) {
          console.log(chalk.red(`App with slug "${otaConfig.slug}" not found.`));
          return;
        }

        console.log(chalk.blue(`Publishing update for app: ${app.name} (${app.slug})`));

        // Get Expo config for version info
        const expoConfig = await getExpoConfig(projectDir);

        // Determine version and runtime version
        const version = options.version || expoConfig.version || '1.0.0';
        const runtimeVersion = options.runtimeVersion || expoConfig.runtimeVersion || expoConfig.version || '1.0.0';

        // Determine channel
        let channel: ReleaseChannel = ReleaseChannel.DEVELOPMENT;
        if (options.channel) {
          if (Object.values(ReleaseChannel).includes(options.channel as ReleaseChannel)) {
            channel = options.channel as ReleaseChannel;
          } else {
            console.log(chalk.yellow(`Invalid channel: ${options.channel}. Using default: ${channel}`));
          }
        }

        // Determine platforms
        let platforms: Platform[] = [Platform.IOS, Platform.ANDROID];
        if (options.platform) {
          const requestedPlatforms = options.platform.split(',');
          platforms = requestedPlatforms
            .filter((p: string) => Object.values(Platform).includes(p as Platform))
            .map((p: string) => p as Platform);

          if (platforms.length === 0) {
            console.log(chalk.yellow(`Invalid platforms: ${options.platform}. Using default: ios,android`));
            platforms = [Platform.IOS, Platform.ANDROID];
          }
        }

        // Confirm with user
        console.log(chalk.gray('Update details:'));
        console.log(chalk.gray(`- Version: ${version}`));
        console.log(chalk.gray(`- Runtime Version: ${runtimeVersion}`));
        console.log(chalk.gray(`- Channel: ${channel}`));
        console.log(chalk.gray(`- Platforms: ${platforms.join(', ')}`));

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Do you want to publish this update?',
            default: true,
          },
        ]);

        if (!confirm) {
          console.log(chalk.gray('Publishing cancelled.'));
          return;
        }

        // Create temporary directory for bundle
        const tempDir = path.join(os.tmpdir(), `openexpoota-${Date.now()}`);
        await fs.ensureDir(tempDir);

        console.log(chalk.blue('Creating bundle...'));

        // Create bundle
        const { bundlePath, assetPaths } = await createBundle(projectDir, tempDir);

        console.log(chalk.gray(`Bundle created at: ${bundlePath}`));
        console.log(chalk.gray(`Assets: ${assetPaths.length} files`));

        // Publish update
        console.log(chalk.blue('Uploading to server...'));
        try {
          const update = await apiClient.publishUpdate(
            app.id,
            {
              version,
              channel,
              runtimeVersion,
              platforms,
            },
            bundlePath,
            assetPaths
          );

          console.log(chalk.green('Update published successfully!'));
          console.log(chalk.gray(`Update ID: ${update.id}`));
          console.log(chalk.gray(`Channel: ${update.channel}`));
          console.log(chalk.gray(`Version: ${update.version}`));

          // Clean up
          await fs.remove(tempDir);
        } catch (error) {
          console.error(chalk.red('Error publishing update:'), error);
          await fs.remove(tempDir);
        }
      } catch (error) {
        console.error(chalk.red('Error publishing update:'), error);
        process.exit(1);
      }
    });
}