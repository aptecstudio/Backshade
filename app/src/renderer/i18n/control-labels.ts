/**
 * Translated texts for the framework controls that need several labels
 * (time picker, color wheel).
 */

import type { ColorWheelLabels, TimePickerLabels } from '../../framework/ts/index.js';
import { t } from './i18n.js';

/**
 * Texts of the time picker in the active language.
 */
export function timePickerLabels(): TimePickerLabels {
    return {
        ok: t('common.ok'),
        cancel: t('common.cancel'),
        fine: t('time.fine'),
        reset: t('time.reset'),
        seconds: t('time.seconds'),
        wheel: t('time.wheel')
    };
}

/**
 * Texts of the color wheel in the active language.
 */
export function colorWheelLabels(): ColorWheelLabels {
    return {
        wheel: t('color.wheel'),
        brightness: t('color.brightness'),
        red: t('color.red'),
        green: t('color.green'),
        blue: t('color.blue'),
        hex: t('color.hex')
    };
}
