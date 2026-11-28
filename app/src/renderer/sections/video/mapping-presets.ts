/**
 * Presets of an output in the mapping editor: the current mapping saved with
 * a name and a morph time, recalled, overwritten or deleted. Changes are
 * saved in the show at once.
 */

import { Key, Label, ListItem, NumberField, Stack, TextField } from '../../../framework/ts/index.js';
import { MAX_PRESETS, MORPH_LIMITS, mappingOf, type MappingPreset, type OutputMapping } from '../../../shared/video/mapping-preset.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';

export class MappingPresets {
    readonly element = new Stack({ gap: 8 });
    private content = new Stack({ gap: 8 });
    private presets: MappingPreset[];
    private selected: string | null;
    private recalled: (preset: MappingPreset) => void = () => undefined;

    /**
     * @param output - Output of the presets
     * @param recalled - Preset shown by the output, null for none
     * @param current - Mapping in the editor, saved in new and overwritten presets
     */
    constructor(private readonly output: string, presets: MappingPreset[], recalled: string | null, private readonly current: () => OutputMapping) {
        this.presets = structuredClone(presets);
        this.selected = recalled ?? this.presets[0]?.id ?? null;
        this.element.append(new Label({ text: t('mapping.presetHint'), size: 'small', tone: 'secondary' }), this.content);
        this.render();
    }

    onRecall(listener: (preset: MappingPreset) => void): void {
        this.recalled = listener;
    }

    private save(preset: MappingPreset): void {
        const exists = this.presets.some((item) => item.id === preset.id);
        this.presets = exists ? this.presets.map((item) => item.id === preset.id ? preset : item) : [...this.presets, preset];
        void engine().request('video.savePreset', { id: this.output, preset }).catch(showError);
    }

    private render(): void {
        this.content.destroy();
        const add = new Key({ label: t('mapping.savePreset'), icon: 'plus' });
        add.setDisabled(this.presets.length >= MAX_PRESETS);
        add.onPress(() => {
            const preset: MappingPreset = { id: crypto.randomUUID(), name: t('mapping.preset', { number: this.presets.length + 1 }), morph: 0, ...mappingOf(this.current()) };
            this.selected = preset.id;
            this.save(preset);
            this.render();
        });
        const labels = new Map<string, Label>();
        const list = new Stack({
            gap: 4,
            children: this.presets.map((preset) => {
                const label = new Label({ text: preset.name, size: 'small' });
                labels.set(preset.id, label);
                const item = new ListItem({ children: [label] });
                item.setSelected(preset.id === this.selected);
                item.onPress(() => {
                    this.selected = preset.id;
                    this.render();
                });
                return item;
            })
        });
        this.content = new Stack({ gap: 8, children: [add, list] });
        const preset = this.presets.find((item) => item.id === this.selected);
        if (preset !== undefined) {
            const latest = (): MappingPreset => this.presets.find((item) => item.id === preset.id) ?? preset;
            const name = new TextField({ label: t('mapping.name'), value: preset.name, maxLength: 60 });
            name.onInput((value) => {
                this.save({ ...latest(), name: value });
                labels.get(preset.id)?.setText(value);
            });
            const morph = new NumberField({ label: t('mapping.morph'), unit: 's', value: preset.morph, min: MORPH_LIMITS.min, max: MORPH_LIMITS.max, decimals: 1 });
            morph.onChange((value) => this.save({ ...latest(), morph: value }));
            const recall = new Key({ label: t('mapping.recall') });
            recall.onPress(() => {
                void engine().request('video.recallPreset', { id: this.output, preset: preset.id }).catch(showError);
                this.recalled(latest());
            });
            const overwrite = new Key({ label: t('mapping.overwrite') });
            overwrite.onPress(() => this.save({ ...latest(), ...mappingOf(this.current()) }));
            const remove = new Key({ label: t('common.delete'), icon: 'trash-2' });
            remove.onPress(() => {
                this.presets = this.presets.filter((item) => item.id !== preset.id);
                this.selected = this.presets[0]?.id ?? null;
                void engine().request('video.deletePreset', { id: this.output, preset: preset.id }).catch(showError);
                this.render();
            });
            this.content.append(name, morph, new Stack({ direction: 'row', gap: 8, wrap: true, children: [recall, overwrite, remove] }));
        }
        this.element.append(this.content);
    }
}
