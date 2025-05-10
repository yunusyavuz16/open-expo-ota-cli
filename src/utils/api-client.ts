import axios, { AxiosInstance } from 'axios';
import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import os from 'os';

// Config file path
const CONFIG_PATH = path.join(os.homedir(), '.openexpoota');
const TOKEN_PATH = path.join(CONFIG_PATH, 'token');
const CONFIG_FILE = path.join(CONFIG_PATH, 'config.json');

interface Config {
  apiUrl: string;
  currentApp?: string;
}

// Default config
const DEFAULT_CONFIG: Config = {
  apiUrl: 'http://localhost:3000/api',
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

  // Login with GitHub
  async getGitHubLoginUrl(): Promise<string> {
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
    } catch (error) {
      return false;
    }
  }

  // Get authenticated user
  async getUser(): Promise<any> {
    const response = await this.client.get('/auth/me');
    return response.data;
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
    const formData = new FormData();

    // Add update data
    formData.append('version', updateData.version);
    formData.append('channel', updateData.channel);
    formData.append('runtimeVersion', updateData.runtimeVersion);
    updateData.platforms.forEach((platform) => {
      formData.append('platforms', platform);
    });

    // Add bundle file
    formData.append('bundle', fs.createReadStream(bundlePath));

    // Add assets
    assetPaths.forEach((assetPath) => {
      formData.append('assets', fs.createReadStream(assetPath));
    });

    const response = await this.client.post(`/apps/${appId}/updates`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data;
  }
}

// Export a singleton instance
export default new ApiClient();