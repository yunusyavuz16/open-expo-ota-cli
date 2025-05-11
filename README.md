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

## Setup

1. Create a `.env` file in your project directory:

```bash
cp .env.example .env
```

2. Configure your environment variables:

```
API_URL=http://localhost:3000/api
TOKEN_PATH=.openexpoota.json
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_OAUTH_REDIRECT=http://localhost:3000/api/auth/cli/callback
DEFAULT_CHANNEL=development
```

## Commands

### Authentication

Log in with GitHub:

```bash
openexpoota login
```

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
- `--name` - App name
- `--slug` - App slug (unique identifier)
- `--description` - App description

### Publishing Updates

Publish an update:

```bash
openexpoota publish [options]
```

Options:
- `--app` - App slug or ID
- `--channel` - Release channel (defaults to 'development')
- `--version` - Update version
- `--runtime-version` - Expo runtime version
- `--path` - Path to the expo export directory (defaults to 'dist')

### Listing Updates

List updates for an app:

```bash
openexpoota list-updates --app [app-slug]
```

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
          openexpoota publish --app my-app --channel production --version ${{ github.sha }} --runtime-version 1.0.0
        env:
          OPENEXPOOTA_TOKEN: ${{ secrets.OPENEXPOOTA_TOKEN }}
```

## Development

To develop the CLI:

```bash
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

This CLI connects to a OpenExpoOTA backend. Make sure you have set up and configured the backend according to [the backend documentation](../backend/README.md).

The backend uses an Entity Framework-like approach with Supabase for data storage, making it easy to manage and query your OTA updates.

## License

MIT