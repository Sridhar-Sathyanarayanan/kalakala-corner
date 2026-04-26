#!/usr/bin/env node

/**
 * Create Lambda Deployment ZIP
 * 
 * This script creates a correctly structured ZIP file for AWS Lambda deployment.
 * 
 * Structure:
 * - lambda/ (from dist/lambda)
 * - features/ (from dist/features)
 * - adapters/ (from dist/adapters)
 * - clients/ (from dist/clients)
 * - middleware/ (from dist/middleware)
 * - services/ (from dist/services)
 * - node_modules/ (dependencies)
 * 
 * Usage: npm run zip:create
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ZIP_NAME = 'lambda-code.zip';
const DIST_DIR = path.join(__dirname, '../dist');
const NODE_MODULES_DIR = path.join(__dirname, '../node_modules');
const OUTPUT_PATH = path.join(__dirname, '..', ZIP_NAME);

console.log('🚀 Creating Lambda deployment ZIP...\n');

// Use a temporary filename if the file is locked
let finalPath = OUTPUT_PATH;
let tempPath = OUTPUT_PATH.replace('.zip', `.tmp.${Date.now()}.zip`);

// Try to remove old ZIP, fallback to temp name if locked
if (fs.existsSync(OUTPUT_PATH)) {
  try {
    fs.unlinkSync(OUTPUT_PATH);
    console.log('✓ Removed old ZIP file\n');
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.log('⚠️  Old ZIP file is in use, creating new version...\n');
      finalPath = tempPath;
    } else {
      throw err;
    }
  }
}

// Create output stream
const output = fs.createWriteStream(finalPath);
const archive = archiver('zip', { zlib: { level: 6 } });

// Handle errors
output.on('error', (err) => {
  console.error('❌ Error writing ZIP:', err.message);
  process.exit(1);
});

archive.on('error', (err) => {
  console.error('❌ Error creating archive:', err.message);
  process.exit(1);
});

// Pipe archive to output
archive.pipe(output);

// Add files from dist/
console.log('📦 Adding compiled code from dist/...');

const dirsToAdd = [
  'lambda',
  'features',
  'adapters',
  'clients',
  'middleware',
  'services'
];

// Add root JS files
if (fs.existsSync(path.join(DIST_DIR, 'lambda-handler.js'))) {
  archive.file(path.join(DIST_DIR, 'lambda-handler.js'), { name: 'lambda-handler.js' });
}

if (fs.existsSync(path.join(DIST_DIR, 'server.js'))) {
  archive.file(path.join(DIST_DIR, 'server.js'), { name: 'server.js' });
}

// Add directories
dirsToAdd.forEach(dir => {
  const dirPath = path.join(DIST_DIR, dir);
  if (fs.existsSync(dirPath)) {
    archive.directory(dirPath, dir);
    console.log(`  ✓ Added ${dir}/`);
  }
});

// Add node_modules
console.log('\n📦 Adding dependencies from node_modules/...');
if (fs.existsSync(NODE_MODULES_DIR)) {
  archive.directory(NODE_MODULES_DIR, 'node_modules');
  console.log('  ✓ Added node_modules/');
} else {
  console.warn('  ⚠ node_modules not found!');
}

// Finalize
archive.finalize();

// Handle completion
output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`\n✅ ZIP created successfully!`);
  console.log(`📄 File: ${path.basename(finalPath)}`);
  console.log(`📏 Size: ${sizeInMB} MB`);
  console.log(`📍 Location: ${finalPath}\n`);
  
  // Display structure
  console.log('📂 ZIP Structure:');
  console.log('   ├── lambda/');
  console.log('   ├── features/');
  console.log('   ├── adapters/');
  console.log('   ├── clients/');
  console.log('   ├── middleware/');
  console.log('   ├── services/');
  console.log('   ├── lambda-handler.js');
  console.log('   ├── server.js');
  console.log('   └── node_modules/\n');
  
  console.log('🚀 Ready to upload to AWS Lambda!');
  console.log('📋 Handler path format: lambda/handlers/{FILE}.{FUNCTION}\n');
  
  process.exit(0);
});
