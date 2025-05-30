# OpenExpoOTA CLI

Command-line tool for managing OTA updates with the OpenExpoOTA self-hosted platform.

## Features

- GitHub OAuth and test-based authentication
- Create and manage Expo apps
- Publish OTA updates with runtime version targeting
- Support for multiple release channels (development, staging, production)
- Target version range support for granular client compatibility
- Asset management and deduplication
- List apps and updates with detailed information

## Installation

Install globally:

```bash
npm install -g openexpoota-cli
```

Or use it directly with npx:

```bash
npx openexpoota-cli [command]
```

After installation, you can use either of these commands:

```bash
openexpoota [command]
ota [command]
```

## Quick Start

1. **Login to your OpenExpoOTA server:**
   ```bash
   # For development/testing
   ota login --test --url http://localhost:3000/api

   # For production with GitHub OAuth
   ota login --url https://your-server.com/api
   ```

2. **Initialize your Expo project:**
   ```bash
   cd your-expo-project
   ota init
   ```

3. **Publish an update:**
   ```bash
   ota publish --channel development
   ```

## Configuration

All configuration is stored in `~/.openexpoota/config.json` and managed automatically by the CLI. The config includes:

- API URL
- Authentication token
- Current app slug
- Default channel and runtime version
- GitHub OAuth settings

## Commands

### Authentication

#### Test Login (Development)
For development and testing purposes:

```bash
ota login --test --url http://localhost:3000/api
```

#### GitHub OAuth Login (Production)
For production deployment:

```bash
ota login --url https://your-server.com/api
```

The CLI will open your browser for GitHub authentication and automatically handle the OAuth callback.

### App Management

Initialize a new app in your Expo project:

```bash
ota init [options]
```

Options:
- `--dir <directory>` - Project directory (defaults to current directory)
- `--default-channel <channel>` - Default release channel (development, staging, production)
- `--default-runtime-version <version>` - Default runtime version

List your apps:

```bash
ota list-apps
```

### Publishing Updates

Publish an update to your OpenExpoOTA server:

```bash
ota publish [options]
```

Options:
- `--dir <directory>` - Project directory (defaults to current directory)
- `--channel <channel>` - Release channel (development, staging, production)
- `--version <version>` - Update version (defaults to app.json version)
- `--runtime-version <version>` - Expo runtime version (defaults to app.json version)
- `--platform <platforms>` - Target platforms (comma-separated: ios,android,web)
- `--target-version-range <range>` - Semantic version range for client targeting

#### Examples:

```bash
# Basic publish to development channel
ota publish --channel development

# Publish with specific version and runtime version
ota publish --version 1.2.0 --runtime-version 1.2.0 --channel production

# Publish with target version range for compatibility
ota publish --channel staging --target-version-range ">=1.0.0 <2.0.0"

# Publish for specific platforms only
ota publish --platform ios,android --channel production
```

### Listing Updates

List updates for an app:

```bash
ota list-updates --app <app-slug>
```

### Advanced Commands

Promote an update to a different channel:

```bash
ota promote --app <app-slug> --update <update-id> --channel <target-channel>
```

Invite a user to collaborate on an app:

```bash
ota invite --app <app-slug> --username <github-username> --role <collaborator|admin>
```

## Workflow Integration

### Development Workflow

1. **Development Phase:**
   ```bash
   # Work on your features
   ota publish --channel development
   ```

2. **Staging/Testing:**
   ```bash
   # Promote to staging for testing
   ota publish --channel staging --version 1.2.0-beta
   ```

3. **Production Release:**
   ```bash
   # Release to production
   ota publish --channel production --version 1.2.0
   ```

### GitHub Actions Integration

Automate your OTA updates with GitHub Actions:

```yaml
# .github/workflows/publish-ota.yml
name: Publish OTA Update

on:
  push:
    branches: [main, develop]

jobs:
  publish-ota:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup Expo CLI
        run: npm install -g @expo/cli

      - name: Install OpenExpoOTA CLI
        run: npm install -g openexpoota-cli

      - name: Configure CLI
        run: |
          echo '${{ secrets.OPENEXPOOTA_TOKEN }}' > ~/.openexpoota/token
          echo '{"apiUrl":"${{ secrets.OPENEXPOOTA_API_URL }}","currentApp":"${{ secrets.APP_SLUG }}"}' > ~/.openexpoota/config.json

      - name: Publish to development
        if: github.ref == 'refs/heads/develop'
        run: ota publish --channel development --version ${{ github.run_number }}

      - name: Publish to production
        if: github.ref == 'refs/heads/main'
        run: ota publish --channel production --version ${{ github.run_number }}
```

### Version Strategy

The CLI supports flexible versioning strategies:

1. **Automatic versioning** - Uses version from `app.json`
2. **Manual versioning** - Specify with `--version` flag
3. **Runtime version targeting** - Use `--target-version-range` for compatibility

Example version targeting:
```bash
# Target clients with runtime version 1.x.x
ota publish --target-version-range "^1.0.0" --channel production

# Target specific version range
ota publish --target-version-range ">=1.2.0 <1.5.0" --channel staging
```

## Project Structure

When you run `ota init`, the CLI creates:

```
your-expo-project/
├── ota.config.json      # OpenExpoOTA project configuration
├── app.json             # Expo configuration (version, runtimeVersion)
└── ...
```

The `ota.config.json` contains:
```json
{
  "slug": "your-app-slug",
  "name": "Your App Name",
  "appId": 123
}
```

## Troubleshooting

### Common Issues

1. **Authentication failed:**
   ```bash
   # Clear stored token and re-login
   rm ~/.openexpoota/token
   ota login --test  # or regular login
   ```

2. **Project not initialized:**
   ```bash
   # Make sure you're in your Expo project directory
   ota init
   ```

3. **Bundle creation fails:**
   ```bash
   # Make sure Expo CLI is installed and project is valid
   npm install -g @expo/cli
   npx expo doctor
   ```

4. **Version conflicts:**
   ```bash
   # Use explicit version numbering
   ota publish --version 1.2.1 --channel development
   ```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=ota:* ota publish --channel development
```

## Development

To develop the CLI locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/openexpoota.git
cd openexpoota/cli

# Install dependencies
npm install

# Build the TypeScript
npm run build

# Link for local testing
npm link

# Test locally
ota --help
```

### Running Tests

```bash
npm test
```

### Building for Distribution

```bash
npm run build
npm publish
```

## Backend Connection

This CLI connects to an OpenExpoOTA backend server. Requirements:

- **Backend URL**: Your self-hosted OpenExpoOTA server
- **Authentication**: GitHub OAuth app configured on the backend
- **Network**: CLI needs HTTP access to the backend API

### Server Setup

Make sure your backend is configured with:

1. **GitHub OAuth App** - For authentication
2. **Database** - PostgreSQL with proper schema
3. **File Storage** - Local or S3-compatible storage
4. **CORS** - Allowing requests from CLI tools

See the [backend documentation](../backend/README.md) for detailed setup instructions.

### API Endpoints Used

The CLI interacts with these backend endpoints:

- `POST /api/auth/github` - GitHub OAuth login
- `GET /api/auth/test-login` - Test authentication (development)
- `GET /api/auth/me` - Get current user
- `GET /api/apps` - List apps
- `POST /api/apps` - Create app
- `POST /api/apps/:id/updates` - Publish update
- `GET /api/apps/:id/updates` - List updates

## License

MIT

## Support

For issues and support:

1. Check the [troubleshooting section](#troubleshooting)
2. Review the [backend logs](../backend/README.md#troubleshooting)
3. Create an issue on GitHub with debug output