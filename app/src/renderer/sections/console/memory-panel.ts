/**
 * Memories of the simple console: two banks of 12 scenes and one bank of
 * 12 chasers. A memory key turns its scene or chaser on and off; several
 * memories can be on together. Record arms the scene keys: the next scene
 * key pressed records the result of the desk. Edit arms every key: the next
 * key pressed opens its dialog. An empty chaser key creates a chaser. The
 * tempo row acts on the selected chaser: speed, tap and current step.
 */

import { ChoiceKeys, Key, Label, NumberField, Panel, Spacer, Stack } from '../../../framework/ts/index.js';
import { canEdit, markEdit } from '../../show/edit-access.js';
import { markMidi, unmarkMidi } from '../../midi/midi-target.js';
import {
    BPM_LIMITS,
    CHASER_SLOTS,
    MEMORIES_PER_BANK,
    SCENE_BANKS,
    type Chaser,
    type MemoriesState,
    type MemoriesSummary,
    type MemoryKind,
    type SceneSummary
} from '../../../shared/console/memories.js';
import { askChoice } from '../../dialogs/ask-choice.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { engine } from '../../transport/engine.js';
import { openChaserDialog } from './chaser-dialog.js';
import { memoryCode } from './memory-text.js';
import { openSceneDialog } from './scene-dialog.js';
import { TapTempo } from './tap-tempo.js';

/** What the next memory key press does */
type KeyMode = 'play' | 'record' | 'edit';

function rowTitle(text: string): Stack {
    return new Stack({ classes: ['memory-row__title'], children: [new Label({ text, size: 'small', weight: 'medium' })] });
}

export class MemoryPanel extends Panel {
    private readonly sceneKeys: Key[];
    private readonly chaserKeys: Key[];
    private readonly bank: ChoiceKeys<string>;
    private readonly record: Key;
    private readonly edit: Key;
    private readonly hint: Label;
    private readonly chaserName: Label;
    private readonly bpm: NumberField;
    private readonly tap: Key;
    private readonly step: Label;
    private readonly tapTempo = new TapTempo();
    private memories: MemoriesSummary = { scenes: [], chasers: [], cues: [] };
    private state: MemoriesState = { active: [], selectedChaser: null };
    private mode: KeyMode = 'play';
    private firstScene = 1;

    constructor() {
        super({ title: t('memories.title'), classes: ['memory-panel'] });

        this.bank = new ChoiceKeys<string>({
            ariaLabel: t('memories.bank'),
            options: Array.from({ length: SCENE_BANKS }, (_, index) => ({
                value: String(index),
                label: t('memories.sceneBank', { first: index * MEMORIES_PER_BANK + 1, last: (index + 1) * MEMORIES_PER_BANK })
            })),
            value: '0'
        });
        this.bank.onChange((value) => {
            this.firstScene = Number(value) * MEMORIES_PER_BANK + 1;
            this.render();
        });
        this.record = new Key({ label: t('memories.record'), icon: 'circle-dot' });
        this.edit = new Key({ label: t('memories.edit'), icon: 'pencil' });
        const release = new Key({ label: t('memories.releaseAll'), icon: 'square' });
        this.record.onPress(() => this.setMode(this.mode === 'record' ? 'play' : 'record'));
        this.edit.onPress(() => this.setMode(this.mode === 'edit' ? 'play' : 'edit'));
        markEdit(this.record, this.edit);
        release.onPress(() => void engine().request('memories.releaseAll').then((state) => this.applyState(state)).catch(showError));
        this.hint = new Label({ text: '', tone: 'accent', size: 'small' });

        this.sceneKeys = Array.from({ length: MEMORIES_PER_BANK }, (_, index) => this.memoryKey(() => this.pressScene(this.firstScene + index)));
        this.chaserKeys = Array.from({ length: CHASER_SLOTS }, (_, index) => this.memoryKey(() => this.pressChaser(index + 1)));

        this.chaserName = new Label({ text: '', tone: 'secondary', size: 'small' });
        this.bpm = new NumberField({ ariaLabel: t('memories.bpm'), unit: t('memories.bpmUnit'), value: 120, min: BPM_LIMITS.min, max: BPM_LIMITS.max, decimals: 1 });
        this.bpm.onChange((bpm) => this.setBpm(bpm));
        this.tap = new Key({ label: t('memories.tap') });
        this.tap.onPress(() => {
            const bpm = this.tapTempo.tap();
            if (bpm !== null) {
                this.setBpm(Math.min(BPM_LIMITS.max, Math.max(BPM_LIMITS.min, Math.round(bpm * 10) / 10)));
            }
        });
        this.step = new Label({ text: '', tone: 'secondary', size: 'small' });

        this.append(
            new Stack({ direction: 'row', gap: 8, align: 'center', wrap: true, children: [this.bank, this.hint, new Spacer(), this.record, this.edit, release] }),
            new Stack({ direction: 'row', gap: 8, classes: ['memory-row'], children: [rowTitle(t('memories.scenes')), this.keyRow(this.sceneKeys)] }),
            new Stack({ direction: 'row', gap: 8, classes: ['memory-row'], children: [rowTitle(t('memories.chasers')), this.keyRow(this.chaserKeys)] }),
            new Stack({
                direction: 'row',
                gap: 8,
                align: 'center',
                wrap: true,
                children: [new Label({ text: t('memories.tempo'), size: 'small', weight: 'medium' }), this.chaserName, this.bpm, this.tap, this.step]
            })
        );

        this.track(engine().on('memories.changed', () => void this.load()));
        this.track(engine().on('memories.stateChanged', ({ state }) => this.applyState(state)));
        void this.load();
        void engine().request('memories.getState').then((state) => this.applyState(state)).catch(showError);
    }

