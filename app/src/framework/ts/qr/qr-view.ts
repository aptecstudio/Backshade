/**
 * QR code drawn as SVG: dark modules on a light square with the quiet zone
 * of four modules that readers need.
 */

import { Component } from '../core/component.js';
import { create } from '../dom/create.js';
import { qrMatrix } from './qr-matrix.js';

const SVG = 'http://www.w3.org/2000/svg';
const QUIET = 4;

export class QrView extends Component<HTMLDivElement> {
    /**
     * @param text - Content of the code
     * @param label - Name for assistive technologies, already translated
     */
    constructor(text: string, label: string) {
        super(create('div', { classes: ['qr-view'] }));
        const matrix = qrMatrix(text);
        const side = matrix.length + QUIET * 2;
        const svg = document.createElementNS(SVG, 'svg');
        svg.setAttribute('viewBox', `0 0 ${side} ${side}`);
        svg.setAttribute('shape-rendering', 'crispEdges');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', label);
        const path = document.createElementNS(SVG, 'path');
        path.setAttribute('d', matrix.flatMap((row, y) => row.map((dark, x) => dark ? `M${x + QUIET} ${y + QUIET}h1v1h-1z` : '')).join(''));
        svg.append(path);
        this.element.append(svg);
    }
}
