#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

// Import commands
import login from './commands/login';
import init from './commands/init';
import publish from './commands/publish';
import listApps from './commands/list-apps';
import listUpdates from './commands/list-updates';
import promoteUpdate from './commands/promote-update';
import inviteUser from './commands/invite-user';

// Create CLI program
const program = new Command();

// Set CLI metadata
program
  .name('ota')
  .description('CLI tool for OpenExpoOTA - A self-hosted OTA update system for Expo')
  .version('1.0.0');

// Register commands
login(program);
init(program);
publish(program);
listApps(program);
listUpdates(program);
promoteUpdate(program);
inviteUser(program);

// Display help by default if no command is provided
if (process.argv.length === 2) {
  program.help();
}

// Parse command line arguments
program.parse(process.argv);