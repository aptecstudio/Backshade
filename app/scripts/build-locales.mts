/**
 * Verifica e copia i pacchetti di lingua inclusi, da src/locales a
 * dist/web/locales. Controlli su ogni pacchetto:
 * - dati "meta" validi: codice uguale al nome del file, nome, versione del formato;
 * - solo testi nei "messages", con i caratteri ammessi da AGENTS.md
 *   (ASCII stampabile e lettere accentate);
 * - stesse chiavi della lingua di riferimento (en.json).
 * I pacchetti installati dall'utente non passano da qui: i testi mancanti
 * vengono presi dall'inglese durante l'uso.
 */

import fs from 'node:fs';
import path from 'node:path';

const REFERENCE_LOCALE = 'en';
const FORMAT_VERSION = 1;
// Lettere accentate latine, esclusi i segni di moltiplicazione e divisione
const ALLOWED_TEXT = /^[\x20-\x7E\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]*$/;

const appDir = path.join(import.meta.dirname, '..');
const sourceDir = path.join(appDir, 'src', 'locales');
const targetDir = path.join(appDir, 'dist', 'web', 'locales');

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Restituisce l'elenco delle chiavi con punti, verificando tipi e caratteri.
 */
function collectKeys(node: unknown, file: string, prefix = ''): string[] {
    if (!isObject(node)) {
        throw new Error(`${file}: "${prefix}" deve essere un oggetto`);
    }

    const keys: string[] = [];
    for (const [name, value] of Object.entries(node)) {
        const key = prefix === '' ? name : `${prefix}.${name}`;
        if (typeof value === 'string') {
            if (!ALLOWED_TEXT.test(value)) {
                throw new Error(`${file}: caratteri non ammessi in "${key}"`);
            }
            keys.push(key);
        } else {
            keys.push(...collectKeys(value, file, key));
        }
    }
    return keys;
}

/**
 * Verifica i dati "meta" di un pacchetto.
 */
function checkMeta(data: Record<string, unknown>, file: string): void {
    const meta = data.meta;
    const code = file.slice(0, -'.json'.length);
    if (!isObject(meta) || meta.code !== code || typeof meta.name !== 'string' || meta.name === ''
        || meta.formatVersion !== FORMAT_VERSION) {
        throw new Error(`${file}: "meta" deve contenere code "${code}", name e formatVersion ${FORMAT_VERSION}`);
    }
}

const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.json'));
const keysByFile = new Map<string, string[]>();

for (const file of files) {
    const data: unknown = JSON.parse(fs.readFileSync(path.join(sourceDir, file), 'utf8'));
    if (!isObject(data)) {
        throw new Error(`${file}: il pacchetto deve essere un oggetto`);
    }
    checkMeta(data, file);
    keysByFile.set(file, collectKeys(data.messages, file).sort());
}

const referenceKeys = keysByFile.get(`${REFERENCE_LOCALE}.json`);
if (referenceKeys === undefined) {
    throw new Error(`Manca la lingua di riferimento ${REFERENCE_LOCALE}.json`);
}

for (const [file, keys] of keysByFile) {
    const missing = referenceKeys.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !referenceKeys.includes(key));
    if (missing.length > 0 || extra.length > 0) {
        throw new Error(`${file}: chiavi mancanti [${missing.join(', ')}], chiavi in più [${extra.join(', ')}]`);
    }
}

fs.mkdirSync(targetDir, { recursive: true });
for (const file of files) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}
