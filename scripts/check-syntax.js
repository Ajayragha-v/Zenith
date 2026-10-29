/**
 * Syntax and structural verification runner for Zenith Detective
 * Checks all JavaScript source and test files for syntax validity.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const TARGET_DIRS = ['src', 'test'];

async function getJsFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getJsFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log('Running syntax check across codebase...');
  let totalChecked = 0;

  for (const dir of TARGET_DIRS) {
    const files = await getJsFiles(dir);
    for (const file of files) {
      try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
        totalChecked++;
      } catch (err) {
        console.error(`Syntax error in ${file}:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log(`Syntax check passed for ${totalChecked} files.`);
}

main().catch((err) => {
  console.error('Check failed:', err);
  process.exit(1);
});
