/**
 * Controls of the simple console: masters A and B in crossfade (B
 * reversed), scene master and grand master, each with its typed value,
 * and the keys full on, blind and home. Masters follow the engine, so
 * every window shows the same positions.
 */

import { Fader, Key, Label, LIGHT_SCALE, Panel, RangeInput, Stack } from '../../../framework/ts/index.js';
import type { PresetDeskState, PresetMaster } from '../../../shared/console/preset-desk.js';
import { showError } from '../../dialogs/show-error.js';
import { t, type TextKey } from '../../i18n/i18n.js';
import { applyOutputState, onOutputState } from '../../output/output-store.js';
import { bindControlValue } from '../../preferences/control-values.js';
import { engine } from '../../transport/engine.js';

/** Scale of Master B, printed reversed as on the hardware desks */
const REVERSED_SCALE = LIGHT_SCALE.map((tick) => ({ ...tick, position: 1 - tick.position }));

interface MasterStrip {
    fader: Fader;
    element: Stack;
}

export class DeskControls extends Panel {
    private readonly masters = new Map<PresetMaster, Fader>();
    private readonly fullOn: Key;
    private readonly blind: Key;
    private readonly blindHint: Label;

    constructor() {
        super({ title: t('deskConsole.masters'), classes: ['desk-controls'] });

        const strips: MasterStrip[] = [];
        const masterKeys: ReadonlyArray<[PresetMaster, TextKey]> = [['a', 'deskConsole.masterA'], ['b', 'deskConsole.masterB'], ['scene', 'deskConsole.masterScene']];
        for (const [master, labelKey] of masterKeys) {
            const strip = this.strip(t(labelKey), master === 'b');
            strip.fader.onChange((position) => {
                void engine().request('console.setMaster', { master, position }).catch(showError);
            });
            this.masters.set(master, strip.fader);
            strips.push(strip);
        }
        const grand = this.strip(t('deskConsole.grandMaster'), false);
        grand.fader.onChange((level) => {
            void engine().request('output.setGrandMaster', { level }).then(applyOutputState).catch(showError);
        });
        this.track(onOutputState((state) => {
            if (Math.abs(state.grandMaster - grand.fader.value) > 0.001) {
                grand.fader.setValue(state.grandMaster);
            }
        }));
        strips.push(grand);

        this.fullOn = new Key({ label: t('deskConsole.fullOn') });
        this.blind = new Key({ label: t('deskConsole.blind') });
        const home = new Key({ label: t('deskConsole.home') });
        this.fullOn.onPress(() => this.toggle('console.setFullOn', this.fullOn));
        this.blind.onPress(() => this.toggle('console.setBlind', this.blind));
        home.onPress(() => void engine().request('console.home').catch(showError));
        this.blindHint = new Label({ text: t('deskConsole.blindOn'), tone: 'accent', size: 'small' });
        this.blindHint.element.hidden = true;

        this.append(
            new Stack({ direction: 'row', gap: 2, classes: ['desk-controls__masters'], children: strips.map((strip) => strip.element) }),
            new Label({ text: t('deskConsole.masterHint'), tone: 'secondary', size: 'small' }),
            new Stack({ direction: 'row', gap: 1, classes: ['desk-controls__keys'], children: [this.fullOn, this.blind, home] }),
            this.blindHint
        );

        this.track(engine().on('console.stateChanged', ({ state }) => this.apply(state)));
        void engine().request('console.getState').then((state) => this.apply(state)).catch(showError);
    }

    private strip(title: string, reversed: boolean): MasterStrip {
        const fader = new Fader({ label: title, value: 1, scale: reversed ? REVERSED_SCALE : LIGHT_SCALE, size: 'compact' });
        const input = new RangeInput(fader, { label: title });
        this.track(bindControlValue('fader', fader, { input }));
        const element = new Stack({
            gap: 1,
            align: 'center',
            classes: ['desk-controls__master'],
            children: [new Label({ text: title, tone: reversed ? 'secondary' : 'accent', size: 'small', weight: 'medium' }), fader, input]
        });
        return { fader, element };
    }

    private apply(state: PresetDeskState): void {
        for (const [master, fader] of this.masters) {
            if (Math.abs(state.masters[master] - fader.value) > 0.001) {
                fader.setValue(state.masters[master]);
            }
        }
        this.fullOn.setState(state.fullOn ? 'active' : 'normal');
        this.blind.setState(state.blind ? 'active' : 'normal');
        this.blind.setArmed(state.blind);
        this.blindHint.element.hidden = !state.blind;
    }

    private toggle(method: 'console.setFullOn' | 'console.setBlind', key: Key): void {
        const on = !key.element.classList.contains('key--active');
        void engine().request(method, { on }).then((state) => this.apply(state)).catch(showError);
    }
}
