/**
 * Choices of the live view in the toolbar: haze, quality, frames per second,
 * beams and strobe.
 */

import { Emitter, Key, SelectField, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { FRAME_RATES, HAZE_LEVELS, QUALITY_LEVELS, saveLiveSettings, type LiveSettings } from './stage-live-settings.js';

export class StageLiveBar extends Stack {
    private readonly changes = new Emitter<LiveSettings>();

    constructor(private settings: LiveSettings) {
        super({ direction: 'row', gap: 2, align: 'center', wrap: true });
        const haze = new SelectField<LiveSettings['haze']>({
            ariaLabel: t('stage.haze'),
            options: HAZE_LEVELS.map((value) => ({ value, label: t(`stage.hazeLevels.${value}`) })),
            value: settings.haze
        });
        haze.onChange((value) => this.change({ haze: value }));
        const quality = new SelectField<LiveSettings['quality']>({
            ariaLabel: t('stage.quality'),
            options: QUALITY_LEVELS.map((value) => ({ value, label: t(`stage.qualityLevels.${value}`) })),
            value: settings.quality
        });
        quality.onChange((value) => this.change({ quality: value }));
        const rate = new SelectField<LiveSettings['frameRate']>({
            ariaLabel: t('stage.frameRate'),
            options: FRAME_RATES.map((value) => ({ value, label: t('stage.fps', { count: value }) })),
            value: settings.frameRate
        });
        rate.onChange((value) => this.change({ frameRate: value }));
        this.append(haze, quality, rate, this.toggle('beams'), this.toggle('strobe'));
    }

    onChange(listener: (settings: LiveSettings) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    private toggle(name: 'beams' | 'strobe'): Key {
        const key = new Key({ label: t(`stage.${name}`), state: this.settings[name] ? 'active' : 'normal' });
        key.onPress(() => {
            this.change({ [name]: !this.settings[name] });
            key.setState(this.settings[name] ? 'active' : 'normal');
        });
        return key;
    }

    private change(part: Partial<LiveSettings>): void {
        this.settings = { ...this.settings, ...part };
        saveLiveSettings(this.settings);
        this.changes.emit(this.settings);
    }
}
