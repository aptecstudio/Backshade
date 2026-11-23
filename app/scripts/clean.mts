/**
 * Empties the dist folder before a new build.
 */

import fs from 'node:fs';
import path from 'node:path';

const distDir = path.join(import.meta.dirname, '..', 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
