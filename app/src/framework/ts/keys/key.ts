/**
 * Tasto morbido della console: etichetta, icona opzionale, LED di stato
 * attivo e barra rossa per lo stato armato o selezionato.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';
import { icon } from '../icons/icon.js';
import type { IconName } from '../icons/icon-names.js';

/** Stato visivo di un tasto */
export type KeyState = 'normal' | 'inactive' | 'active';

/** Opzioni di un tasto */
export interface KeyOptions {
    /** Etichetta, già tradotta */
    label: string;
    /** Icona prima dell'etichetta */
    icon?: IconName;
    /** Stato iniziale (predefinito 'normal') */
    state?: KeyState;
    /** Stato armato o selezionato */
    armed?: boolean;
    /** Dimensione: normale (predefinita) o grande, ad esempio per il tasto go */
    size?: 'normal' | 'large';
    /** Mostra solo l'icona: l'etichetta resta come nome per le tecnologie assistive */
    iconOnly?: boolean;
}

export class Key extends Component<HTMLButtonElement> {
    private readonly labelElement: HTMLSpanElement;
    private readonly presses = new Emitter<void>();

    constructor(options: KeyOptions) {
        const iconOnly = options.iconOnly === true && options.icon !== undefined;
        super(create('button', {
            classes: [
                'key',
                ...(options.size === 'large' ? ['key--large'] : []),
                ...(iconOnly ? ['key--icon-only'] : [])
            ],
            attributes: { type: 'button' }
        }));

        this.labelElement = create('span', { classes: ['key__label'], text: options.label });
        if (options.icon !== undefined) {
            this.element.append(icon(options.icon));
        }
        if (iconOnly) {
            this.element.setAttribute('aria-label', options.label);
            this.element.title = options.label;
        } else {
            this.element.append(this.labelElement);
        }
        this.element.append(
            create('span', { classes: ['key__led'], attributes: { 'aria-hidden': 'true' } }),
            create('span', { classes: ['key__armed-bar'], attributes: { 'aria-hidden': 'true' } })
        );

        this.listen(this.element, 'click', () => this.presses.emit());
        this.track(() => this.presses.clear());

        this.setState(options.state ?? 'normal');
        this.setArmed(options.armed ?? false);
    }

    /**
     * Cambia l'etichetta del tasto.
     */
    setLabel(text: string): void {
        this.labelElement.textContent = text;
        if (this.element.classList.contains('key--icon-only')) {
            this.element.setAttribute('aria-label', text);
            this.element.title = text;
        }
    }

    /**
     * Cambia lo stato visivo del tasto.
     */
    setState(state: KeyState): void {
        this.element.classList.toggle('key--inactive', state === 'inactive');
        this.element.classList.toggle('key--active', state === 'active');
        this.element.setAttribute('aria-pressed', String(state === 'active'));
    }

    /**
     * Abilita o disabilita il tasto; un tasto disabilitato non si può premere.
     */
    setDisabled(disabled: boolean): void {
        this.element.disabled = disabled;
    }

    /**
     * Mostra o nasconde la barra dello stato armato.
     */
    setArmed(armed: boolean): void {
        this.element.classList.toggle('key--armed', armed);
    }

    /**
     * Registra un listener per la pressione del tasto.
     */
    onPress(listener: () => void): Unsubscribe {
        return this.presses.subscribe(listener);
    }
}
