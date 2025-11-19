#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Helper function to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

try {
  console.log('Building open-source version...');
  execSync('npm run build:open', { stdio: 'inherit' });

  console.log('\nPreparing open-source package...');

  // Copy package-open.json to package.json in temp location
  const packageOpenPath = path.join(__dirname, '..', 'package-open.json');
  const tempDir = path.join(__dirname, '..', 'dist-open');

  // Create dist-open directory with necessary files
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Copy lib-open to temp directory
  const projectRoot = path.join(__dirname, '..');
  const sourceLib = path.join(projectRoot, 'lib-open');
  const destLib = path.join(tempDir, 'lib-open');
  copyDirSync(sourceLib, destLib);

  // Copy package-open.json as package.json
  const packageOpenContent = JSON.parse(fs.readFileSync(packageOpenPath, 'utf8'));
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageOpenContent, null, 2));

  // Copy license and readme
  const licenseFile = path.join(projectRoot, 'LICENSE');
  const readmeFile = path.join(projectRoot, 'README.md');

  if (fs.existsSync(licenseFile)) {
    fs.copyFileSync(licenseFile, path.join(tempDir, 'LICENSE'));
  }
  if (fs.existsSync(readmeFile)) {
    fs.copyFileSync(readmeFile, path.join(tempDir, 'README.md'));
  }

  console.log('Publishing @mobilepixel/mcp...');
  execSync('npm publish', { stdio: 'inherit', cwd: tempDir });

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('✓ @mobilepixel/mcp published successfully!');
  process.exit(0);
} catch (error) {
  console.error('Error publishing open-source version:', error.message);
  process.exit(1);
}
