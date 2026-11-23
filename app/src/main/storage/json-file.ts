/**
 * Lettura e scrittura di file JSON. La scrittura è atomica: il contenuto
 * viene scritto in un file temporaneo accanto a quello finale e poi
 * rinominato, così un'interruzione non lascia mai un file a metà.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Legge un file JSON; restituisce undefined se il file non esiste.
 * @throws se il file esiste ma non è JSON valido
 */
export function readJsonFile(file: string): unknown {
    if (!fs.existsSync(file)) {
        return undefined;
    }
    return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
}

/**
 * Scrive un valore come JSON leggibile, in modo atomico.
 */
export function writeJsonFileAtomic(file: string, value: unknown): void {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, file);
}
