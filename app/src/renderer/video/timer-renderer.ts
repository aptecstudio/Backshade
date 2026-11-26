/**
 * Draws a timer screen on a canvas: the label on top, large digits fitted
 * to the width, the date of a clock below, in the color of the phase
 * (normal, warning, end); after zero the digits can flash. The background
 * is a color or transparent.
 */

import { timerDisplay, type ShowTimer, type TimerState } from '../../shared/video/show-timer.js';

/**
 * Draws the timer at a wall clock time.
 * @param locale - Language of the date
 */
export function drawTimer(canvas: HTMLCanvasElement, timer: ShowTimer, state: TimerState, now: number, locale: string): void {
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    if (context === null || width === 0 || height === 0) {
        return;
    }
    context.clearRect(0, 0, width, height);
    if (timer.background !== '') {
        context.fillStyle = timer.background;
        context.fillRect(0, 0, width, height);
    }
    const display = timerDisplay(timer, state, now, locale);
    const color = display.phase === 'end' ? timer.endColor : display.phase === 'warning' ? timer.warningColor : timer.color;
    const font = (size: number, weight: number): string => `${weight} ${size}px "${timer.font.replace(/"/g, '')}", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Digits as large as the width allows, at most half of the height
    let size = height * 0.5;
    context.font = font(size, 700);
    const measured = context.measureText(display.text).width;
    if (measured > width * 0.9) {
        size *= (width * 0.9) / measured;
    }
    const hasLabel = display.label !== '';
    const hasDetail = display.detail !== '';
    const center = height / 2 + (hasLabel ? size * 0.15 : 0) - (hasDetail ? size * 0.15 : 0);
    const flashing = display.phase === 'end' && timer.flashAtZero && timer.mode !== 'clock' && timer.mode !== 'stopwatch';
    const visible = !flashing || Math.floor(now / 500) % 2 === 0;
    context.fillStyle = color;
    if (visible) {
        context.font = font(size, 700);
        context.fillText(display.text, width / 2, center);
    }
    const small = Math.max(8, size * 0.28);
    context.font = font(small, 400);
    if (hasLabel) {
        context.fillText(display.label, width / 2, center - size * 0.5 - small * 0.9, width * 0.9);
    }
    if (hasDetail) {
        context.fillText(display.detail, width / 2, center + size * 0.5 + small * 0.9, width * 0.9);
    }
}
