#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the new version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Error: No version provided');
  process.exit(1);
}

console.log(`Syncing version to ${newVersion}`);

// Update root package.json
const rootPackagePath = path.join(__dirname, '..', 'package.json');
const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
rootPackage.version = newVersion;
fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n');
console.log(`Updated root package.json to version ${newVersion}`);

// Update VS Code extension package.json
const extensionPackagePath = path.join(__dirname, '..', 'vscode-extension', 'package.json');
const extensionPackage = JSON.parse(fs.readFileSync(extensionPackagePath, 'utf8'));
extensionPackage.version = newVersion;
fs.writeFileSync(extensionPackagePath, JSON.stringify(extensionPackage, null, 2) + '\n');
console.log(`Updated VS Code extension package.json to version ${newVersion}`);

console.log('Version sync complete!');
