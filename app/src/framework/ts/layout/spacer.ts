/**
 * Flexible space that takes all the free space in a stack,
 * pushing the following elements to the end or to the right.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

export class Spacer extends Component<HTMLDivElement> {
    constructor() {
        super(create('div', { classes: ['spacer'], attributes: { 'aria-hidden': 'true' } }));
    }
}
