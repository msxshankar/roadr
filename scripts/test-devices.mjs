import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Running Multi-Device Testing Suite (iPhone, iPad, Laptop, Desktop)...');

const screenshotsDir = path.resolve('tests/screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const bunBin = process.env.HOME + '/.bun/bin/bun';
const cmd = fs.existsSync(bunBin) ? `${bunBin} x playwright test` : 'npx playwright test';

try {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('✅ Multi-device testing suite executed cleanly with 0 errors.');
} catch (error) {
  console.error('❌ Diagnostic test failures detected:', error.message);
  process.exit(1);
}

