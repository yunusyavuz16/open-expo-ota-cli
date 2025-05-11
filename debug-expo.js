const { execSync } = require('child_process');
const path = require('path');

// Define the project root
const projectRoot = path.resolve(__dirname, '../test-app');
console.log('Project root:', projectRoot);

try {
  // Run the expo export command and capture output
  console.log('Running expo export...');
  const result = execSync('npx expo export --dump-sourcemap --clear', {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  console.log('Command executed successfully');
} catch (error) {
  console.error('Error executing command:', error.message);
  process.exit(1);
}