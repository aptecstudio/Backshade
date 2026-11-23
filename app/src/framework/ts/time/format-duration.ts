/**
 * Formatting of durations in seconds: "2.5 s" under a minute, "1:30.0"
 * from one minute, "1:00:00.0" from one hour.
 */

/**
 * Returns a readable duration.
 * @param decimals - Decimal digits of the seconds (default 1)
 */
export function formatDuration(seconds: number, decimals = 1): string {
    const factor = 10 ** decimals;
    const total = Math.round(Math.max(0, seconds) * factor) / factor;
    if (total < 60) {
        return `${total.toFixed(decimals)} s`;
    }
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest = (total % 60).toFixed(decimals).padStart(decimals > 0 ? decimals + 3 : 2, '0');
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
        : `${minutes}:${rest}`;
}
