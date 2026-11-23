/**
 * Piccolo display di canale: nome, valore e barra di livello nel colore
 * del canale.
 */

import { Component } from '../core/component.js';
import { clamp } from '../core/clamp.js';
import { create } from '../dom/create.js';
import { channelColorClass, type ChannelColor } from '../theme/channel-colors.js';

/** Opzioni di un display di canale */
export interface ChannelDisplayOptions {
    /** Nome del canale */
    name: string;
    /** Valore già formattato, ad esempio "85 %" */
    value: string;
    /** Livello della barra, da 0 a 1 */
    level: number;
    /** Colore del canale */
    color: ChannelColor;
}

export class ChannelDisplay extends Component<HTMLDivElement> {
    private readonly nameElement: HTMLSpanElement;
    private readonly valueElement: HTMLSpanElement;
    private readonly levelFill: HTMLDivElement;
    private color: ChannelColor;

    constructor(options: ChannelDisplayOptions) {
        super(create('div', { classes: ['display', 'display--channel', channelColorClass(options.color)] }));

        this.color = options.color;
        this.nameElement = create('span', { classes: ['display__name'], text: options.name });
        this.valueElement = create('span', { classes: ['display__value'], text: options.value });
        this.levelFill = create('div', { classes: ['display__level-fill'] });
        this.element.append(
            this.nameElement,
            this.valueElement,
            create('div', { classes: ['display__level'], children: [this.levelFill] })
        );

        this.setLevel(options.level);
    }

    /**
     * Cambia il nome del canale.
     */
    setName(name: string): void {
        this.nameElement.textContent = name;
    }

    /**
     * Cambia il valore mostrato.
     */
    setValue(value: string): void {
        this.valueElement.textContent = value;
    }

    /**
     * Cambia il livello della barra, da 0 a 1.
     */
    setLevel(level: number): void {
        this.levelFill.style.setProperty('--level', String(clamp(level, 0, 1)));
    }

    /**
     * Cambia il colore del canale.
     */
    setColor(color: ChannelColor): void {
        this.element.classList.replace(channelColorClass(this.color), channelColorClass(color));
        this.color = color;
    }
}
