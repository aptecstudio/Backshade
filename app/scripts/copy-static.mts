/**
 * Copies the static files of the interface, keeping the folder structure:
 * - HTML pages from src/renderer to dist/web/renderer;
 * - images from assets/images to dist/web/assets/images.
 */

import fs from 'node:fs';
import path from 'node:path';

const appDir = path.join(import.meta.dirname, '..');
const webDir = path.join(appDir, 'dist', 'web');

/**
 * Copies the files with the given extensions from one folder to another.
 */
function copyFiles(sourceDir: string, targetDir: string, extensions: ReadonlySet<string>): void {
    for (const entry of fs.readdirSync(sourceDir, { recursive: true, withFileTypes: true })) {
        if (!entry.isFile() || !extensions.has(path.extname(entry.name).toLowerCase())) {
            continue;
        }
        const sourceFile = path.join(entry.parentPath, entry.name);
        const targetFile = path.join(targetDir, path.relative(sourceDir, sourceFile));
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        fs.copyFileSync(sourceFile, targetFile);
    }
}

copyFiles(path.join(appDir, 'src', 'renderer'), path.join(webDir, 'renderer'), new Set(['.html']));
copyFiles(path.join(appDir, 'assets', 'images'), path.join(webDir, 'assets', 'images'), new Set(['.png', '.svg', '.jpg', '.webp']));
