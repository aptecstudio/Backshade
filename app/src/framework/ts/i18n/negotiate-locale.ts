/**
 * Scelta della lingua da usare tra quelle disponibili.
 */

/**
 * Restituisce la prima lingua richiesta che è disponibile, in ordine di
 * preferenza. Una richiesta regionale (ad esempio "it-IT") vale anche per la
 * lingua base ("it"), e viceversa. Se nessuna è disponibile, restituisce fallback.
 * @param available - Codici delle lingue disponibili
 * @param requested - Codici richiesti, dal più al meno preferito; i valori vuoti vengono ignorati
 * @param fallback - Lingua da usare se nessuna richiesta è disponibile
 */
export function negotiateLocale(
    available: readonly string[],
    requested: ReadonlyArray<string | null | undefined>,
    fallback: string
): string {
    const baseOf = (code: string): string => code.toLowerCase().split('-')[0];

    for (const code of requested) {
        if (code === null || code === undefined || code === '') {
            continue;
        }
        const exact = available.find((candidate) => candidate.toLowerCase() === code.toLowerCase());
        if (exact !== undefined) {
            return exact;
        }
        const base = available.find((candidate) => baseOf(candidate) === baseOf(code));
        if (base !== undefined) {
            return base;
        }
    }

    return fallback;
}
