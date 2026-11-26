/**
 * Live cues of the simple console: the cue list in number order on the
 * left, and on the right the current and next cue, the progress of the
 * fade and of the follow wait, and the keys Go, Back, Pause and Release.
 * Pressing a cue in the list makes it the next one; its edit key opens its
 * dialog. Cues are added from the scenes of the show.
 */

import { Key, Label, ListItem, Panel, SelectField, Stack, ValueDisplay } from '../../../framework/ts/index.js';
import type { CueStackState } from '../../../shared/console/cue-stack.js';
import type { Cue, MemoriesSummary } from '../../../shared/console/memories.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { openCueDialog } from './cue-dialog.js';
import { CueProgress } from './cue-progress.js';
import { cueTimes, formatCue } from './cue-text.js';
import { memoryCode } from './memory-text.js';

interface CueRow {
    cue: Cue;
    element: Stack;
}

export class CuePanel extends Panel {
    private readonly list: Stack;
    private readonly empty: Label;
    private readonly sceneChoice: SelectField<string>;
    private readonly add: Key;
    private readonly current: ValueDisplay;
    private readonly next: ValueDisplay;
    private readonly fade: CueProgress;
    private readonly follow: CueProgress;
    private readonly pause: Key;
    private rows: CueRow[] = [];
    private memories: MemoriesSummary = { scenes: [], chasers: [], cues: [] };
    private state: CueStackState = { current: null, next: null, paused: false, fade: null, follow: null };

    constructor() {
        super({ title: t('cues.title'), classes: ['cue-panel'] });

        this.list = new Stack({ classes: ['cue-panel__list'] });
        this.empty = new Label({ text: t('cues.empty'), tone: 'secondary', size: 'small' });
        this.sceneChoice = new SelectField<string>({ ariaLabel: t('cues.scene'), options: [], value: '' });
        this.add = new Key({ label: t('cues.add'), icon: 'plus' });
        this.add.onPress(() => {
            if (this.sceneChoice.value !== '') {
                void engine().request('cues.add', { scene: this.sceneChoice.value }).catch(showError);
            }
        });

        this.current = new ValueDisplay({ caption: t('cues.current'), value: '' });
        this.next = new ValueDisplay({ caption: t('cues.next'), value: '' });
        this.fade = new CueProgress(t('cues.fadeProgress'));
        this.follow = new CueProgress(t('cues.followProgress'));
        const go = new Key({ label: t('cues.go'), icon: 'play', size: 'large' });
        const back = new Key({ label: t('cues.back'), icon: 'skip-back' });
        this.pause = new Key({ label: t('cues.pause') });
        const release = new Key({ label: t('cues.release'), icon: 'square' });
        go.element.classList.add('cue-panel__go');
        go.onPress(() => this.command('cues.go'));
        back.onPress(() => this.command('cues.back'));
        this.pause.onPress(() => this.command('cues.pause'));
        release.onPress(() => this.command('cues.release'));

        this.append(new Stack({
            direction: 'row',
            gap: 3,
            align: 'start',
            classes: ['cue-panel__layout'],
            children: [
                new Stack({
                    gap: 1,
                    classes: ['cue-panel__left'],
                    children: [this.empty, this.list, new Stack({ direction: 'row', gap: 1, align: 'center', children: [this.sceneChoice, this.add] })]
                }),
                new Stack({
                    gap: 2,
                    classes: ['cue-panel__controls'],
                    children: [
                        this.current,
                        this.next,
                        this.fade,
                        this.follow,
                        go,
                        new Stack({ direction: 'row', gap: 1, classes: ['cue-panel__keys'], children: [back, this.pause, release] })
                    ]
                })
            ]
        }));

        this.track(engine().on('memories.changed', () => void this.load()));
        this.track(engine().on('cues.stateChanged', ({ state }) => this.applyState(state)));
        void this.load();
        void engine().request('cues.getState').then((state) => this.applyState(state)).catch(showError);
    }

    private async load(): Promise<void> {
        try {
            this.memories = await engine().request('memories.get');
        } catch (error) {
            await showError(error);
            return;
        }
        const scenes = this.memories.scenes;
        const chosen = this.sceneChoice.value;
        this.sceneChoice.setOptions(scenes.map((scene) => ({ value: scene.id, label: `${memoryCode('scene', scene.slot)} ${scene.name}` })), scenes.some((scene) => scene.id === chosen) ? chosen : scenes[0]?.id ?? '');
        this.sceneChoice.setDisabled(scenes.length === 0);
        this.add.setDisabled(scenes.length === 0);
        this.build();
    }

    private build(): void {
        this.rows.forEach((row) => row.element.destroy());
        this.rows = this.memories.cues.map((cue) => {
            const scene = this.memories.scenes.find((item) => item.id === cue.scene);
            const item = new ListItem({
                label: t('cues.setNextLabel', { number: formatCue(cue.number) }),
                classes: ['cue-row__item'],
                children: [
                    new Label({ text: formatCue(cue.number), weight: 'medium' }),
                    new Label({ text: scene === undefined ? '' : `${memoryCode('scene', scene.slot)} ${scene.name}` }),
                    new Label({ text: cue.note, tone: 'secondary', size: 'small' }),
                    new Label({ text: cueTimes(cue, scene), tone: 'secondary', size: 'small' })
                ]
            });
            item.onPress(() => void engine().request('cues.setNext', { id: cue.id }).then((state) => this.applyState(state)).catch(showError));
            const edit = new Key({ label: t('cues.edit', { number: formatCue(cue.number) }), icon: 'pencil', iconOnly: true });
            edit.onPress(() => openCueDialog(cue, this.memories.scenes));
            const element = new Stack({ direction: 'row', gap: 1, align: 'center', classes: ['cue-row'], children: [item, edit] });
            this.list.append(element);
            return { cue, element };
        });
        this.empty.setText(this.memories.scenes.length === 0 ? t('cues.noScenes') : t('cues.empty'));
        this.empty.element.hidden = this.rows.length > 0;
        this.render();
    }

    private applyState(state: CueStackState): void {
        this.state = state;
        this.render();
    }

    private render(): void {
        const describe = (id: string | null): string => {
            const cue = this.memories.cues.find((item) => item.id === id);
            if (cue === undefined) {
                return t('cues.none');
            }
            const scene = this.memories.scenes.find((item) => item.id === cue.scene);
            return `${formatCue(cue.number)} ${cue.note !== '' ? cue.note : scene?.name ?? ''}`;
        };
        this.current.setValue(describe(this.state.current));
        this.next.setValue(describe(this.state.next));
        this.fade.setTiming(this.state.fade, !this.state.paused);
        this.follow.setTiming(this.state.follow, !this.state.paused);
        this.pause.setState(this.state.paused ? 'active' : 'normal');
        this.pause.setArmed(this.state.paused);
        for (const row of this.rows) {
            row.element.element.classList.toggle('cue-row--current', row.cue.id === this.state.current);
            row.element.element.classList.toggle('cue-row--next', row.cue.id === this.state.next);
        }
    }

    private command(method: 'cues.go' | 'cues.back' | 'cues.pause' | 'cues.release'): void {
        void engine().request(method).then((state) => this.applyState(state)).catch(showError);
    }
}
