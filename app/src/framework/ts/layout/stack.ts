/**
 * Container that lays out its children in a row or a column, with a spacing
 * from the scale.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';
import type { SpacingStep } from '../theme/spacing.js';

/** Stack options */
export interface StackOptions {
    /** Direction: row or column (default) */
    direction?: 'row' | 'column';
    /** Spacing between children, as a scale step in pixels (default 8) */
    gap?: SpacingStep;
    /** Alignment on the cross axis */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Wraps when there is not enough space */
    wrap?: boolean;
    /** Additional CSS classes */
    classes?: string[];
    /** Initial children */
    children?: Component[];
}

export class Stack extends Component<HTMLDivElement> {
    constructor(options: StackOptions = {}) {
        const classes = [
            'stack',
            `stack--${options.direction ?? 'column'}`,
            `stack--gap-${options.gap ?? 8}`,
            ...(options.align === undefined ? [] : [`stack--align-${options.align}`]),
            ...(options.wrap === true ? ['stack--wrap'] : []),
            ...(options.classes ?? [])
        ];
        super(create('div', { classes }));
        this.append(...(options.children ?? []));
    }
}
