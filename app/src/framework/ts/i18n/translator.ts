/**
 * Typed translator: resolves dotted keys (for example 'common.save')
 * on a message tree and replaces the {name} placeholders.
 * If the chosen language has no text, the reference language text is used.
 */

/** Message tree: text leaves, grouped in objects */
export interface MessageTree {
    readonly [key: string]: string | MessageTree;
}

/** All the dotted keys leading to a text of the tree T */
export type MessageKey<T> = {
    [K in keyof T & string]: T[K] extends string ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

/** Values to insert in the placeholders */
export type MessageParams = Record<string, string | number>;

/** Translation function */
export type Translate<T> = (key: MessageKey<T>, params?: MessageParams) => string;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Looks up the text of a key; returns undefined if it is missing.
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
 * Creates a translation function.
 * @param messages - Texts of the chosen language
 * @param reference - Texts of the reference language, used when a text is missing
 *
 * If a key is missing in both, returns the key itself and reports it
 * in the console, so the error is visible without blocking the interface.
 */
export function createTranslator<T extends MessageTree>(messages: MessageTree, reference: T): Translate<T> {
    return (key, params) => {
        const text = lookup(messages, key) ?? lookup(reference, key);

        if (text === undefined) {
            console.warn(`Missing text for key "${key}"`);
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
