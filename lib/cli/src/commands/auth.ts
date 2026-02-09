import { Command } from 'commander';
import { handleError } from '../utils/handle-error';
import { getConfig, saveConfig } from '../utils/get-config';
import open from 'open';
import { logger } from '../utils/logger';
import ora from 'ora';
import chalk from 'chalk';
import http from 'http';
import { URL } from 'url';
import inquirer from 'inquirer';

/**
 * Command to authenticate with Keycloak.
 * This command implements a direct OAuth flow:
 * 1. Verifies that authType is set to 'keycloak' in .etherealrc
 * 2. Uses the authenticationUrl from .etherealrc as the Keycloak server URL
 * 3. Sets up a local server to receive the callback
 * 4. Opens the browser for the user to login
 * 5. Listens for a token parameter in the callback URL (localhost:${port}/?token=...)
 * 6. Saves the received token to the .etherealrc file
 */
export const authLogin = new Command()
  .name('auth')
  .description('Ethereal Nexus authentication command.')
  .argument('login', 'to login')
  .option('--port <port>', 'Port to use for the callback server', '3000')
  .action(async (_, options) => {
    try {
      const config = await getConfig();

      if (!config) {
        logger.error('No configuration found. Please run `ethereal init` first.');
        process.exit(1);
      }

      if (!config.url) {
        logger.error('No authentication URL found in configuration.');
        process.exit(1);
      }

      if (!config.authType || config.authType !== 'keycloak') {
        logger.error('Authentication type must be set to "keycloak" in .etherealrc');
        process.exit(1);
      }

      logger.info(`Starting Keycloak login flow...`);

      // Use the authentication URL directly without format verification
      const baseUrl = config.url;

      logger.info(`Using Keycloak server: ${baseUrl}`);

      // Create a local server to receive the callback
      const server = http.createServer();

      // Use the specified port or default to 3000
      const port = parseInt(options.port);

      try {
        server.listen(port);
        logger.info(`Using port ${port} for callback server`);
      } catch (error) {
        logger.error(`Failed to bind to port ${port}. It might be in use by another application.`);
        process.exit(1);
      }

      // Handle server errors
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use. Please specify a different port with --port option.`);
          process.exit(1);
        } else {
          logger.error(`Server error: ${error.message}`);
          process.exit(1);
        }
      });

      // Create a promise that will resolve when we get the tokens
      const tokenPromise = new Promise<{ access_token: string, refresh_token?: string }>((resolve, reject) => {
        // Set a timeout to reject the promise after 5 minutes
        const timeout = setTimeout(() => {
          server.close();
          reject(new Error('Authentication timed out'));
        }, 5 * 60 * 1000);

        server.on('request', async (req, res) => {
          try {
            // Parse the URL to get the token
            const url = new URL(req.url || '', `http://localhost:${port}`);
            const token = url.searchParams.get('token');

            if (token) {
              // Send a response to the browser
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('Ethereal Nexus CLI Authentication successful! You can close this window.');

              // Resolve the promise with the token
              clearTimeout(timeout);
              resolve({ access_token: token });

              // Close the server
              server.close();
            }
          } catch (error) {
            reject(error);
            server.close();
          }
        });
      });

      // Ensure the auth URL is correctly constructed
      const authUrlBase = baseUrl.endsWith(`/api/v1/cli-auth?callback=http://localhost:${port}`)
        ? baseUrl 
        : `${baseUrl}/api/v1/cli-auth?callback=http://localhost:${port}`;
      const authUrl = new URL(authUrlBase);

      // Open the browser with the login URL
      logger.info(`Opening browser to authenticate...`);
      logger.info(`If the browser doesn't open automatically, please visit:`);
      logger.info(chalk.cyan(authUrl.toString()));

      await open(authUrl.toString());

      logger.info(`Waiting for authentication...`);

      // Wait for the tokens
      try {
        const { access_token } = await tokenPromise;

        // Save the tokens to the config
        const spinner = ora('Saving authentication tokens...').start();
        await saveConfig({
          ...config,
          token: access_token
        });
        spinner.succeed();

        logger.info(chalk.green('Authentication successful!'));
      } catch (error) {
        logger.error('Authentication failed:', error);
        process.exit(1);
      }
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Command to logout.
 * This command simply removes the authentication token from the config file.
 */
