import fs from 'fs-extra';
import path from 'path';
import api from '../utils/api-client';

// Test minimal publishUpdate function
async function testMinimalPublish() {
  try {
    // Create a minimal bundle
    const tempDir = path.join(__dirname, 'temp');
    fs.ensureDirSync(tempDir);

    const bundlePath = path.join(tempDir, 'test-bundle.js');
    fs.writeFileSync(bundlePath, 'console.log("Test bundle");');

    console.log('Created test bundle at:', bundlePath);

    // Call the publishUpdate method directly
    const result = await api.publishUpdate(
      1, // App ID - modify if needed
      {
        version: '1.0.0-test',
        channel: 'development',
        runtimeVersion: '1.0.0',
        platforms: ['ios', 'android']
      },
      bundlePath,
      [] // No assets
    );

    console.log('Publish result:', result);

    // Clean up
    fs.removeSync(tempDir);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMinimalPublish().then(() => {
  console.log('Test completed');
});