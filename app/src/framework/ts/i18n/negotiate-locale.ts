/**
 * Choice of the language to use among the available ones.
 */

/**
 * Returns the first requested language that is available, in order of
 * preference. A regional request (for example "it-IT") also matches the
 * base language ("it"), and vice versa. If none is available, returns fallback.
 * @param available - Codes of the available languages
 * @param requested - Requested codes, from the most to the least preferred; empty values are ignored
 * @param fallback - Language to use if no requested one is available
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