export const authLogout = new Command()
  .name('auth logout')
  .description('Ethereal Nexus authentication command.')
  .argument('logout', 'to logout')
  .action(async () => {
    try {
      const config = await getConfig();

      if (!config) {
        logger.error('No configuration found. Please run `ethereal init` first.');
        process.exit(1);
      }

      if (!config.auth) {
        logger.info('You are not currently logged in.');
        process.exit(0);
      }

      // Remove the token from the config
      const spinner = ora('Removing local authentication token...').start();
      await saveConfig({
        ...config,
        token: undefined
      });
      spinner.succeed();

      logger.info(chalk.green('Logged out successfully!'));
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Command to list and select API keys.
 * This command:
 * 1. Checks if .etherealrc has an "auth" field
 * 2. Lists all API keys from a specific user (mocked data for now)
 * 3. Allows keyboard selection of a specific API key
 * 4. Saves the selected API key to .etherealrc
 */
export const authKeys = new Command()
  .name('authkeys')
  .description('List and select API keys.')
  .argument('keys', 'to list and select API keys')
  .action(async () => {
    try {
      const config = await getConfig();

      if (!config) {
        logger.error('No configuration found. Please run `ethereal init` first.');
        process.exit(1);
      }

      if (!config.token) {
        logger.error('You are not authenticated. Please run `ethereal auth login` first.');
        process.exit(1);
      }

      logger.info('Fetching API keys...');

      // Fetch API keys from the server
      let apiKeys = [];
      const baseUrl = config.url;
      const apiKeysUrl = baseUrl.endsWith('/api/v1/cli/apikeys')
        ? baseUrl
        : `${baseUrl}/api/v1/cli/apikeys`;

      try {
        // Determine if the API keys URL is using HTTPS
        const isHttps = apiKeysUrl.startsWith('https://');

        // Set the appropriate cookie name based on the protocol
        const cookieName = isHttps ? '__Secure-authjs.session-token' : 'authjs.session-token';

        const response = await fetch(apiKeysUrl, {
          headers: {
            'Cookie': `${cookieName}=${config.token}; Secure; HttpOnly; SameSite=Strict`
          }
        });

        if (!response.ok) {
          logger.error(`Failed to fetch API keys: ${response.statusText}`);
          process.exit(1);
        }

        apiKeys = await response.json();

        if (!apiKeys || apiKeys.length === 0) {
          logger.error('No API keys found for your account.');
          process.exit(1);
        }
      } catch (error) {
        logger.error('Failed to fetch API keys:', error);
        process.exit(1);
      }

      // Display API keys with inquirer
      const { selectedKey } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedKey',
          message: 'Select an API key to use:',
          choices: apiKeys.map((key: { permissions: any; id:string, created_at: string | number | Date; alias: any; key: any; }) => {
            // Format the permissions for display
            const permissionsStr = Object.entries(key.permissions ?? {})
              .map(([resource, permission]) => `${resource}: ${permission}`)
              .join(', ');

            // Format the created_at date
            const createdDate = new Date(key.created_at).toLocaleDateString();

            return {
              name: `${key.alias || 'Unnamed Key'} - ${key.key} - Created: ${createdDate} - Permissions: ${permissionsStr}`,
              value: key.key
            };
          }),
        },
      ]);

      // Save the selected API key to .etherealrc
      const spinner = ora('Saving selected API key...').start();
      await saveConfig({
        ...config,
        auth: selectedKey
      });
      spinner.succeed();

      logger.info(chalk.green('API key saved successfully!'));
      logger.info(`Using API key: ${chalk.cyan(selectedKey)}`);
    } catch (error) {
      handleError(error);
    }
  });
