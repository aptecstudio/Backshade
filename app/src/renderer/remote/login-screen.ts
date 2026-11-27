/**
 * Entering from a remote client: the PIN of the operator entered on the
 * controlled computer. While nobody is entered there the screen says so and
 * checks again.
 */

import { Component, create, Label, Panel, Stack } from '../../framework/ts/index.js';
import { PinPad } from '../dialogs/pin-pad.js';
import { t, type TextKey } from '../i18n/i18n.js';

const CHECK_MS = 2000;

/** Status of the controlled computer */
export interface RemoteStatus {
    open: boolean;
    session: boolean;
}

export async function remoteStatus(): Promise<RemoteStatus> {
    const answer = await fetch('/api/status', { cache: 'no-store' });
    return await answer.json() as RemoteStatus;
}

const ERRORS: Readonly<Record<string, TextKey>> = {
    'wrong-pin': 'errors.wrongPin',
    'pin-locked': 'errors.pinLocked',
    'no-operator': 'remote.noOperator'
};

class LoginScreen extends Component<HTMLDivElement> {
    private readonly pad: PinPad;
    private readonly waiting: Label;

    constructor(entered: () => void) {
        super(create('div', { classes: ['remote-login'], attributes: { tabindex: '0' } }));
        const panel = new Panel({ title: t('remote.title') });
        this.pad = new PinPad(t('remote.pinHint'), this.element);
        this.waiting = new Label({ text: t('remote.noOperator'), tone: 'secondary', size: 'small' });
        panel.append(new Stack({ gap: 2, align: 'center', children: [this.waiting, this.pad] }));
        this.append(panel);
        this.pad.onComplete((pin) => void this.send(pin, entered));
    }

    /** Shows the keypad only while an operator is entered on the computer */
    showOpen(open: boolean): void {
        this.waiting.element.hidden = open;
        this.pad.element.hidden = !open;
    }

    private async send(pin: string, entered: () => void): Promise<void> {
        this.pad.setBusy(true);
        let message: TextKey = 'remote.pinHint';
        try {
            const answer = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) });
            if (answer.ok) {
                entered();
                return;
            }
            message = ERRORS[(await answer.json() as { error: string }).error] ?? 'errors.generic';
        } catch {
            message = 'remote.connectionLost';
        }
        this.pad.setBusy(false);
        this.pad.reset(t(message));
    }
}

/** Shows the login screen until the client entered */
export function login(): Promise<void> {
    return new Promise((resolve) => {
        let done = false;
        const screen = new LoginScreen(() => {
            done = true;
            window.clearInterval(timer);
            screen.destroy();
            resolve();
        });
        const check = (): void => void remoteStatus().then((status) => {
            if (!done) {
                screen.showOpen(status.open);
            }
        }).catch(() => undefined);
        const timer = window.setInterval(check, CHECK_MS);
        screen.mount(document.body);
        screen.element.focus();
        check();
    });
}
