import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import os from 'os';
import archiver from 'archiver';

// Config file path
const CONFIG_PATH = path.join(os.homedir(), '.openexpoota');
const TOKEN_PATH = path.join(CONFIG_PATH, 'token');
const CONFIG_FILE = path.join(CONFIG_PATH, 'config.json');

interface Config {
  apiUrl: string;
  currentApp?: string;
  defaultChannel?: string;
  defaultRuntimeVersion?: string;
  githubClientId?: string;
  githubOauthRedirect?: string;
}

// Default config
const DEFAULT_CONFIG: Config = {
  apiUrl: 'http://localhost:3000/api',
  defaultChannel: 'development',
  defaultRuntimeVersion: '1.0.0',
};

// Create config directory if it doesn't exist
if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(CONFIG_PATH, { recursive: true });
}

// Load config from file or create default
export const getConfig = (): Config => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading config, using default');
  }

  // Save default config
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
};

// Save config to file
export const saveConfig = (config: Config): void => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

// Save token to file
export const saveToken = (token: string): void => {
  fs.writeFileSync(TOKEN_PATH, token);
};

// Get token from file
export const getToken = (): string | null => {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return fs.readFileSync(TOKEN_PATH, 'utf8');
    }
  } catch (error) {
    console.error('Error loading token');
  }
  return null;
};

// API client class
class ApiClient {
  private client: AxiosInstance;
  private config: Config;

  constructor() {
    this.config = getConfig();
    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests if available
    const token = getToken();
    if (token) {
      this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }

  // Set API URL
  setApiUrl(url: string): void {
    this.config.apiUrl = url;
    this.client.defaults.baseURL = url;
    saveConfig(this.config);
  }

  // Set current app
  setCurrentApp(appSlug: string): void {
    this.config.currentApp = appSlug;
    saveConfig(this.config);
  }

  // Get current app
  getCurrentApp(): string | undefined {
    return this.config.currentApp;
  }

  // Get default channel
  getDefaultChannel(): string {
    return this.config.defaultChannel || 'development';
  }

  // Set default channel
  setDefaultChannel(channel: string): void {
    this.config.defaultChannel = channel;
    saveConfig(this.config);
  }

  // Get default runtime version
  getDefaultRuntimeVersion(): string {
    return this.config.defaultRuntimeVersion || '1.0.0';
  }

  // Set default runtime version
  setDefaultRuntimeVersion(version: string): void {
    this.config.defaultRuntimeVersion = version;
    saveConfig(this.config);
  }

  // Set GitHub OAuth config
  setGitHubOAuthConfig(clientId: string, redirectUrl: string): void {
    this.config.githubClientId = clientId;
    this.config.githubOauthRedirect = redirectUrl;
    saveConfig(this.config);
  }

  // Get GitHub OAuth client ID
  getGitHubClientId(): string | undefined {
    return this.config.githubClientId;
  }

  // Get GitHub OAuth redirect URL
  getGitHubOAuthRedirect(): string | undefined {
    return this.config.githubOauthRedirect;
  }

  // Login with GitHub
  getGitHubLoginUrl(): string {
    return `${this.config.apiUrl}/auth/github`;
  }

  // Set token
  setToken(token: string): void {
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
    saveToken(token);
  }

  // Check if token is valid
  async checkToken(): Promise<boolean> {
    try {
      await this.client.get('/auth/me');
      return true;
    } catch (error: any) {
      // If status is 401 or 403, token is invalid or expired
      // Any other error might be a connection issue
      const status = error.response?.status;
      if (status !== 401 && status !== 403) {
        console.error('Error checking token validity:', error.message || String(error));
      }
      return false;
    }
  }

  // Get authenticated user
  async getUser(): Promise<any> {
    try {
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      }
      throw error;
    }
  }

  // List apps
  async listApps(): Promise<any[]> {
    const response = await this.client.get('/apps');
    return response.data;
  }

  // Get app by slug
  async getAppBySlug(slug: string): Promise<any> {
    const apps = await this.listApps();
    return apps.find((app) => app.slug === slug);
  }

