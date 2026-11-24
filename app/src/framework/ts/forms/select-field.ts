/**
 * Choice of one value in a list, with a label: a native select styled
 * like the text fields, which works with mouse, keyboard and touch.
 * For a few values in sight, ChoiceKeys is preferred.
 */

import { Component } from '../core/component.js';
import { Emitter } from '../core/emitter.js';
import { create } from '../dom/create.js';
import type { Unsubscribe } from '../dom/events.js';

/** Offered value */
export interface SelectOption<T extends string> {
    value: T;
    label: string;
}

/** Group of values, shown with a caption */
export interface SelectGroup<T extends string> {
    label: string;
    options: readonly SelectOption<T>[];
}

/** Select field options */
export interface SelectFieldOptions<T extends string> {
    /** Label above the field, already translated; without it, the field is compact */
    label?: string;
    /** Name for assistive technologies, for compact fields without a label */
    ariaLabel?: string;
    /** Values, as a plain list or in groups */
    options: readonly (SelectOption<T> | SelectGroup<T>)[];
    value: T;
}

let nextId = 1;

function isGroup<T extends string>(item: SelectOption<T> | SelectGroup<T>): item is SelectGroup<T> {
    return 'options' in item;
}

export class SelectField<T extends string> extends Component<HTMLDivElement> {
    private readonly select: HTMLSelectElement;
    private readonly changes = new Emitter<T>();

    constructor(options: SelectFieldOptions<T>) {
        super(create('div', { classes: ['text-field', 'select-field'] }));

        const id = `select-field-${nextId++}`;
        this.select = create('select', { classes: ['text-field__input', 'select-field__input'], attributes: { id } });
        if (options.label !== undefined) {
            this.element.append(create('label', { classes: ['text-field__label'], attributes: { for: id }, text: options.label }));
        } else {
            this.select.setAttribute('aria-label', options.ariaLabel ?? '');
        }
        this.element.append(this.select);
        this.setOptions(options.options, options.value);

        this.listen(this.select, 'change', () => this.changes.emit(this.select.value as T));
        this.track(() => this.changes.clear());
    }

    /** Current value */
    get value(): T {
        return this.select.value as T;
    }

    /**
     * Changes the value without notifying the listeners.
     */
    setValue(value: T): void {
        this.select.value = value;
    }

    /**
     * Replaces the offered values and chooses one of them.
     */
    setOptions(options: readonly (SelectOption<T> | SelectGroup<T>)[], value: T): void {
        const option = (item: SelectOption<T>): HTMLOptionElement =>
            create('option', { attributes: { value: item.value }, text: item.label });
        this.select.replaceChildren(...options.map((item) => isGroup(item)
            ? create('optgroup', { attributes: { label: item.label }, children: item.options.map(option) })
            : option(item)));
        this.select.value = value;
    }

    /**
     * Enables or disables the field.
     */
    setDisabled(disabled: boolean): void {
        this.select.disabled = disabled;
    }

    /**
     * Registers a listener for the choices of the user.
     */
    onChange(listener: (value: T) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }
}
