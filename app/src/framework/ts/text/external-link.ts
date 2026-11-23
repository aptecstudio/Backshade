/**
 * Link to an external website, opened in the system browser.
 * Its content is made of components (text, images).
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

/** External link options */
export interface ExternalLinkOptions {
    /** Website address, http or https */
    href: string;
    /** Description for assistive technologies, already translated */
    label?: string;
    /** Additional CSS classes */
    classes?: string[];
    /** Link content */
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
