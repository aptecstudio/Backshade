/**
 * Sends files of the device to the controlled computer: for each one the
 * engine gives a ticket, then the file is sent over HTTP. A window shows
 * the progress and can stop it.
 */

import { Component, create, Dialog, Key, Label } from '../../framework/ts/index.js';
import { errorMessage } from '../dialogs/show-error.js';
import { t } from '../i18n/i18n.js';

/** Asks the engine the ticket of a file */
export type TicketRequest = (file: { name: string; size: number }) => Promise<{ ticket: string }>;

class Progress extends Component<HTMLDivElement> {
    constructor() {
        super(create('div', { classes: ['upload-progress'] }));
    }

    set(part: number): void {
        this.element.style.setProperty('--upload-progress', String(part));
    }
}

/** Sends one file; rejects when refused, stopped or incomplete */
function send(request: XMLHttpRequest, ticket: string, file: File, progress: (part: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const failed = (): void => reject(new Error('upload-failed'));
        request.open('POST', `/api/upload/${ticket}`);
        request.setRequestHeader('content-type', 'application/octet-stream');
        request.upload.addEventListener('progress', (event) => progress(event.total === 0 ? 1 : event.loaded / event.total));
        request.addEventListener('load', () => request.status === 200 ? resolve() : failed());
        request.addEventListener('error', failed);
        request.addEventListener('abort', failed);
        request.send(file);
    });
}

/**
 * Sends the files one after the other.
 * @returns true when at least one arrived
 */
export function sendFiles(files: readonly File[], ticketFor: TicketRequest): Promise<boolean> {
    if (files.length === 0) {
        return Promise.resolve(false);
    }
    return new Promise((resolve) => {
        const dialog = new Dialog({ title: t('upload.title') });
        const name = new Label({ text: '' });
        const state = new Label({ text: '', tone: 'secondary', size: 'small' });
        const problems = new Label({ text: '', tone: 'accent', size: 'small' });
        problems.element.setAttribute('role', 'alert');
        const bar = new Progress();
        const close = new Key({ label: t('common.cancel') });
        dialog.append(name, bar, state, problems);
        dialog.addActions(close);

        let sent = 0;
        let stopped = false;
        let finished = false;
        let request: XMLHttpRequest | null = null;
        const leave = (): void => {
            stopped = true;
            request?.abort();
            if (finished) {
                dialog.close();
                resolve(sent > 0);
            }
        };
        close.onPress(leave);
        dialog.onCancel(leave);
        dialog.open();

        void (async () => {
            const failures: string[] = [];
            for (const [index, file] of files.entries()) {
                if (stopped) {
                    break;
                }
                name.setText(file.name);
                state.setText(t('upload.progress', { number: index + 1, count: files.length }));
                bar.set(0);
                try {
                    const { ticket } = await ticketFor({ name: file.name, size: file.size });
                    request = new XMLHttpRequest();
                    await send(request, ticket, file, (part) => bar.set(part));
                    sent += 1;
                } catch (error) {
                    if (!stopped) {
                        failures.push(`${file.name}: ${error instanceof Error && error.message === 'upload-failed' ? t('errors.uploadFailed') : errorMessage(error)}`);
                    }
                }
            }
            finished = true;
            // Everything arrived or the user stopped: the window goes away; failures stay to be read
            if (stopped || failures.length === 0) {
                dialog.close();
                resolve(sent > 0);
                return;
            }
            state.setText(t('upload.done', { number: sent, count: files.length }));
            problems.setText(failures.join('\n'));
            close.setLabel(t('common.close'));
        })();
    });
}
