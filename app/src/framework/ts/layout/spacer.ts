/**
 * Spazio flessibile che occupa tutto lo spazio libero in uno stack,
 * spingendo gli elementi successivi verso il fondo o verso destra.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';

export class Spacer extends Component<HTMLDivElement> {
    constructor() {
        super(create('div', { classes: ['spacer'], attributes: { 'aria-hidden': 'true' } }));
    }
}
