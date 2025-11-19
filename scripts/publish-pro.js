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
  console.log('Building pro version...');
  execSync('npm run build:pro', { stdio: 'inherit' });

  console.log('\nPreparing pro package...');

  // Copy package-pro.json to package.json in temp location
  const packageProPath = path.join(__dirname, '..', 'package-pro.json');
  const tempDir = path.join(__dirname, '..', 'dist-pro');

  // Create dist-pro directory with necessary files
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Copy lib-pro to temp directory
  const projectRoot = path.join(__dirname, '..');
  const sourceLib = path.join(projectRoot, 'lib-pro');
  const destLib = path.join(tempDir, 'lib-pro');
  copyDirSync(sourceLib, destLib);

  // Copy package-pro.json as package.json
  const packageProContent = JSON.parse(fs.readFileSync(packageProPath, 'utf8'));
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify(packageProContent, null, 2));

  // Copy license files and readme
  const licenseCommFile = path.join(projectRoot, 'LICENSE-COMMERCIAL');
  const readmeFile = path.join(projectRoot, 'README.md');

  if (fs.existsSync(licenseCommFile)) {
    fs.copyFileSync(licenseCommFile, path.join(tempDir, 'LICENSE-COMMERCIAL'));
  }
  if (fs.existsSync(readmeFile)) {
    fs.copyFileSync(readmeFile, path.join(tempDir, 'README.md'));
  }

  // Copy scripts if they exist
  const scriptsPath = path.join(projectRoot, 'scripts');
  const licenseScripts = ['generate-license.js', 'validate-license.js'];
  const tempScriptsDir = path.join(tempDir, 'scripts');
  if (!fs.existsSync(tempScriptsDir)) {
    fs.mkdirSync(tempScriptsDir, { recursive: true });
  }
  licenseScripts.forEach(script => {
    const src = path.join(scriptsPath, script);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(tempScriptsDir, script));
    }
  });

  console.log('Publishing @mobilepixel/mcp-pro...');
  execSync('npm publish', { stdio: 'inherit', cwd: tempDir });

  // Cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log('✓ @mobilepixel/mcp-pro published successfully!');
  process.exit(0);
} catch (error) {
  console.error('Error publishing pro version:', error.message);
  process.exit(1);
}
