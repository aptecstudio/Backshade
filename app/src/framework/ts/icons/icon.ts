/**
 * Creazione delle icone a partire dallo sprite generato in fase di build.
 */

import type { IconName } from './icon-names.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE_URL = '/assets/icons.svg';

/** Opzioni di un'icona */
export interface IconOptions {
    /** Testo per le tecnologie assistive; senza, l'icona è decorativa */
    label?: string;
    /** Classi CSS aggiuntive */
    classes?: string[];
}

/**
 * Crea un'icona dello sprite. Il colore segue quello del testo (currentColor).
 */
export function icon(name: IconName, options: IconOptions = {}): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    const use = document.createElementNS(SVG_NS, 'use');

    svg.classList.add('icon', ...(options.classes ?? []));
    if (options.label === undefined) {
        svg.setAttribute('aria-hidden', 'true');
    } else {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', options.label);
    }

    use.setAttribute('href', `${SPRITE_URL}#${name}`);
    svg.append(use);

    return svg;
}
