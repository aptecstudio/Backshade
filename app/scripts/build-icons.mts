/**
 * Genera lo sprite delle icone e l'elenco dei nomi validi.
 * Legge i file SVG di assets/icons/lucide (uno per icona) e produce:
 * - dist/web/assets/icons.svg: sprite con un <symbol> per icona;
 * - src/framework/ts/icons/icon-names.ts: nomi delle icone come tipo TypeScript.
 */

import fs from 'node:fs';
import path from 'node:path';

const appDir = path.join(import.meta.dirname, '..');
const sourceDir = path.join(appDir, 'assets', 'icons', 'lucide');
const spriteFile = path.join(appDir, 'dist', 'web', 'assets', 'icons.svg');
const namesFile = path.join(appDir, 'src', 'framework', 'ts', 'icons', 'icon-names.ts');

const VIEW_BOX = '0 0 24 24';
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Estrae il contenuto interno di un file SVG Lucide, verificandone il formato.
 */
function readIconBody(file: string): string {
    const source = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const match = /<svg([^>]*)>([\s\S]*)<\/svg>/.exec(source);

    if (match === null) {
        throw new Error(`File SVG non valido: ${file}`);
    }
    if (!match[1].includes(`viewBox="${VIEW_BOX}"`)) {
        throw new Error(`viewBox diverso da "${VIEW_BOX}": ${file}`);
    }

    return match[2]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .join('');
}

const names = fs.readdirSync(sourceDir)
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -'.svg'.length))
    .sort();

for (const name of names) {
    if (!NAME_PATTERN.test(name)) {
        throw new Error(`Nome di icona non valido: ${name}`);
    }
}

const symbols = names.map((name) => {
    const body = readIconBody(path.join(sourceDir, `${name}.svg`));
    return `<symbol id="${name}" viewBox="${VIEW_BOX}">${body}</symbol>`;
});

const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<!-- Lucide icons, ISC license: https://lucide.dev -->',
    ...symbols,
    '</svg>',
    ''
].join('\n');

const namesSource = [
    '/**',
    ' * File generato da scripts/build-icons.mts: non modificare a mano.',
    ' * Elenco delle icone disponibili in assets/icons/lucide.',
    ' */',
    '',
    'export const ICON_NAMES = [',
    names.map((name) => `    '${name}'`).join(',\n'),
    '] as const;',
    '',
    '/** Nome di un\'icona disponibile */',
    'export type IconName = typeof ICON_NAMES[number];',
    ''
].join('\n');

fs.mkdirSync(path.dirname(spriteFile), { recursive: true });
fs.writeFileSync(spriteFile, sprite);
fs.writeFileSync(namesFile, namesSource);
