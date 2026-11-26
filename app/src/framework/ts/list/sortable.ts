/**
 * Reordering by drag and drop, with mouse, pen and touch: the item follows
 * the pointer, the other items move aside with an animation to show where it
 * will land, and the list scrolls near its edges. With the mouse the drag
 * starts after a few pixels; with touch after a short press, so the finger
 * can still scroll the page. An item that accepts others (a folder) can be
 * the target of the drop when the pointer is over its middle.
 * Interactive elements inside an item (fields, keys) do not start a drag,
 * unless they are marked with data-sortable-handle.
 */

import { on, type Unsubscribe } from '../dom/events.js';

/** Where an item was dropped */
export interface SortableDrop {
    /** Index of the item dragged, among the items */
    from: number;
    /** Index it lands at, among the items without the dragged one */
    to: number;
    /** Index of the item it was dropped into, null when dropped between items */
    into: number | null;
}

/** Options of a sortable list */
export interface SortableOptions {
    /** Element holding the items; the drag starts on its items */
    container: HTMLElement;
    /** Items, in their order */
    items: () => HTMLElement[];
    /** Part of an item that starts the drag (selector); the whole item when missing */
    handle?: string;
    /** The item at an index can receive the dragged one inside it */
    canDropInto?: (target: number, dragged: number) => boolean;
    onDrop: (drop: SortableDrop) => void;
}

// Movement before a mouse drag starts, and press before a touch drag starts
const MOUSE_THRESHOLD = 4;
const TOUCH_DELAY_MS = 250;
const TOUCH_TOLERANCE = 8;
// Part of an item, at its top and bottom, that places the dragged item before or after it
const EDGE = 0.25;
// Distance from the edge of the scrolling area where it scrolls, and speed
const SCROLL_ZONE = 48;
const SCROLL_STEP = 12;
const SETTLE_MS = 160;

const INTERACTIVE = 'input, textarea, select, button, a, [role="slider"], [contenteditable="true"]';

