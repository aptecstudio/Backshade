/**
 * Texts of the cue list of the simple console.
 */

import { formatDuration } from '../../../framework/ts/index.js';
import { formatCueNumber, type Cue, type SceneSummary } from '../../../shared/console/memories.js';
import { t } from '../../i18n/i18n.js';

/** Cue number as shown, for example "3" or "3.5" */
export function formatCue(number: number): string {
    return formatCueNumber(number);
}

/**
 * Times of a cue for the list, for example "2.0 s / 3.0 s, follow 5.0 s".
 */
export function cueTimes(cue: Cue, scene: SceneSummary | undefined): string {
    const fadeIn = cue.fadeIn ?? scene?.fadeIn ?? 0;
    const fadeOut = cue.fadeOut ?? scene?.fadeOut ?? 0;
    const fades = `${formatDuration(fadeIn)} / ${formatDuration(fadeOut)}`;
    return cue.follow === null ? fades : t('cues.timesFollow', { fades, follow: formatDuration(cue.follow) });
}
