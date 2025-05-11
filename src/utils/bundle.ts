import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import archiver from 'archiver';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Helper function to check if path exists
const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

// Helper function to get Expo project config
export const getExpoConfig = async (projectRoot: string): Promise<any> => {
  try {
    // Check for app.json
    const appJsonPath = path.join(projectRoot, 'app.json');
    if (await pathExists(appJsonPath)) {
      const appJson = await fs.readJson(appJsonPath);
      if (appJson.expo) {
        return appJson.expo;
      }
    }

    // Check for app.config.js
    const appConfigPath = path.join(projectRoot, 'app.config.js');
    if (await pathExists(appConfigPath)) {
      // This is more complex as it's a JS file
      // For simplicity, we'll parse it as a string
      const appConfigContent = await fs.readFile(appConfigPath, 'utf8');
      const versionMatch = appConfigContent.match(/version['"]*:\s*['"](.*?)['"]/);
      const nameMatch = appConfigContent.match(/name['"]*:\s*['"](.*?)['"]/);

      return {
        version: versionMatch?.[1] || '1.0.0',
        name: nameMatch?.[1] || 'Unknown',
      };
    }

    // Check for package.json as fallback
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      return {
        version: packageJson.version || '1.0.0',
        name: packageJson.name || 'Unknown',
      };
    }

    throw new Error('Could not find Expo configuration in the project');
  } catch (error) {
    console.error('Error reading Expo configuration:', error);
    throw error;
  }
};

// Create a bundle (zip file) of the project
export const createBundle = async (
  projectRoot: string,
  outputDir: string,
): Promise<{ bundlePath: string; assetPaths: string[] }> => {
  try {
    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    // Create temp directory for build
    const tempDir = path.join(outputDir, '.temp');
    await fs.ensureDir(tempDir);

    // Run expo export to get the bundle and assets
    console.log('Running expo export...');
    try {
      const result = await execAsync('npx expo export --dump-sourcemap --dev false --clear', {
        cwd: projectRoot // This is the root of the Expo project
      });
      console.log('Export successful:', result.stdout);
    } catch (error) {
      console.error('Error exporting Expo project:', error);
      throw new Error('Failed to export Expo project. Make sure expo-cli is installed.');
    }

    // Get paths to the exported files
    const distDir = path.join(projectRoot, 'dist');

    if (!await pathExists(distDir)) {
      throw new Error('Export did not generate a dist directory');
    }

    // Create bundle path
    const bundleFileName = 'bundle.js';
    const bundlePath = path.join(outputDir, bundleFileName);

    // Find main JS bundle
    const bundleFiles = glob.sync('**/*.js', { cwd: distDir });
    if (bundleFiles.length === 0) {
      throw new Error('No JS bundle found in export output');
    }

    // Copy the main bundle file
    await fs.copy(
      path.join(distDir, bundleFiles[0]),
      bundlePath,
    );

    // Find and copy asset files
    const assetFiles = glob.sync('**/*.{png,jpg,jpeg,gif,svg,ttf,otf,woff,woff2}', { cwd: distDir });
    const assetPaths: string[] = [];

    for (const assetFile of assetFiles) {
      const assetPath = path.join(outputDir, path.basename(assetFile));
      await fs.copy(
        path.join(distDir, assetFile),
        assetPath,
      );
      assetPaths.push(assetPath);
    }

    // Clean up
    await fs.remove(tempDir);

    return {
      bundlePath,
      assetPaths,
    };
  } catch (error) {
    console.error('Error creating bundle:', error);
    throw error;
  }
};