  // Create app
  async createApp(appData: { name: string; slug: string; description: string }): Promise<any> {
    const response = await this.client.post('/apps', appData);
    return response.data;
  }

  // List updates for an app
  async listUpdates(appId: number): Promise<any[]> {
    const response = await this.client.get(`/apps/${appId}/updates`);
    return response.data;
  }

  // Invite a user to an app
  async inviteUserToApp(appId: number, username: string, role?: string): Promise<any> {
    const response = await this.client.post(`/apps/${appId}/invite`, { username, role });
    return response.data;
  }

  // Promote an update to a different channel
  async promoteUpdate(appId: number, updateId: number, channel: string): Promise<any> {
    const response = await this.client.post(`/apps/${appId}/updates/${updateId}/promote`, { channel });
    return response.data;
  }

  // Rollback to a previous update
  async rollbackUpdate(appId: number, updateId: number): Promise<any> {
    const response = await this.client.post(`/apps/${appId}/updates/${updateId}/rollback`);
    return response.data;
  }

  // Publish update
  async publishUpdate(
    appId: number,
    updateData: {
      version: string;
      channel: string;
      runtimeVersion: string;
      platforms: string[];
    },
    bundlePath: string,
    assetPaths: string[] = []
  ): Promise<any> {
    try {
      // Create a zip file containing bundle and assets
      console.log('Creating update package...');
      const tempDir = os.tmpdir();
      const zipPath = path.join(tempDir, `update-${Date.now()}.zip`);

      // Use a simpler archive creation approach
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`Update package created: ${zipPath} (${Math.round(archive.pointer() / 1024)} KB)`);
          resolve();
        });

        output.on('error', (err) => {
          reject(err);
        });

        archive.on('error', (err) => {
          reject(err);
        });

        archive.on('warning', (err) => {
          console.warn('Warning during archive creation:', err);
        });

        archive.pipe(output);

        // Add the bundle file
        archive.file(bundlePath, { name: 'bundle.js' });

        // Add assets
        for (const assetPath of assetPaths) {
          const assetName = path.basename(assetPath);
          archive.file(assetPath, { name: `assets/${assetName}` });
        }

        // Add metadata.json
        const metadata = {
          version: updateData.version,
          channel: updateData.channel,
          runtimeVersion: updateData.runtimeVersion,
          platforms: updateData.platforms
        };

        archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

        // Finalize
        archive.finalize();
      });

      // Verify the ZIP file
      if (!fs.existsSync(zipPath)) {
        throw new Error('Failed to create zip file');
      }

      const stats = fs.statSync(zipPath);
      console.log(`Zip file size: ${stats.size} bytes`);

      if (stats.size === 0) {
        throw new Error('Created ZIP file is empty');
      }

      // Use a simpler approach to send the file - form-data without axios transformations
      console.log(`Uploading to ${this.client.defaults.baseURL}/apps/${appId}/updates`);

      // Create form data
      const form = new FormData();
      form.append('version', updateData.version);
      form.append('channel', updateData.channel);
      form.append('runtimeVersion', updateData.runtimeVersion);

      // Ensure platforms is properly formatted as a string array
      const platformsArray = Array.isArray(updateData.platforms)
        ? updateData.platforms
        : [updateData.platforms].filter(Boolean);

      form.append('platforms', JSON.stringify(platformsArray));

      // Add the bundle file
      form.append('bundle', fs.createReadStream(zipPath), {
        filename: path.basename(zipPath),
        contentType: 'application/zip'
      });

      // Try using a custom axios configuration with minimal transformations
      const response = await this.client.post(`/apps/${appId}/updates`, form, {
        headers: {
          ...form.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 300000, // 5 minute timeout
      });

      console.log('Response received:', response.status);

      // Clean up temp file
      try {
        fs.unlinkSync(zipPath);
      } catch (err) {
        console.warn('Warning: Failed to clean up temporary zip file:', err);
      }

      // Return the data
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No response received from server');
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  }
}

// Export a singleton instance
export default new ApiClient();