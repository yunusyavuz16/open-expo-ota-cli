import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import FormData from 'form-data';
import { getToken } from '../utils/api-client';

// Test function to directly upload to the API
async function testApiUpload() {
  try {
    // Get the auth token
    const token = getToken();
    if (!token) {
      console.error('Not logged in. Please run `ota login` first.');
      return;
    }

    // Create a simple test file in memory
    const tempFile = path.join(__dirname, 'test-bundle.js');
    fs.writeFileSync(tempFile, 'console.log("Hello, World!");');

    // Create FormData object
    const formData = new FormData();

    // Add metadata
    formData.append('version', '1.0.0');
    formData.append('channel', 'development');
    formData.append('runtimeVersion', '1.0.0');
    formData.append('platforms', JSON.stringify(['ios', 'android']));

    // Add file with 'bundle' field name
    formData.append('bundle', fs.createReadStream(tempFile), {
      filename: 'test-bundle.js',
      contentType: 'application/javascript'
    });

    console.log('Form data created with fields:');
    console.log('- version: 1.0.0');
    console.log('- channel: development');
    console.log('- runtimeVersion: 1.0.0');
    console.log('- platforms: ["ios", "android"]');
    console.log('- bundle: test-bundle.js');

    // Make the API request
    const appId = 1; // Replace with your app ID
    const apiUrl = 'http://localhost:3000/api'; // Replace with your API URL

    console.log(`Making POST request to ${apiUrl}/apps/${appId}/updates`);

    const response = await axios.post(`${apiUrl}/apps/${appId}/updates`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${token}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000 // 5 minute timeout
    });

    console.log('API response:', response.status, response.statusText);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    // Clean up
    fs.unlinkSync(tempFile);

  } catch (error: any) {
    console.error('Test failed:');
    if (error.response) {
      console.error('Server responded with error:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

// Run the test
testApiUpload().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.error('Test error:', err);
});