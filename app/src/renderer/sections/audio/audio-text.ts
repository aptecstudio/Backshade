/**
 * Texts of the audio player: times of an item.
 */

import { formatDuration } from '../../../framework/ts/index.js';
import type { AudioItem } from '../../../shared/audio/audio.js';
import { t } from '../../i18n/i18n.js';

/**
 * Start and end of an item, for example "0.0 s - 3:20.0" or "0.0 s - end".
 */
export function itemRange(item: AudioItem): string {
    return `${formatDuration(item.start)} - ${item.end === null ? t('audio.fileEnd') : formatDuration(item.end)}`;
}

/**
 * Fades, volume and repeat of an item, for the playlist.
 */
export function itemDetails(item: AudioItem): string {
    const parts = [
        t('audio.fades', { fadeIn: formatDuration(item.fadeIn), fadeOut: formatDuration(item.fadeOut) }),
        t('units.percent', { value: Math.round(item.volume * 100) })
    ];
    if (item.loop) {
        parts.push(t('audio.loop'));
    }
    return parts.join(', ');
}
