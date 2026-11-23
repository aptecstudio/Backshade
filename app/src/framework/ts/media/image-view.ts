/**
 * Immagine statica, ad esempio un logo.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Opzioni di un'immagine */
export interface ImageViewOptions {
    /** Indirizzo dell'immagine */
    src: string;
    /** Testo alternativo, già tradotto; vuoto per le immagini decorative */
    alt: string;
    /** Classi CSS aggiuntive */
    classes?: string[];
}

export class ImageView extends Component<HTMLImageElement> {
    constructor(options: ImageViewOptions) {
        super(create('img', {
            classes: ['image-view', ...(options.classes ?? [])],
            attributes: { src: options.src, alt: options.alt, draggable: 'false' }
        }));
    }
}
