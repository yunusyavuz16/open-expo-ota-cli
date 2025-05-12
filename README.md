# OpenExpoOTA CLI

Command-line tool for managing OTA updates with the OpenExpoOTA self-hosted platform.

## Features

- GitHub-based authentication
- Create and manage apps
- Publish OTA updates for Expo apps
- List apps and updates
- Specify release channels and runtime versions

## Installation

```bash
npm install -g openexpoota-cli
```

Or use it directly with npx:

```bash
npx openexpoota-cli [command]
```

## Configuration

All configuration is handled through command-line parameters and stored in a local configuration file at `~/.openexpoota/config.json`. You don't need to edit this file directly as the CLI manages it for you.

## Commands

### Authentication

Log in with GitHub:

```bash
openexpoota login --github-client-id <client-id> --github-redirect <redirect-url> --url <api-url>
```

Options:
- `--github-client-id` - GitHub OAuth client ID
- `--github-redirect` - GitHub OAuth redirect URL
- `--url` - API URL (e.g., `http://localhost:3000/api`)

This will open a browser window for GitHub authentication.

### App Management

List your apps:

```bash
openexpoota list-apps
```

Create a new app:

```bash
openexpoota init [options]
```

Options:
- `--dir` - Project directory (defaults to current directory)
- `--default-channel` - Default release channel (development, staging, production)
- `--default-runtime-version` - Default runtime version

### Publishing Updates

Publish an update:

```bash
openexpoota publish [options]
```

Options:
- `--dir` - Project directory (defaults to current directory)
- `--channel` - Release channel (defaults to configured default or 'development')
- `--version` - Update version (defaults to app.json version)
- `--runtime-version` - Expo runtime version (defaults to app.json version or configured default)
- `--platform` - Platform(s) to target (comma-separated: ios,android,web)

### Listing Updates

List updates for an app:

```bash
openexpoota list-updates --app [app-slug]
```

### Promoting Updates

Promote an update to a different channel:

```bash
openexpoota promote-update [options]
```

Options:
- `--app` - App slug or ID
- `--update` - Update ID
- `--channel` - Target channel

## Workflow Integration

### GitHub Actions

You can integrate OpenExpoOTA CLI into your CI/CD pipeline:

```yaml
# .github/workflows/publish-update.yml
name: Publish OTA Update

on:
  push:
    branches: [main]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - name: Install dependencies
        run: npm install
      - name: Build Expo project
        run: npx expo export:web
      - name: Publish update
        run: |
          npm install -g openexpoota-cli
          openexpoota publish --channel production --version ${{ github.sha }} --runtime-version 1.0.0
        env:
          # Authentication token will be set by the login step
          OPENEXPOOTA_TOKEN: ${{ secrets.OPENEXPOOTA_TOKEN }}
```

## Development

To develop the CLI:

```bash
# Clone the repository
git clone https://github.com/yourusername/openexpoota.git
cd openexpoota/cli

# Install dependencies
npm install

# Build
npm run build

# Link for local testing
npm link

# Run tests
npm test
```

## Connection with Backend

This CLI connects to an OpenExpoOTA backend. Make sure you have set up and configured the backend according to [the backend documentation](../backend/README.md).

## License

MIT