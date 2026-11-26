/**
 * Virtual console of a show: pages of a grid of cells, each with a number
 * of columns and rows chosen by the operator; cells adapt to the window
 * (decided by the human). Widgets take a rectangle of cells and are linked
 * to what they control. Saved in show.json under "grid". Shared between
 * engine and interface.
 */

/** Kind of widget */
export type WidgetType = 'key' | 'fader' | 'knob' | 'colorPicker' | 'xyPad' | 'label' | 'monitor';

/** Widget types in presentation order */
export const WIDGET_TYPES: readonly WidgetType[] = ['key', 'fader', 'knob', 'colorPicker', 'xyPad', 'label', 'monitor'];

/** Actions of the cue list */
export type CueAction = 'go' | 'back' | 'pause' | 'release';
export const CUE_ACTIONS: readonly CueAction[] = ['go', 'back', 'pause', 'release'];

/** Masters */
export type GridMaster = 'a' | 'b' | 'scene' | 'grand';
export const GRID_MASTERS: readonly GridMaster[] = ['a', 'b', 'scene', 'grand'];

/** Commands of the desk */
export type DeskAction = 'blackout' | 'fullOn' | 'blind' | 'home';
export const DESK_ACTIONS: readonly DeskAction[] = ['blackout', 'fullOn', 'blind', 'home'];

/** Actions of the audio player */
export type AudioAction = 'play' | 'pause' | 'stop' | 'next' | 'previous';
export const AUDIO_ACTIONS: readonly AudioAction[] = ['play', 'pause', 'stop', 'next', 'previous'];

/** What a widget controls or shows */
export type WidgetLink =
    | { kind: 'none' }
    | { kind: 'scene'; id: string }
    | { kind: 'chaser'; id: string }
    | { kind: 'cue'; action: CueAction }
    | { kind: 'master'; master: GridMaster }
    | { kind: 'group'; id: string }
    | { kind: 'channel'; universe: number; channel: number }
    | { kind: 'desk'; action: DeskAction }
    | { kind: 'audio'; action: AudioAction };

/** Kind of link */
export type LinkKind = WidgetLink['kind'];

/** Links each widget type accepts */
export const WIDGET_LINKS: Readonly<Record<WidgetType, readonly LinkKind[]>> = {
    key: ['scene', 'chaser', 'cue', 'group', 'channel', 'desk', 'audio', 'none'],
    fader: ['scene', 'chaser', 'master', 'group', 'channel', 'none'],
    knob: ['scene', 'chaser', 'master', 'group', 'channel', 'none'],
    colorPicker: ['group'],
    xyPad: ['group'],
    label: ['none'],
    monitor: ['cue', 'scene', 'chaser', 'master', 'group', 'channel', 'audio']
};

/** Widget placed on a page */
export interface GridWidget {
    id: string;
    type: WidgetType;
    /** First column and row (from 0) and size in cells */
    x: number;
    y: number;
    w: number;
    h: number;
    /** Text shown on the widget; empty for the name of what it controls */
    label: string;
    link: WidgetLink;
}

/** Page of the grid */
export interface GridPage {
    id: string;
    name: string;
    columns: number;
    rows: number;
    widgets: GridWidget[];
}

/** Grid section of show.json */
export interface ShowGrid {
    pages: GridPage[];
}

/** Limits of a page */
export const GRID_LIMITS = { columns: { min: 1, max: 32 }, rows: { min: 1, max: 24 }, pages: 50, widgets: 400 } as const;

/** Grid of a new show */
export const EMPTY_GRID: ShowGrid = { pages: [] };

/** Default size of a new widget, in cells */
export const WIDGET_SIZES: Readonly<Record<WidgetType, { w: number; h: number }>> = {
    key: { w: 1, h: 1 },
    fader: { w: 1, h: 3 },
    knob: { w: 1, h: 1 },
    colorPicker: { w: 1, h: 1 },
    xyPad: { w: 2, h: 2 },
    label: { w: 2, h: 1 },
    monitor: { w: 2, h: 1 }
};

const isInt = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/**
 * Reads a link; an invalid one becomes "none".
 */
export function normalizeLink(value: unknown): WidgetLink {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
    switch (input.kind) {
        case 'scene':
        case 'chaser':
        case 'group':
            return typeof input.id === 'string' && input.id !== '' ? { kind: input.kind, id: input.id } : { kind: 'none' };
        case 'cue':
            return CUE_ACTIONS.includes(input.action as CueAction) ? { kind: 'cue', action: input.action as CueAction } : { kind: 'none' };
        case 'master':
            return GRID_MASTERS.includes(input.master as GridMaster) ? { kind: 'master', master: input.master as GridMaster } : { kind: 'none' };
        case 'channel':
            return isInt(input.universe, 1, 32768) && isInt(input.channel, 1, 512) ? { kind: 'channel', universe: input.universe, channel: input.channel } : { kind: 'none' };
        case 'desk':
            return DESK_ACTIONS.includes(input.action as DeskAction) ? { kind: 'desk', action: input.action as DeskAction } : { kind: 'none' };
        case 'audio':
            return AUDIO_ACTIONS.includes(input.action as AudioAction) ? { kind: 'audio', action: input.action as AudioAction } : { kind: 'none' };
        default:
            return { kind: 'none' };
    }
}

/**
 * Reads the grid of a file or a request: invalid pages and widgets are
 * dropped, widgets are kept inside their page, links not accepted by the
 * widget type become "none".
 */
export function normalizeGrid(value: unknown): ShowGrid {
    const input = (typeof value === 'object' && value !== null ? value : {}) as { pages?: unknown };
    const ids = new Set<string>();
    const pages: GridPage[] = [];
    let widgetCount = 0;
    for (const item of Array.isArray(input.pages) ? input.pages.slice(0, GRID_LIMITS.pages) : []) {
        const page = (typeof item === 'object' && item !== null ? item : {}) as Partial<Record<keyof GridPage, unknown>>;
        if (typeof page.id !== 'string' || page.id === '' || ids.has(page.id) || typeof page.name !== 'string'
            || !isInt(page.columns, GRID_LIMITS.columns.min, GRID_LIMITS.columns.max) || !isInt(page.rows, GRID_LIMITS.rows.min, GRID_LIMITS.rows.max)) {
            continue;
        }
        ids.add(page.id);
        const columns = page.columns;
        const rows = page.rows;
        const widgets: GridWidget[] = [];
        for (const raw of Array.isArray(page.widgets) ? page.widgets : []) {
            const widget = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof GridWidget, unknown>>;
            if (typeof widget.id !== 'string' || widget.id === '' || ids.has(widget.id) || !WIDGET_TYPES.includes(widget.type as WidgetType)
                || !isInt(widget.x, 0, columns - 1) || !isInt(widget.y, 0, rows - 1) || widgetCount >= GRID_LIMITS.widgets) {
                continue;
            }
            const type = widget.type as WidgetType;
            const w = isInt(widget.w, 1, columns) ? Math.min(widget.w, columns - widget.x) : 1;
            const h = isInt(widget.h, 1, rows) ? Math.min(widget.h, rows - widget.y) : 1;
            const link = normalizeLink(widget.link);
            ids.add(widget.id);
            widgetCount++;
            widgets.push({
                id: widget.id,
                type,
                x: widget.x,
                y: widget.y,
                w,
                h,
                label: typeof widget.label === 'string' ? widget.label.slice(0, 60) : '',
                link: WIDGET_LINKS[type].includes(link.kind) ? link : { kind: 'none' }
            });
        }
        pages.push({ id: page.id, name: page.name.slice(0, 60), columns, rows, widgets });
    }
    return { pages };
}
