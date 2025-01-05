#!/usr/bin/env node

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function updateImports(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    let updatedContent = content;

    // Update relative imports to use .js extension
    updatedContent = updatedContent.replace(
      /from\s+['"](\.[^'"]*)['"]/g,
      (match, p1) => {
        if (p1.endsWith('.js')) return match;
        if (p1.endsWith('/')) return match;
        return `from '${p1}.js'`;
      }
    );

    // Update imports to use path aliases
    updatedContent = updatedContent.replace(
      /from\s+['"]\.\.?\/(services|models|utils|middleware|config)\//g,
      (match, p1) => `from '@${p1}/`
    );

    // Update require statements to use import
    updatedContent = updatedContent.replace(
      /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
      'import $1 from "$2"'
    );

    // Update module.exports to export default
    updatedContent = updatedContent.replace(
      /module\.exports\s*=\s*/g,
      'export default '
    );

    // Update CommonJS exports to ES modules
    updatedContent = updatedContent.replace(
      /exports\.(\w+)\s*=\s*/g,
      'export const $1 = '
    );

    if (updatedContent !== content) {
      await writeFile(filePath, updatedContent);
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function main() {
  try {
    const files = await glob('src/**/*.{ts,js}', {
      cwd: join(rootDir, 'backend'),
      absolute: true,
    });

    console.log('Found files:', files.length);
    await Promise.all(files.map(updateImports));
    console.log('Finished updating imports');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
