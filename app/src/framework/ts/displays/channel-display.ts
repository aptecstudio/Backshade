/**
 * Small channel display: name, value and level bar in the channel
 * color.
 */

import { Component } from '../core/component.js';
import { clamp } from '../core/clamp.js';
import { create } from '../dom/create.js';
import { channelColorClass, type ChannelColor } from '../theme/channel-colors.js';

/** Channel display options */
export interface ChannelDisplayOptions {
    /** Channel name */
    name: string;
    /** Already formatted value, for example "85 %" */
    value: string;
    /** Bar level, from 0 to 1 */
    level: number;
    /** Channel color */
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
     * Changes the channel name.
     */
    setName(name: string): void {
        this.nameElement.textContent = name;
    }

    /**
     * Changes the displayed value.
     */
    setValue(value: string): void {
        this.valueElement.textContent = value;
    }

    /**
     * Changes the bar level, from 0 to 1.
     */
    setLevel(level: number): void {
        this.levelFill.style.setProperty('--level', String(clamp(level, 0, 1)));
    }

    /**
     * Changes the channel color.
     */
    setColor(color: ChannelColor): void {
        this.element.classList.replace(channelColorClass(this.color), channelColorClass(color));
        this.color = color;
    }
}
