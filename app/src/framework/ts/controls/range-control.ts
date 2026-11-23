/**
 * Base dei controlli a valore continuo (manopole e fader).
 * Il valore va da 0 a 1. Gestisce accessibilità (ruolo slider), tastiera,
 * rotella del mouse e notifica dei cambi fatti dall'utente.
 *
 * Le classi derivate creano la propria struttura e chiamano setValue()
 * alla fine del costruttore per il primo disegno.
 */

import { clamp } from '../core/clamp.js';
import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import type { Unsubscribe } from '../dom/events.js';

/** Opzioni comuni dei controlli a valore continuo */
export interface RangeControlOptions {
    /** Nome per le tecnologie assistive, già tradotto */
    label: string;
    /** Valore iniziale, da 0 a 1 (predefinito 0) */
    value?: number;
    /** Testo del valore per le tecnologie assistive */
    formatValue?: (value: number) => string;
}

// Passi di variazione del valore
const STEP = 0.01;
const PAGE_STEP = 0.1;
const WHEEL_STEP = 0.02;
const FINE_FACTOR = 0.1;

/**
 * Formato predefinito del valore: percentuale intera.
 */
function formatPercent(value: number): string {
    return `${Math.round(value * 100)} %`;
}

export abstract class RangeControl<E extends HTMLElement = HTMLElement> extends Component<E> {
    private current = Number.NaN;
    private readonly changes = new Emitter<number>();
    private readonly formatValue: (value: number) => string;

    protected constructor(element: E, options: RangeControlOptions) {
        super(element);

        this.formatValue = options.formatValue ?? formatPercent;
        element.tabIndex = 0;
        element.setAttribute('role', 'slider');
        element.setAttribute('aria-label', options.label);
        element.setAttribute('aria-valuemin', '0');
        element.setAttribute('aria-valuemax', '100');

        this.listen(element, 'keydown', (event) => this.handleKey(event));
        this.listen(element, 'wheel', (event) => {
            event.preventDefault();
            const factor = event.shiftKey ? FINE_FACTOR : 1;
            this.changeBy(-Math.sign(event.deltaY) * WHEEL_STEP * factor);
        }, { passive: false });
        this.track(() => this.changes.clear());
    }

    /** Valore attuale, da 0 a 1 */
    get value(): number {
        return this.current;
    }

    /**
     * Imposta il valore. Con notify a false (predefinito) non notifica i
     * listener: serve per aggiornare il controllo dallo stato del motore.
     */
    setValue(value: number, notify = false): void {
        const next = clamp(value, 0, 1);
        if (next === this.current) {
            return;
        }
        this.current = next;
        this.render(next);
        this.element.setAttribute('aria-valuenow', String(Math.round(next * 100)));
        this.element.setAttribute('aria-valuetext', this.formatValue(next));
        if (notify) {
            this.changes.emit(next);
        }
    }

    /**
     * Registra un listener per i cambi di valore fatti dall'utente.
     */
    onChange(listener: (value: number) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /**
     * Aggiorna la grafica del controllo per il valore indicato.
     */
    protected abstract render(value: number): void;

    /**
     * Varia il valore come azione dell'utente.
     */
    protected changeBy(delta: number): void {
        this.setValue(this.current + delta, true);
    }

    /**
     * Imposta il valore come azione dell'utente.
     */
    protected setFromUser(value: number): void {
        this.setValue(value, true);
    }

    /**
     * Tastiera: frecce, pagina su e giù, inizio e fine; con Maiusc il passo è fine.
     */
    private handleKey(event: KeyboardEvent): void {
        const step = event.shiftKey ? STEP * FINE_FACTOR : STEP;

        switch (event.key) {
            case 'ArrowUp':
            case 'ArrowRight':
                this.changeBy(step);
                break;
            case 'ArrowDown':
            case 'ArrowLeft':
                this.changeBy(-step);
                break;
            case 'PageUp':
                this.changeBy(PAGE_STEP);
                break;
            case 'PageDown':
                this.changeBy(-PAGE_STEP);
                break;
            case 'Home':
                this.setFromUser(0);
                break;
            case 'End':
                this.setFromUser(1);
                break;
            default:
                return;
        }
        event.preventDefault();
    }
}
