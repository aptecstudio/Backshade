/**
 * Svuota la cartella dist prima di una nuova build.
 */

import fs from 'node:fs';
import path from 'node:path';

const distDir = path.join(import.meta.dirname, '..', 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
