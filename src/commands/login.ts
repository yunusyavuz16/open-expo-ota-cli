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
    .option('--github-client-id <id>', 'GitHub OAuth client ID')
    .option('--github-redirect <url>', 'GitHub OAuth redirect URL')
    .option('--test', 'Use test login for development')
    .action(async (options) => {
      try {
        // If API URL is provided, set it
        if (options.url) {
          apiClient.setApiUrl(options.url);
          console.log(chalk.green(`API URL set to ${options.url}`));
        }

        // Check if already logged in
        try {
          const isTokenValid = await apiClient.checkToken();
          if (isTokenValid) {
            const user = await apiClient.getUser();
            console.log(chalk.green(`You are already logged in as ${user.username}`));
            return;
          }
        } catch (error) {
          console.error(`Error checking token validity: ${error}`);
        }

        // Special test mode for development
        if (options.test) {
          try {
            console.log(chalk.blue('Using test login mode for development...'));

            // Get test token from the test-login endpoint
            const token = await apiClient.testLogin();

            // Store the token
            apiClient.setToken(token);
            console.log(chalk.green('Successfully logged in with test account.'));
            console.log(chalk.gray('Username: test-user'));
            console.log(chalk.gray('Role: admin'));
            return;
          } catch (error: any) {
            console.error(chalk.red('Test login failed:'), error.message || String(error));
            if (error.response) {
              console.error(chalk.red('Server response:'), error.response.data);
            }
            process.exit(1);
          }
        }

        // If GitHub OAuth config is provided, set it
        if (options.githubClientId || options.githubRedirect) {
          const clientId = options.githubClientId || apiClient.getGitHubClientId();
          const redirectUrl = options.githubRedirect || apiClient.getGitHubOAuthRedirect();

          if (!clientId) {
            console.log(chalk.red('GitHub OAuth client ID is required for login.'));
            console.log(chalk.gray('Use --github-client-id <id> to provide it.'));
            return;
          }

          if (!redirectUrl) {
            console.log(chalk.red('GitHub OAuth redirect URL is required for login.'));
            console.log(chalk.gray('Use --github-redirect <url> to provide it.'));
            return;
          }

          apiClient.setGitHubOAuthConfig(clientId, redirectUrl);
          console.log(chalk.green('GitHub OAuth configuration updated.'));
        }

        // Verify GitHub OAuth config
        const clientId = apiClient.getGitHubClientId();
        if (!clientId) {
          console.log(chalk.red('GitHub OAuth client ID is not configured.'));
          console.log(chalk.gray('Use --github-client-id <id> to provide it.'));
          return;
        }

        // Set up local server to receive OAuth callback
        const server = http.createServer();
        const PORT = 8080;

        // Promise to wait for the callback
        const waitForCallback = new Promise<string>((resolve, reject) => {
          let timeoutId: NodeJS.Timeout;

          server.on('request', (req, res) => {
            const parsedUrl = url.parse(req.url || '', true);
            const { token } = parsedUrl.query;

            if (token) {
              // Send success response to browser
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                <head>
                  <title>Login Successful</title>
                  <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
                    h1 { color: #2c7be5; }
                  </style>
                </head>
                <body>
                  <h1>Login Successful!</h1>
                  <p>Authentication complete. You can now close this window and return to the CLI.</p>
                  <script>window.close();</script>
                </body>
                </html>
              `);

              // Clear the timeout
              if (timeoutId) clearTimeout(timeoutId);

              // Resolve the promise with the token
              resolve(token as string);

              // Close the server
              server.close();
            } else {
              // Send error response to browser
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                <head>
                  <title>Login Failed</title>
                  <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
                    h1 { color: #e53e3e; }
                  </style>
                </head>
                <body>
                  <h1>Login Failed</h1>
                  <p>No token received. Please try again.</p>
                  <button onclick="window.close()">Close Window</button>
                </body>
                </html>
              `);
            }
          });

          // Set a timeout in case authorization takes too long
          timeoutId = setTimeout(() => {
            server.close();
            reject(new Error('Login timed out after 5 minutes. Please try again.'));
          }, 5 * 60 * 1000); // 5 minutes timeout
        });

        // Start server
        server.listen(PORT, () => {
          console.log(chalk.blue('Starting GitHub OAuth login...'));
          console.log(chalk.gray('Opening browser for authentication...'));

          // Open browser for GitHub OAuth with redirect parameter
          const redirectUrl = encodeURIComponent(`http://localhost:${PORT}`);
          const loginUrl = `${apiClient.getGitHubLoginUrl()}?redirect=${redirectUrl}`;
          open(loginUrl);

          console.log(chalk.gray('Waiting for authentication to complete...'));
          console.log(chalk.gray('If your browser does not open automatically, please visit:'));
          console.log(chalk.cyan(loginUrl));
        });

        // Wait for callback
        try {
          const token = await waitForCallback;
          apiClient.setToken(token);

          // Verify the token by fetching user info
          const user = await apiClient.getUser();
          console.log(chalk.green(`\nSuccessfully logged in as ${user.username}`));
          console.log(chalk.gray(`Your token has been saved and will be used for future commands.`));
        } catch (error: any) {
          console.error(chalk.red('\nLogin failed:'), error.message || String(error));
          server.close();
        }
      } catch (error: any) {
        console.error(chalk.red('Error during login:'), error.message || String(error));
        process.exit(1);
      }
    });
}