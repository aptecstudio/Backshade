/**
 * Timer screens for the video outputs, useful in live shows (requested by
 * the human): current time, countdown for a duration, countdown to a time
 * of the day, stopwatch. They are presets of the show, saved in show.json
 * under "video.timers", used by layers like the text gobos. Countdowns and
 * stopwatches are started, paused, reset and changed live; their state
 * belongs to the running session. Shared between engine and interface.
 */

/** Kind of timer */
export type TimerMode = 'clock' | 'countdown' | 'countdownTo' | 'stopwatch';
export const TIMER_MODES: readonly TimerMode[] = ['clock', 'countdown', 'countdownTo', 'stopwatch'];

/** What a countdown does at zero: count on with a minus sign, or stop at zero */
export type TimerAtZero = 'negative' | 'stop';

/** Most timers in a show */
export const MAX_TIMERS = 50;

/** Timer preset */
export interface ShowTimer {
    id: string;
    name: string;
    mode: TimerMode;
    /** Text above the digits, empty for none */
    label: string;
    /** Clock: seconds and date shown */
    showSeconds: boolean;
    showDate: boolean;
    /** Countdown: duration in seconds; countdown to a time: "HH:MM" */
    duration: number;
    targetTime: string;
    atZero: TimerAtZero;
    /** The digits flash once a countdown reaches zero */
    flashAtZero: boolean;
    /** Seconds left when the digits take the warning color */
    warningSeconds: number;
    color: string;
    warningColor: string;
    endColor: string;
    /** Background color, empty for transparent (over the layers below) */
    background: string;
    font: string;
}

/** Live state of a timer, at the moment it was sent */
export interface TimerState {
    running: boolean;
    /** Time counted, in milliseconds, at sentAt */
    elapsed: number;
    /** Time added to a countdown by the operator, in milliseconds */
    adjust: number;
    /** Wall clock time of the state, in milliseconds since 1970 */
    sentAt: number;
}

/** Commands of a timer */
export type TimerAction = 'toggle' | 'start' | 'pause' | 'reset' | 'plus' | 'minus';
export const TIMER_ACTIONS: readonly TimerAction[] = ['toggle', 'start', 'pause', 'reset', 'plus', 'minus'];

/** Phase of the display, which picks its color */
export type TimerPhase = 'normal' | 'warning' | 'end';

/** Text and phase shown by a timer */
export interface TimerDisplay {
    label: string;
    text: string;
    /** Second line of a clock with the date */
    detail: string;
    phase: TimerPhase;
}

/** State of a timer never started */
export const IDLE_TIMER: TimerState = { running: false, elapsed: 0, adjust: 0, sentAt: 0 };

/**
 * Timer with the default values.
 */
export function defaultTimer(id: string, name: string, mode: TimerMode): ShowTimer {
    return {
        id,
        name,
        mode,
        label: '',
        showSeconds: true,
        showDate: false,
        duration: 15 * 60,
        targetTime: '21:00',
        atZero: 'negative',
        flashAtZero: true,
        warningSeconds: 60,
        color: '#ffffff',
        warningColor: '#e8b420',
        endColor: '#d8383a',
        background: '#000000',
        font: 'sans-serif'
    };
}

const HEX = /^#[0-9a-f]{6}$/;

/**
 * Reads a timer; invalid values take the defaults. Null without an identifier.
 */
