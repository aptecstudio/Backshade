/**
 * Catalog section with the displays: digits, channel and value.
 */

import { ChannelDisplay, Panel, ReadoutDisplay, Stack, ValueDisplay } from '../../framework/ts/index.js';
import { t } from '../i18n/i18n.js';

export class DisplaysSection extends Panel {
    constructor() {
        super({ title: t('catalog.displays') });

        const readouts = new Stack({
            direction: 'row',
            gap: 16,
            children: [
                new ReadoutDisplay({ text: '00:12:48:20', label: t('console.timecode') }),
                new ReadoutDisplay({ text: '128.0', label: t('console.tempo') })
            ]
        });

        const channels = new Stack({
            direction: 'row',
            gap: 8,
            classes: ['catalog-displays'],
            children: [
                new ChannelDisplay({ name: t('catalog.sample.washLeft'), value: t('units.percent', { value: 85 }), level: 0.85, color: 'blue' }),
                new ChannelDisplay({ name: t('catalog.sample.spot'), value: t('units.percent', { value: 60 }), level: 0.6, color: 'orange' }),
                new ChannelDisplay({ name: t('catalog.sample.chase'), value: t('units.bpm', { value: 128 }), level: 0.5, color: 'teal' }),
                new ChannelDisplay({ name: t('catalog.sample.bass'), value: t('units.decibel', { value: '-6.0' }), level: 0.7, color: 'green' })
            ]
        });

        const values = new Stack({
            direction: 'row',
            gap: 8,
            classes: ['catalog-displays'],
            children: [
                new ValueDisplay({ caption: t('attributes.intensity'), value: t('units.percent', { value: 85 }) }),
                new ValueDisplay({ caption: t('attributes.pan'), value: t('units.degrees', { value: 212 }) }),
                new ValueDisplay({ caption: t('attributes.tilt'), value: t('units.degrees', { value: 48 }) })
            ]
        });

        this.append(readouts, channels, values);
    }
}
