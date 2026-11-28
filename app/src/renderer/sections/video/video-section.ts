/**
 * Video section: the video outputs of the show. Keys choose an output and
 * open its settings; for the chosen output the preview (next composition,
 * prepared) and the program (what goes out) are shown side by side with
 * their layers. Take brings the preview to program with the transition
 * time, on this output or on all.
 */

import { Key, Label, NumberField, Panel, Spacer, Stack, makeSortable } from '../../../framework/ts/index.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import type { TimerState } from '../../../shared/video/show-timer.js';
import type { GoboContext } from '../../../shared/video/text-gobo.js';
import type { OutputComposition, ShowVideo, VideoInput, VideoOutputConfig } from '../../../shared/video/video.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { markEdit } from '../../show/edit-access.js';
import { engine } from '../../transport/engine.js';
import { CompositionView } from '../../video/composition-view.js';
import { GoboPanel } from './gobo-panel.js';
import { LayerRow } from './layer-row.js';
import { openMappingDialog } from './mapping-dialog.js';
import { TimerPanel } from './timer-panel.js';
import { openOutputDialog } from './output-dialog.js';

interface Monitor {
    view: CompositionView;
    rows: LayerRow[];
}

export class VideoSection extends Stack {
    private readonly outputKeys = new Stack({ direction: 'row', gap: 8, wrap: true });
    private readonly settings: Key;
    private readonly mapping: Key;
    private readonly empty: Label;
    private readonly body = new Stack({ gap: 8 });
    private readonly transition: NumberField;
    private keys: Key[] = [];
    private monitors: { preview: Monitor; program: Monitor } | null = null;
    private grid: Stack | null = null;
    private video: ShowVideo = { outputs: [], gobos: [], timers: [] };
    private timerStates: Record<string, TimerState> = {};
    private timerPanel: TimerPanel | null = null;
    private context: GoboContext = { cue: '', song: '' };
    private goboPanel: GoboPanel | null = null;
    private compositions: Record<string, OutputComposition> = {};
    private media: MediaItem[] = [];
    private inputs: VideoInput[] = [];
    private selected: string | null = null;

    constructor() {
        super({ gap: 12, classes: ['video-section'] });
        const add = new Key({ label: t('video.addOutput'), icon: 'plus' });
        add.onPress(() => void engine().request('video.addOutput', { name: t('video.defaultName', { number: this.video.outputs.length + 1 }) }).catch(showError));
        this.settings = new Key({ label: t('video.settings'), icon: 'settings' });
        this.settings.onPress(() => {
            const output = this.output();
            if (output !== null) {
                void openOutputDialog(output);
            }
        });
        this.transition = new NumberField({ ariaLabel: t('video.transition'), value: 1, min: 0, max: 60, decimals: 1, unit: 's' });
        this.mapping = new Key({ label: t('mapping.open'), icon: 'grid-3x3' });
        this.mapping.onPress(() => {
            const output = this.output();
            if (output !== null) {
                void openMappingDialog(output).catch(showError);
            }
        });
        markEdit(add, this.settings, this.mapping);
        const take = new Key({ label: t('video.take'), size: 'large' });
        const takeAll = new Key({ label: t('video.takeAll') });
        take.onPress(() => this.take(this.selected));
        takeAll.onPress(() => this.take(null));
        this.empty = new Label({ text: t('video.empty'), tone: 'secondary' });

        const header = new Panel({ title: t('video.outputs') });
        header.append(new Stack({
            direction: 'row',
            gap: 8,
            align: 'center',
            wrap: true,
            children: [this.outputKeys, add, this.settings, this.mapping, new Spacer(), new Label({ text: t('video.transition'), size: 'small' }), this.transition, takeAll, take]
        }), this.empty);
        this.append(header, this.body);
        this.timerPanel = new TimerPanel();
        this.goboPanel = new GoboPanel();
        this.append(this.timerPanel, this.goboPanel);
        this.track(engine().on('video.timersChanged', ({ states }) => {
            this.timerStates = states;
            this.monitors?.preview.view.setTimers(this.video.timers, states);
            this.monitors?.program.view.setTimers(this.video.timers, states);
            this.timerPanel?.applyStates(states);
        }));

        this.track(engine().on('video.changed', () => void this.load()));
        this.track(engine().on('video.stateChanged', ({ compositions }) => this.applyState(compositions)));
        this.track(engine().on('media.changed', () => void this.load()));
        void this.load();
    }

