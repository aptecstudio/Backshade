/**
 * Static image, for example a logo.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** Image options */
export interface ImageViewOptions {
    /** Image address */
    src: string;
    /** Alternative text, already translated; empty for decorative images */
    alt: string;
    /** Additional CSS classes */
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