export function normalizeTimer(value: unknown): ShowTimer | null {
    const input = (typeof value === 'object' && value !== null ? value : {}) as Partial<Record<keyof ShowTimer, unknown>>;
    if (typeof input.id !== 'string' || input.id === '') {
        return null;
    }
    const mode = TIMER_MODES.includes(input.mode as TimerMode) ? input.mode as TimerMode : 'countdown';
    const base = defaultTimer(input.id, typeof input.name === 'string' ? input.name.slice(0, 60) : 'Timer', mode);
    const color = (field: 'color' | 'warningColor' | 'endColor'): string =>
        typeof input[field] === 'string' && HEX.test((input[field] as string).toLowerCase()) ? (input[field] as string).toLowerCase() : base[field];
    const seconds = (field: 'duration' | 'warningSeconds'): number =>
        typeof input[field] === 'number' && Number.isFinite(input[field]) ? Math.min(24 * 3600, Math.max(0, input[field] as number)) : base[field];
    return {
        ...base,
        label: typeof input.label === 'string' ? input.label.slice(0, 100) : '',
        showSeconds: input.showSeconds !== false,
        showDate: input.showDate === true,
        duration: seconds('duration'),
        targetTime: typeof input.targetTime === 'string' && /^\d{1,2}:\d{2}$/.test(input.targetTime) ? input.targetTime : base.targetTime,
        atZero: input.atZero === 'stop' ? 'stop' : 'negative',
        flashAtZero: input.flashAtZero !== false,
        warningSeconds: seconds('warningSeconds'),
        color: color('color'),
        warningColor: color('warningColor'),
        endColor: color('endColor'),
        background: typeof input.background === 'string' && (input.background === '' || HEX.test(input.background.toLowerCase())) ? input.background.toLowerCase() : base.background,
        font: typeof input.font === 'string' && input.font.length <= 100 ? input.font : base.font
    };
}

/**
 * Time counted by a timer at a wall clock time, in milliseconds.
 */
export function timerElapsed(state: TimerState, now: number): number {
    return state.elapsed + (state.running ? Math.max(0, now - state.sentAt) : 0);
}

const pad = (value: number): string => String(Math.floor(value)).padStart(2, '0');

/**
 * Time as "H:MM:SS" or "MM:SS" (with a minus sign when negative).
 */
function formatSpan(milliseconds: number, roundUp: boolean): string {
    const negative = milliseconds < 0;
    const total = Math.max(0, Math.floor((roundUp && !negative ? Math.ceil(Math.abs(milliseconds) / 1000) * 1000 : Math.abs(milliseconds)) / 1000));
    const hours = Math.floor(total / 3600);
    const rest = `${pad((total % 3600) / 60)}:${pad(total % 60)}`;
    return `${negative ? '-' : ''}${hours > 0 ? `${hours}:` : ''}${rest}`;
}

/**
 * What a timer shows at a wall clock time.
 * @param locale - Language of the date, for clocks with the date
 */
export function timerDisplay(timer: ShowTimer, state: TimerState, now: number, locale = 'en'): TimerDisplay {
    const label = timer.label;
    if (timer.mode === 'clock') {
        const date = new Date(now);
        const time = `${pad(date.getHours())}:${pad(date.getMinutes())}${timer.showSeconds ? `:${pad(date.getSeconds())}` : ''}`;
        const detail = timer.showDate ? date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : '';
        return { label, text: time, detail, phase: 'normal' };
    }
    if (timer.mode === 'stopwatch') {
        return { label, text: formatSpan(timerElapsed(state, now), false), detail: '', phase: 'normal' };
    }
    let remaining: number;
    if (timer.mode === 'countdown') {
        remaining = timer.duration * 1000 + state.adjust - timerElapsed(state, now);
    } else {
        // Countdown to a time of the day: today, or tomorrow when the time has passed by more than a day half
        const [hours, minutes] = timer.targetTime.split(':').map(Number);
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);
        remaining = target.getTime() - now + state.adjust;
        if (remaining < -12 * 3600 * 1000) {
            remaining += 24 * 3600 * 1000;
        }
    }
    if (remaining <= 0 && timer.atZero === 'stop') {
        remaining = 0;
    }
    const phase: TimerPhase = remaining <= 0 ? 'end' : remaining <= timer.warningSeconds * 1000 ? 'warning' : 'normal';
    return { label, text: formatSpan(remaining, true), detail: '', phase };
}
