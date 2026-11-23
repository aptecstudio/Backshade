/**
 * Text preference saved in the browser of the device (localStorage).
 * If storage is not available, the preference is simply not
 * remembered: the interface works anyway.
 */
export class LocalPreference {
    private readonly key: string;

    constructor(key: string) {
        this.key = key;
    }

    /**
     * Returns the saved value, or null if missing or not readable.
     */
    get(): string | null {
        try {
            return window.localStorage.getItem(this.key);
        } catch {
            return null;
        }
    }

    /**
     * Saves the value; storage errors are ignored.
     */
    set(value: string): void {
        try {
            window.localStorage.setItem(this.key, value);
        } catch {
            // Storage not available: the choice lasts only for this session
        }
    }
}
