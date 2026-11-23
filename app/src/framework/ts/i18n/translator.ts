/**
 * Traduttore tipizzato: risolve chiavi con punti (ad esempio 'common.save')
 * su un albero di messaggi e sostituisce i segnaposto {nome}.
 * Se la lingua scelta non ha un testo, usa quello della lingua di riferimento.
 */

/** Albero di messaggi: foglie di testo, raggruppate in oggetti */
export interface MessageTree {
    readonly [key: string]: string | MessageTree;
}

/** Tutte le chiavi con punti che portano a un testo dell'albero T */
export type MessageKey<T> = {
    [K in keyof T & string]: T[K] extends string ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

/** Valori da inserire nei segnaposto */
export type MessageParams = Record<string, string | number>;

/** Funzione di traduzione */
export type Translate<T> = (key: MessageKey<T>, params?: MessageParams) => string;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Cerca il testo di una chiave; restituisce undefined se manca.
 */
function lookup(messages: MessageTree, key: string): string | undefined {
    let node: string | MessageTree | undefined = messages;

    for (const part of key.split('.')) {
        if (typeof node !== 'object' || !Object.hasOwn(node, part)) {
            return undefined;
        }
        node = node[part];
    }

    return typeof node === 'string' ? node : undefined;
}

/**
 * Crea una funzione di traduzione.
 * @param messages - Testi della lingua scelta
 * @param reference - Testi della lingua di riferimento, usati quando manca un testo
 *
 * Se una chiave manca in entrambe, restituisce la chiave stessa e lo segnala
 * in console, così l'errore è visibile senza bloccare l'interfaccia.
 */
export function createTranslator<T extends MessageTree>(messages: MessageTree, reference: T): Translate<T> {
    return (key, params) => {
        const text = lookup(messages, key) ?? lookup(reference, key);

        if (text === undefined) {
            console.warn(`Testo mancante per la chiave "${key}"`);
            return key;
        }
        if (params === undefined) {
            return text;
        }

        return text.replace(PLACEHOLDER, (placeholder, name: string) => {
            const value = params[name];
            return value === undefined ? placeholder : String(value);
        });
    };
}
