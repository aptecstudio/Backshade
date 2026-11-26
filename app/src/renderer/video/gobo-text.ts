/**
 * Text of a gobo with its placeholders replaced by the live data:
 * {cue}, {song}, {clock}, {timecode} and {countdown}.
 */

import type { GoboContext, TextGobo } from '../../shared/video/text-gobo.js';

const pad = (value: number): string => String(Math.floor(value)).padStart(2, '0');

/**
 * Remaining time of the countdown, in seconds.
 * @param shownAt - Time the gobo appeared, in milliseconds (performance clock)
 */
function countdown(gobo: TextGobo, shownAt: number): number {
    if (gobo.countdownMode === 'duration') {
        return Math.max(0, gobo.countdownSeconds - (performance.now() - shownAt) / 1000);
    }
    const [hours, minutes] = gobo.countdownTime.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    return Math.max(0, (target.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number): string {
    const whole = Math.ceil(seconds);
    const hours = Math.floor(whole / 3600);
    const rest = `${pad((whole % 3600) / 60)}:${pad(whole % 60)}`;
    return hours > 0 ? `${hours}:${rest}` : rest;
}

/**
 * Text to draw.
 */
export function goboText(gobo: TextGobo, context: GoboContext, shownAt: number): string {
    const now = new Date();
    return gobo.text
        .replaceAll('{cue}', context.cue)
        .replaceAll('{song}', context.song)
        .replaceAll('{clock}', `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`)
        // Until the shared clock of the timeline, the timecode shows its empty value
        .replaceAll('{timecode}', '--:--:--:--')
        .replaceAll('{countdown}', formatCountdown(countdown(gobo, shownAt)));
}
