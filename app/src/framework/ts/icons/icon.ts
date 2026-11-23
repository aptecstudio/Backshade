/**
 * Creation of icons from the sprite generated at build time.
 */

import type { IconName } from './icon-names.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE_URL = '/assets/icons.svg';

/** Icon options */
export interface IconOptions {
    /** Text for assistive technologies; without it the icon is decorative */
    label?: string;
    /** Additional CSS classes */
    classes?: string[];
}

/**
 * Creates a sprite icon. Its color follows the text color (currentColor).
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
