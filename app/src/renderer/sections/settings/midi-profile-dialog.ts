/**
 * Guided setup of a controller profile: the controls of the profile are
 * asked one at a time ("touch Fader 1: Master A"); each message received is
 * learned for that control, with the LED value of the profile. Controls
 * whose scene, chaser or group is missing in the show are left out. A
 * control can be skipped; closing the dialog stops the setup.
 */

import { Dialog, Key, Label, Stack } from '../../../framework/ts/index.js';
import type { MidiTarget } from '../../../shared/midi/midi.js';
import type { GuidedProfile, ProfileStep } from '../../../shared/midi/midi-profiles.js';
import { showError } from '../../dialogs/show-error.js';
import { t } from '../../i18n/i18n.js';
import { resolveRole } from '../../midi/profile-roles.js';
import { engine } from '../../transport/engine.js';

/** Text of a control, for example "Fader 1" or "Play" */
function controlText(step: ProfileStep): string {
    return t(`midi.controls.${step.control}`, { number: step.number });
}

/**
 * Opens the dialog and starts the setup.
 * @param describe - Text of what a target drives
 */
export async function openProfileDialog(profile: GuidedProfile, describe: (target: MidiTarget) => string): Promise<void> {
    let memories;
    let groups;
    try {
        [memories, groups] = await Promise.all([engine().request('memories.get'), engine().request('patch.getGroups')]);
    } catch (error) {
        await showError(error);
        return;
    }
    const steps = profile.steps
        .map((step) => ({ step, target: resolveRole(step.role, memories, groups) }))
        .filter((item): item is { step: ProfileStep; target: MidiTarget } => item.target !== null);

    const dialog = new Dialog({ title: t('midi.profileTitle', { name: profile.name }) });
    const progress = new Label({ text: '', tone: 'secondary', size: 'small' });
    const control = new Label({ text: '', size: 'large', weight: 'medium' });
    const role = new Label({ text: '', tone: 'secondary' });
    dialog.append(new Stack({ gap: 1, children: [progress, control, role, new Label({ text: t('midi.profileHint'), tone: 'secondary', size: 'small' })] }));

    let index = -1;
    let learned = 0;
    let open = true;
    // The control of the step was seen waiting in the engine
    let waiting = false;
    const stops: Array<() => void> = [];
    const finish = (): void => {
        if (!open) {
            return;
        }
        open = false;
        stops.forEach((stop) => stop());
        void engine().request('midi.setLearn', { on: false }).catch(() => undefined);
        dialog.close();
    };
    const next = async (): Promise<void> => {
        index++;
        if (index >= steps.length) {
            control.setText(t('midi.profileDone', { count: learned }));
            role.setText('');
            progress.setText('');
            skip.setDisabled(true);
            cancel.setLabel(t('common.ok'));
            return;
        }
        waiting = false;
        const { step, target } = steps[index];
        progress.setText(t('midi.profileStep', { number: index + 1, count: steps.length }));
        control.setText(t('midi.profileTouch', { control: controlText(step) }));
        role.setText(describe(target));
        try {
            await engine().request('midi.setLearn', { on: true });
            await engine().request('midi.choose', { target, mode: step.mode, led: profile.led });
        } catch (error) {
            await showError(error);
            finish();
        }
    };
    // The control waiting is learned when the engine no longer waits for it
    stops.push(engine().on('midi.stateChanged', ({ state }) => {
        if (!open || index < 0 || index >= steps.length) {
            return;
        }
        if (state.pending !== null) {
            waiting = true;
        } else if (waiting && state.learn) {
            learned++;
            void next();
        }
    }));
    const skip = new Key({ label: t('midi.profileSkip') });
    const cancel = new Key({ label: t('common.cancel') });
    skip.onPress(() => void next());
    cancel.onPress(finish);
    dialog.addActions(skip, cancel);
    dialog.onCancel(finish);
    dialog.open();
    if (steps.length === 0) {
        index = 0;
        control.setText(t('midi.profileEmpty'));
        skip.setDisabled(true);
        return;
    }
    await next();
}
