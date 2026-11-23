/**
 * Scaricamento di un file JSON.
 */

/**
 * Scarica e interpreta un file JSON. Il risultato è unknown: chi lo usa
 * deve verificarne la struttura.
 */
export async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Impossibile caricare "${url}" (stato ${response.status})`);
    }

    return await response.json() as unknown;
}
