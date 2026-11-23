/**
 * Checks and copies the included language packs, from src/locales to
 * dist/web/locales. Checks on every pack:
 * - valid "meta" data: code equal to the file name, name, format version;
 * - only texts in "messages", with the characters allowed by AGENTS.md
 *   (printable ASCII and accented letters);
 * - the same keys as the reference language (en.json).
 * Packs installed by the user do not go through here: missing texts
 * are taken from English at runtime.
 */

import fs from 'node:fs';
import path from 'node:path';

const REFERENCE_LOCALE = 'en';
const FORMAT_VERSION = 1;
// Latin accented letters, excluding the multiplication and division signs
const ALLOWED_TEXT = /^[\x20-\x7E\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]*$/;

const appDir = path.join(import.meta.dirname, '..');
const sourceDir = path.join(appDir, 'src', 'locales');
const targetDir = path.join(appDir, 'dist', 'web', 'locales');

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Returns the list of dotted keys, checking types and characters.
 */
function collectKeys(node: unknown, file: string, prefix = ''): string[] {
    if (!isObject(node)) {
        throw new Error(`${file}: "${prefix}" must be an object`);
    }

    const keys: string[] = [];
    for (const [name, value] of Object.entries(node)) {
        const key = prefix === '' ? name : `${prefix}.${name}`;
        if (typeof value === 'string') {
            if (!ALLOWED_TEXT.test(value)) {
                throw new Error(`${file}: characters not allowed in "${key}"`);
            }
            keys.push(key);
        } else {
            keys.push(...collectKeys(value, file, key));
        }
    }
    return keys;
}

/**
 * Checks the "meta" data of a pack.
 */
function checkMeta(data: Record<string, unknown>, file: string): void {
    const meta = data.meta;
    const code = file.slice(0, -'.json'.length);
    if (!isObject(meta) || meta.code !== code || typeof meta.name !== 'string' || meta.name === ''
        || meta.formatVersion !== FORMAT_VERSION) {
        throw new Error(`${file}: "meta" must contain code "${code}", name and formatVersion ${FORMAT_VERSION}`);
    }
}

const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json'));
const keysByFile = new Map<string, string[]>();

for (const file of files) {
    const data: unknown = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
    if (!isObject(data)) {
        throw new Error(`${file}: the pack must be an object`);
    }
    checkMeta(data, file);
    keysByFile.set(file, collectKeys(data.messages, file).sort());
}

const referenceKeys = keysByFile.get(`${REFERENCE_LOCALE}.json`);
if (referenceKeys === undefined) {
    throw new Error(`Missing reference language ${REFERENCE_LOCALE}.json`);
}

for (const [file, keys] of keysByFile) {
    const missing = referenceKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !referenceKeys.includes(key));
    if (missing.length > 0 || extra.length > 0) {
        throw new Error(`${file}: missing keys [${missing.join(', ')}], extra keys [${extra.join(', ')}]`);
    }
}

fs.mkdirSync(targetDir, { recursive: true });
for (const file of files) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}
