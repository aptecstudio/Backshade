/**
 * Collegamento a un sito esterno, aperto nel browser di sistema.
 * Il contenuto è fatto di componenti (testo, immagini).
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un collegamento esterno */
export interface ExternalLinkOptions {
    /** Indirizzo del sito, http o https */
    href: string;
    /** Descrizione per le tecnologie assistive, già tradotta */
    label?: string;
    /** Classi CSS aggiuntive */
    classes?: string[];
    /** Contenuto del collegamento */
    children?: Component[];
}

export class ExternalLink extends Component<HTMLAnchorElement> {
    constructor(options: ExternalLinkOptions) {
        const attributes: Record<string, string> = {
            href: options.href,
            target: '_blank',
            rel: 'noopener noreferrer'
        };
        if (options.label !== undefined) {
            attributes['aria-label'] = options.label;
        }
        super(create('a', { classes: ['external-link', ...(options.classes ?? [])], attributes }));
        this.append(...(options.children ?? []));
    }
}
