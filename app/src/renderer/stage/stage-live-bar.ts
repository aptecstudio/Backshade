/**
 * Choices of the live view in the toolbar: haze, quality, frames per second,
 * beams, strobe and shadows, and the frames really drawn.
 */

import { Emitter, Key, Label, SelectField, Stack, type Unsubscribe } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';
import { FRAME_RATES, HAZE_LEVELS, QUALITY_CHOICES, saveLiveSettings, type LiveSettings, type QualityLevel } from './stage-live-settings.js';

export class StageLiveBar extends Stack {
    private readonly changes = new Emitter<LiveSettings>();
    private readonly drawn = new Label({ text: '', tone: 'secondary', size: 'small' });

    constructor(private settings: LiveSettings) {
        super({ direction: 'row', gap: 8, align: 'center', wrap: true });
        const haze = new SelectField<LiveSettings['haze']>({
            ariaLabel: t('stage.haze'),
            options: HAZE_LEVELS.map((value) => ({ value, label: t(`stage.hazeLevels.${value}`) })),
            value: settings.haze
        });
        haze.onChange((value) => this.change({ haze: value }));
        const quality = new SelectField<LiveSettings['quality']>({
            ariaLabel: t('stage.quality'),
            options: QUALITY_CHOICES.map((value) => ({ value, label: t(`stage.qualityLevels.${value}`) })),
            value: settings.quality
        });
        quality.onChange((value) => this.change({ quality: value }));
        const rate = new SelectField<LiveSettings['frameRate']>({
            ariaLabel: t('stage.frameRate'),
            options: FRAME_RATES.map((value) => ({ value, label: t('stage.fps', { count: value }) })),
            value: settings.frameRate
        });
        rate.onChange((value) => this.change({ frameRate: value }));
        this.append(this.drawn, haze, quality, rate, this.toggle('beams'), this.toggle('strobe'), this.toggle('shadows'));
    }

    onChange(listener: (settings: LiveSettings) => void): Unsubscribe {
        return this.changes.subscribe(listener);
    }

    /** Shows the frames drawn in the last second and, when automatic, the level in use */
    showRate(rate: number, level: QualityLevel): void {
        const frames = t('stage.drawn', { count: rate });
        this.drawn.setText(this.settings.quality === 'auto' ? `${frames}, ${t(`stage.qualityLevels.${level}`)}` : frames);
    }

    private toggle(name: 'beams' | 'strobe' | 'shadows'): Key {
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
