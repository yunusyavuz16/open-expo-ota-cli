export enum ReleaseChannel {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development'
}

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web'
}

export enum UserRole {
  ADMIN = 'admin',
  DEVELOPER = 'developer'
}

export interface App {
  id: number;
  name: string;
  slug: string;
  description: string;
  ownerId: number;
  githubRepoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Update {
  id: number;
  appId: number;
  version: string;
  channel: ReleaseChannel;
  runtimeVersion: string;
  isRollback: boolean;
  bundleId: number;
  manifestId: number;
  publishedBy: number;
  createdAt: string;
  updatedAt: string;
}