function scrollParent(element: HTMLElement): HTMLElement | null {
    let current = element.parentElement;
    while (current !== null) {
        const style = getComputedStyle(current);
        if (/(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight) {
            return current;
        }
        current = current.parentElement;
    }
    return null;
}

/**
 * Makes the items of a container sortable.
 * @returns the function that stops it
 */
export function makeSortable(options: SortableOptions): Unsubscribe {
    const stop = on(options.container, 'pointerdown', (event) => {
        if (event.button !== 0) {
            return;
        }
        const target = event.target as HTMLElement;
        const items = options.items();
        const item = items.find((element) => element.contains(target));
        if (item === undefined) {
            return;
        }
        if (options.handle !== undefined && target.closest(options.handle) === null) {
            return;
        }
        const interactive = target.closest(INTERACTIVE);
        if (interactive !== null && item.contains(interactive) && interactive.closest('[data-sortable-handle]') === null) {
            return;
        }
        prepare(event, item, items);
    });

    function prepare(start: PointerEvent, item: HTMLElement, items: HTMLElement[]): void {
        const touch = start.pointerType === 'touch';
        let started = false;
        let timer: number | null = null;
        const cancel = (): void => {
            if (timer !== null) {
                window.clearTimeout(timer);
            }
            stopMove();
            stopUp();
        };
        const begin = (): void => {
            cancel();
            started = true;
            drag(start, item, items);
        };
        if (touch) {
            timer = window.setTimeout(begin, TOUCH_DELAY_MS);
        }
        const stopMove = on(document, 'pointermove', (event) => {
            if (event.pointerId !== start.pointerId) {
                return;
            }
            const distance = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY);
            if (touch && distance > TOUCH_TOLERANCE) {
                // The finger moved before the press: it is a scroll
                cancel();
            } else if (!touch && distance > MOUSE_THRESHOLD && !started) {
                begin();
            }
        });
        const stopUp = on(document, 'pointerup', () => cancel());
    }

    function drag(start: PointerEvent, item: HTMLElement, items: HTMLElement[]): void {
        const from = items.indexOf(item);
        const rects = items.map((element) => element.getBoundingClientRect());
        const height = rects[from].height;
        // Space between two items, so the others move by the room the dragged one takes
        const gap = items.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0;
        const shift = height + gap;
        const scroller = scrollParent(options.container);
        const scrollStart = scroller?.scrollTop ?? 0;
        let pointerY = start.clientY;
        let to = from;
        let into: number | null = null;
        let frame = 0;

        items.forEach((element) => element.classList.add('sortable-item'));
        document.body.classList.add('sortable-active');
        item.classList.add('sortable-item--dragging');
        try {
            item.setPointerCapture(start.pointerId);
        } catch {
            // Synthetic events have no pointer to capture
        }

        const layout = (): void => {
            const scrolled = (scroller?.scrollTop ?? 0) - scrollStart;
            const y = pointerY + scrolled;
            item.style.setProperty('--sortable-y', `${pointerY - start.clientY + scrolled}px`);
            // Target: the first item whose middle is below the pointer
            into = null;
            let next = items.length - 1;
            for (let index = 0; index < items.length; index++) {
                if (index === from) {
                    continue;
                }
                const rect = rects[index];
                const top = rect.top;
                const bottom = rect.bottom;
                if (y >= top && y <= bottom && options.canDropInto?.(index, from) === true) {
                    const part = (y - top) / Math.max(1, bottom - top);
                    if (part > EDGE && part < 1 - EDGE) {
                        into = index;
                        break;
                    }
                }
                if (y < (top + bottom) / 2) {
                    next = index > from ? index - 1 : index;
                    break;
                }
            }
            to = into !== null ? from : Math.max(0, Math.min(items.length - 1, next));
            items.forEach((element, index) => {
                if (index === from) {
                    return;
                }
                let offset = 0;
                if (into === null) {
                    if (from < to && index > from && index <= to) {
                        offset = -shift;
                    } else if (from > to && index >= to && index < from) {
                        offset = shift;
                    }
                }
                element.style.setProperty('--sortable-y', `${offset}px`);
                element.classList.toggle('sortable-item--target', index === into);
            });
        };

        // Scrolls the list when the pointer is near its edges
        const autoScroll = (): void => {
            if (scroller !== null) {
                const rect = scroller.getBoundingClientRect();
                if (pointerY < rect.top + SCROLL_ZONE) {
                    scroller.scrollTop -= SCROLL_STEP;
                    layout();
                } else if (pointerY > rect.bottom - SCROLL_ZONE) {
                    scroller.scrollTop += SCROLL_STEP;
                    layout();
                }
            }
            frame = requestAnimationFrame(autoScroll);
        };
        frame = requestAnimationFrame(autoScroll);

        const stopMove = on(document, 'pointermove', (event) => {
            if (event.pointerId === start.pointerId) {
                event.preventDefault();
                pointerY = event.clientY;
                layout();
            }
        });
        // The click that ends a drag must not press the element under it
        const swallowClick = (event: MouseEvent): void => {
            event.stopPropagation();
            event.preventDefault();
        };
        const finish = (event: PointerEvent): void => {
            if (event.pointerId !== start.pointerId) {
                return;
            }
            stopMove();
            stopUp();
            stopCancel();
            cancelAnimationFrame(frame);
            document.body.classList.remove('sortable-active');
            window.addEventListener('click', swallowClick, { capture: true, once: true });
            window.setTimeout(() => window.removeEventListener('click', swallowClick, { capture: true }), 0);
            // The dragged item settles in its place, then the list is rebuilt
            const target = into === null ? to : from;
            let landing = 0;
            for (let index = Math.min(from, target); index <= Math.max(from, target); index++) {
                if (index !== from) {
                    landing += (rects[index].height + gap) * (target > from ? 1 : -1);
                }
            }
            item.classList.remove('sortable-item--dragging');
            item.classList.add('sortable-item--settling');
            item.style.setProperty('--sortable-y', `${into === null ? landing : 0}px`);
            const drop: SortableDrop = { from, to, into };
            window.setTimeout(() => {
                items.forEach((element) => {
                    element.classList.remove('sortable-item', 'sortable-item--settling', 'sortable-item--target');
                    element.style.removeProperty('--sortable-y');
                });
                if (drop.into !== null || drop.to !== drop.from) {
                    options.onDrop(drop);
                }
            }, SETTLE_MS);
        };
        const stopUp = on(document, 'pointerup', finish);
        const stopCancel = on(document, 'pointercancel', finish);
        layout();
    }

    return stop;
}
