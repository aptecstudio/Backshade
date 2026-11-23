/**
 * Download of a JSON file.
 */

/**
 * Downloads and parses a JSON file. The result is unknown: the caller
 * must check its structure.
 */
export async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Unable to load "${url}" (status ${response.status})`);
    }

    return await response.json() as unknown;
}
