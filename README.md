# OpenExpoOTA CLI

Command-line tool for OpenExpoOTA - A self-hosted OTA update system for Expo apps.

## Installation

```bash
npm install -g openexpoota-cli
```

Or for development:

```bash
git clone https://github.com/yourusername/openexpoota.git
cd openexpoota/cli
npm install
npm link
```

## Usage

```bash
ota [command] [options]
```

### Commands

- `login`: Log in to the OpenExpoOTA server
- `init`: Initialize OpenExpoOTA in your Expo project
- `publish`: Publish an update to your OpenExpoOTA server
- `list-apps`: List your apps on the OpenExpoOTA server
- `list-updates`: List updates for an app
- `promote`: Promote an update to a different release channel
- `invite`: Invite a GitHub user to collaborate on an app
- `config`: View or update configuration

### Login

```bash
ota login [options]
```

Options:
- `-u, --url <url>`: API URL to use (e.g. http://localhost:3000/api)

This command starts a local server and opens your browser to authenticate with GitHub OAuth.

### Init

```bash
ota init [options]
```

Options:
- `-d, --dir <directory>`: Project directory (defaults to current directory)

This command initializes your Expo project with OpenExpoOTA configuration. It lets you create a new app or select an existing one.

### Publish

```bash
ota publish [options]
```

Options:
- `-d, --dir <directory>`: Project directory (defaults to current directory)
- `-c, --channel <channel>`: Release channel (production, staging, development)
- `-v, --version <version>`: Version of the update (defaults to app.json version)
- `-r, --runtime-version <runtimeVersion>`: Runtime version (defaults to app.json version)
- `-p, --platform <platform>`: Platform(s) to target (comma-separated: ios,android,web)

This command bundles your Expo project and publishes an update to your OpenExpoOTA server.

### List Apps

```bash
ota list-apps
```

Lists all apps you have access to on the OpenExpoOTA server.

### List Updates

```bash
ota list-updates [options]
```

Options:
- `-d, --dir <directory>`: Project directory (defaults to current directory)
- `-s, --slug <slug>`: App slug (overrides ota.config.json)

Lists all updates for an app on the OpenExpoOTA server.

### Promote Update

```bash
ota promote [options]
```

Options:
- `-d, --dir <directory>`: Project directory (defaults to current directory)
- `-s, --slug <slug>`: App slug (overrides ota.config.json)
- `-u, --update-id <updateId>`: ID of the update to promote
- `-c, --channel <channel>`: Target channel (production, staging, development)

Promotes an existing update to a different release channel. For example, promote a development update to staging or production.

### Invite User

```bash
ota invite [options]
```

Options:
- `-d, --dir <directory>`: Project directory (defaults to current directory)
- `-s, --slug <slug>`: App slug (overrides ota.config.json)
- `-u, --username <username>`: GitHub username to invite
- `-r, --role <role>`: User role (admin or developer)

Invites a GitHub user to collaborate on an app with the specified role.

## Configuration

The CLI creates a configuration file in your home directory at `~/.openexpoota/config.json`. You can edit this file directly if needed.

Additionally, when you initialize a project, it creates an `ota.config.json` file in your project directory with project-specific configuration.

### Environment Variables

The CLI also supports configuration via environment variables. You can create a `.env` file in your project:

```bash
# Copy the example environment file
cp .env.example .env
# Edit with your settings
```

Available environment variables:
- `API_URL`: URL of your OpenExpoOTA backend API
- `AUTH_TOKEN`: Authentication token (set automatically after login)
- `DEFAULT_CHANNEL`: Default release channel for updates
- `DEFAULT_RUNTIME_VERSION`: Default runtime version

## Compatibility

The CLI is compatible with the OpenExpoOTA backend using either PostgreSQL directly or Supabase as the database provider.

## License

MIT