    private output(): VideoOutputConfig | null {
        return this.video.outputs.find((item) => item.id === this.selected) ?? this.video.outputs[0] ?? null;
    }

    private async load(): Promise<void> {
        try {
            [this.video, this.compositions, this.media, this.inputs, this.timerStates] = await Promise.all([
                engine().request('video.get'),
                engine().request('video.getState'),
                engine().request('media.list'),
                engine().request('video.listInputs'),
                engine().request('video.getTimers')
            ]);
        } catch (error) {
            await showError(error);
            return;
        }
        this.render();
    }

    private render(): void {
        const output = this.output();
        this.selected = output?.id ?? null;
        this.keys.forEach((key) => key.destroy());
        this.keys = this.video.outputs.map((item) => {
            const key = new Key({ label: item.name, icon: 'video', state: item.id === this.selected ? 'active' : 'normal' });
            key.setArmed(item.enabled);
            key.onPress(() => {
                this.selected = item.id;
                this.render();
            });
            return key;
        });
        this.outputKeys.append(...this.keys);
        this.goboPanel?.show(this.video.gobos, this.media);
        this.timerPanel?.show(this.video.timers, this.timerStates);
        this.settings.element.hidden = output === null;
        this.mapping.element.hidden = output === null;
        this.empty.element.hidden = output !== null;

        this.grid?.destroy();
        this.grid = null;
        this.monitors = null;
        if (output === null) {
            return;
        }
        const composition = this.compositions[output.id] ?? { program: [], preview: [] };
        const panels: Panel[] = [];
        const monitor = (target: 'preview' | 'program'): Monitor => {
            const panel = new Panel({ title: t(`video.${target}`), classes: ['video-monitor', `video-monitor--${target}`] });
            const view = new CompositionView();
            view.element.style.setProperty('--output-ratio', `${output.width} / ${output.height}`);
            view.setGobos(this.video.gobos, this.context);
            view.setTimers(this.video.timers, this.timerStates);
            view.show(composition[target], 0);
            const rows = composition[target].map((layer, index) => new LayerRow(output.id, target, index, layer, this.media, this.inputs, this.video.gobos, this.video.timers));
            // Top layer first, as they are stacked; dragging a layer moves it in the stack
            const list = new Stack({ children: [...rows].reverse() });
            panel.append(view, list);
            makeSortable({
                container: list.element,
                items: () => [...rows].reverse().map((row) => row.element),
                onDrop: ({ from, to }) => {
                    const count = rows.length;
                    void engine().request('video.moveLayer', { output: output.id, target, from: count - 1 - from, to: count - 1 - to }).catch(showError);
                }
            });
            panels.push(panel);
            return { view, rows };
        };
        this.monitors = { preview: monitor('preview'), program: monitor('program') };
        this.grid = new Stack({ classes: ['video-monitors'], children: panels });
        this.body.append(this.grid);
    }

    private applyState(compositions: Record<string, OutputComposition>): void {
        const output = this.output();
        const changedSize = output !== null && (compositions[output.id]?.program.length ?? 0) !== (this.compositions[output.id]?.program.length ?? 0);
        this.compositions = compositions;
        if (output === null || this.monitors === null || changedSize) {
            this.render();
            return;
        }
        const composition = compositions[output.id];
        for (const target of ['preview', 'program'] as const) {
            this.monitors[target].view.show(composition[target], target === 'program' ? 0.3 : 0);
            this.monitors[target].rows.forEach((row, index) => row.update(composition[target][index]));
        }
    }

    private take(outputId: string | null): void {
        const duration = this.transition.value;
        void engine().request('video.take', { ...(outputId === null ? {} : { output: outputId }), duration }).catch(showError);
    }
}
