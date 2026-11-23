/**
 * Preferenza testuale salvata nel browser del dispositivo (localStorage).
 * Se l'archiviazione non è disponibile, la preferenza semplicemente non viene
 * ricordata: l'interfaccia funziona comunque.
 */
export class LocalPreference {
    private readonly key: string;

    constructor(key: string) {
        this.key = key;
    }

    /**
     * Restituisce il valore salvato, o null se assente o non leggibile.
     */
    get(): string | null {
        try {
            return window.localStorage.getItem(this.key);
        } catch {
            return null;
        }
    }

    /**
     * Salva il valore; gli errori di archiviazione vengono ignorati.
     */
    set(value: string): void {
        try {
            window.localStorage.setItem(this.key, value);
        } catch {
            // Archiviazione non disponibile: la scelta vale solo per questa sessione
        }
    }
}
