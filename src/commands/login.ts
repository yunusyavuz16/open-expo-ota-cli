import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import open from 'open';
import http from 'http';
import url from 'url';
import apiClient from '../utils/api-client';

export default function login(program: Command): void {
  program
    .command('login')
    .description('Log in to the OpenExpoOTA server')
    .option('-u, --url <url>', 'API URL to use (e.g. http://localhost:3000/api)')
    .action(async (options) => {
      try {
        // If API URL is provided, set it
        if (options.url) {
          apiClient.setApiUrl(options.url);
          console.log(chalk.green(`API URL set to ${options.url}`));
        }

        // Check if already logged in
        const isTokenValid = await apiClient.checkToken();
        if (isTokenValid) {
          const user = await apiClient.getUser();
          console.log(chalk.green(`You are already logged in as ${user.username}`));
          return;
        }

        // Set up local server to receive OAuth callback
        const server = http.createServer();
        const PORT = 8080;

        // Promise to wait for the callback
        const waitForCallback = new Promise<string>((resolve, reject) => {
          server.on('request', (req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            const { token } = parsedUrl.query;

            if (token) {
              // Send success response to browser
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                <head><title>Login Successful</title></head>
                <body>
                  <h1>Login Successful!</h1>
                  <p>You can now close this window and return to the CLI.</p>
                  <script>window.close();</script>
                </body>
                </html>
              `);

              // Resolve the promise with the token
              resolve(token as string);

              // Close the server
              server.close();
            } else {
              // Send error response to browser
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                <head><title>Login Failed</title></head>
                <body>
                  <h1>Login Failed</h1>
                  <p>No token received. Please try again.</p>
                </body>
                </html>
              `);

              reject(new Error('No token received'));
            }
          });
        });

        // Start server
        server.listen(PORT, () => {
          console.log(chalk.blue('Starting GitHub OAuth login...'));
          console.log(chalk.gray('Opening browser for authentication...'));

          // Open browser for GitHub OAuth
          const loginUrl = `${apiClient.getGitHubLoginUrl()}?redirect=http://localhost:${PORT}`;
          open(loginUrl);
        });

        // Wait for callback
        try {
          const token = await waitForCallback;
          apiClient.setToken(token);
          const user = await apiClient.getUser();
          console.log(chalk.green(`Successfully logged in as ${user.username}`));
        } catch (error) {
          console.error(chalk.red('Login failed:'), error);
          server.close();
        }
      } catch (error) {
        console.error(chalk.red('Error during login:'), error);
        process.exit(1);
      }
    });
}