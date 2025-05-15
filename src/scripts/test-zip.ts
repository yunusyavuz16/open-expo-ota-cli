import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Test function to create a zip file with simple content
async function testZipCreation() {
  try {
    // Create test content
    const tempDir = path.join(os.tmpdir(), `openexpoota-test-${Date.now()}`);
    await fs.ensureDir(tempDir);

    // Create a simple test file
    const testFilePath = path.join(tempDir, 'test.js');
    fs.writeFileSync(testFilePath, 'console.log("Hello, World!");');

    // Create output zip path
    const zipPath = path.join(tempDir, 'test-update.zip');
    console.log(`Creating test zip at: ${zipPath}`);

    // Set up archiver
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Listen for events
    output.on('close', () => {
      console.log(`Zip file created successfully! Size: ${Math.round(archive.pointer() / 1024)} KB`);
      console.log(`ZIP file exists: ${fs.existsSync(zipPath)}`);
      // Validate the content
      console.log(`Zip file stats:`, fs.statSync(zipPath));
    });

    archive.on('error', (err) => {
      console.error('Error creating zip:', err);
    });

    archive.pipe(output);

    // Add content to the archive
    archive.file(testFilePath, { name: 'bundle.js' });

    // Add a sample metadata file
    const metadata = {
      version: '1.0.0',
      channel: 'development',
      runtimeVersion: '1.0.0',
      platforms: ['ios', 'android']
    };

    archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

    // Finalize
    await archive.finalize();

    console.log('Archive finalization complete');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testZipCreation().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Test error:', err);
});