    private memoryKey(press: () => void): Key {
        const key = new Key({ label: '' });
        key.onPress(press);
        return key;
    }

    private keyRow(keys: Key[]): Stack {
        return new Stack({ direction: 'row', gap: 8, classes: ['memory-row__keys'], children: keys });
    }

    private async load(): Promise<void> {
        try {
            this.memories = await engine().request('memories.get');
        } catch (error) {
            await showError(error);
            return;
        }
        this.render();
    }

    private applyState(state: MemoriesState): void {
        this.state = state;
        this.render();
    }

    private setMode(mode: KeyMode): void {
        this.mode = mode;
        this.record.setState(mode === 'record' ? 'active' : 'normal');
        this.record.setArmed(mode === 'record');
        this.edit.setState(mode === 'edit' ? 'active' : 'normal');
        this.hint.setText(mode === 'record' ? t('memories.recordHint') : mode === 'edit' ? t('memories.editHint') : '');
        this.render();
    }

    private scene(slot: number): SceneSummary | undefined {
        return this.memories.scenes.find((scene) => scene.slot === slot);
    }

    private chaser(slot: number): Chaser | undefined {
        return this.memories.chasers.find((chaser) => chaser.slot === slot);
    }

    private isActive(id: string): boolean {
        return this.state.active.some((item) => item.id === id);
    }

    private render(): void {
        this.sceneKeys.forEach((key, index) => {
            const slot = this.firstScene + index;
            this.renderKey(key, 'scene', slot, this.scene(slot) ?? null, false);
        });
        this.chaserKeys.forEach((key, index) => {
            const chaser = this.chaser(index + 1) ?? null;
            this.renderKey(key, 'chaser', index + 1, chaser, chaser !== null && chaser.id === this.state.selectedChaser);
        });

        const selected = this.memories.chasers.find((chaser) => chaser.id === this.state.selectedChaser) ?? null;
        this.chaserName.setText(selected === null ? t('memories.noChaserSelected') : `${memoryCode('chaser', selected.slot)} ${selected.name}`);
        this.bpm.setDisabled(selected === null);
        this.tap.setDisabled(selected === null);
        // The chaser steps update the panel often: a value being typed is not replaced
        if (selected !== null && !this.bpm.element.contains(document.activeElement)) {
            this.bpm.setValue(selected.bpm);
        }
        const playing = selected === null ? undefined : this.state.active.find((item) => item.id === selected.id);
        this.step.setText(playing?.step === null || playing === undefined || selected === null
            ? ''
            : t('memories.step', { step: playing.step + 1, count: selected.steps.length }));
    }

    private renderKey(key: Key, kind: MemoryKind, slot: number, memory: SceneSummary | Chaser | null, selected: boolean): void {
        const code = memoryCode(kind, slot);
        key.setLabel(memory === null ? code : `${code} ${memory.name}`);
        key.element.title = memory === null ? code : `${code} ${memory.name}`;
        key.setState(memory !== null && this.isActive(memory.id) ? 'active' : memory === null ? 'inactive' : 'normal');
        key.setArmed(selected);
        if (memory === null) {
            unmarkMidi(key);
        } else {
            markMidi(key, { kind, id: memory.id }, 'button');
        }
        // In record mode only the scene keys can be used
        key.setDisabled(this.mode === 'record' && kind === 'chaser');
    }

    private async pressScene(slot: number): Promise<void> {
        const scene = this.scene(slot);
        const mode = this.mode;
        if (mode !== 'play') {
            this.setMode('play');
        }
        if (mode === 'record') {
            await this.recordScene(slot, scene);
        } else if (mode === 'edit') {
            if (scene !== undefined) {
                openSceneDialog(scene, this.memories.chasers.filter((chaser) => chaser.steps.includes(scene.id)).length
                    + this.memories.cues.filter((cue) => cue.scene === scene.id).length);
            }
        } else if (scene !== undefined) {
            this.toggle('scene', scene.id);
        }
    }

    private async recordScene(slot: number, scene: SceneSummary | undefined): Promise<void> {
        if (scene !== undefined) {
            const choice = await askChoice(t('memories.overwriteTitle'), t('memories.overwriteConfirm', { name: scene.name }), [
                { id: 'cancel', label: t('common.cancel') },
                { id: 'record', label: t('memories.record'), primary: true }
            ]);
            if (choice !== 'record') {
                return;
            }
        }
        try {
            await engine().request('memories.recordScene', { slot, name: scene?.name ?? t('memories.defaultSceneName', { slot }) });
        } catch (error) {
            await showError(error);
        }
    }

    private pressChaser(slot: number): void {
        const chaser = this.chaser(slot);
        const editing = this.mode === 'edit';
        if (this.mode !== 'play') {
            this.setMode('play');
        }
        if ((editing || chaser === undefined) && !canEdit('console')) {
            return;
        }
        if (editing || chaser === undefined) {
            openChaserDialog(slot, chaser ?? null, this.memories.scenes);
        } else {
            this.toggle('chaser', chaser.id);
        }
    }

    private toggle(kind: MemoryKind, id: string): void {
        void engine().request('memories.setActive', { kind, id, on: !this.isActive(id) }).then((state) => this.applyState(state)).catch(showError);
    }

    private setBpm(bpm: number): void {
        const id = this.state.selectedChaser;
        if (id !== null) {
            void engine().request('memories.setBpm', { id, bpm }).catch(showError);
        }
    }
}
