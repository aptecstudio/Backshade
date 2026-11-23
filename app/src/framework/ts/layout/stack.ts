/**
 * Contenitore che dispone i figli in riga o in colonna, con una spaziatura
 * della scala.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';
import type { SpacingStep } from '../theme/spacing.js';

/** Opzioni di uno stack */
export interface StackOptions {
    /** Direzione: riga o colonna (predefinita) */
    direction?: 'row' | 'column';
    /** Spaziatura tra i figli, come passo della scala (predefinito 1) */
    gap?: SpacingStep;
    /** Allineamento sull'asse trasversale */
    align?: 'start' | 'center' | 'end' | 'stretch';
    /** Va a capo quando lo spazio non basta */
    wrap?: boolean;
    /** Classi CSS aggiuntive */
    classes?: string[];
    /** Figli iniziali */
    children?: Component[];
}

export class Stack extends Component<HTMLDivElement> {
    constructor(options: StackOptions = {}) {
        const classes = [
            'stack',
            `stack--${options.direction ?? 'column'}`,
            `stack--gap-${options.gap ?? 1}`,
            ...(options.align === undefined ? [] : [`stack--align-${options.align}`]),
            ...(options.wrap === true ? ['stack--wrap'] : []),
            ...(options.classes ?? [])
        ];
        super(create('div', { classes }));
        this.append(...(options.children ?? []));
    }
}
