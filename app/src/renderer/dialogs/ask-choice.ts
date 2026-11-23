/**
 * Asks the user a question with a message and some choices: returns the
 * choice made, or null if the dialog is cancelled with Esc.
 */

import { Dialog, Key, Label } from '../../framework/ts/index.js';

/** Choice offered to the user */
export interface Choice<T extends string> {
    id: T;
    label: string;
    /** Main choice, highlighted */
    primary?: boolean;
    /** Choice that destroys data, marked in red */
    destructive?: boolean;
}

/**
 * Shows the question and waits for the answer.
 */
export function askChoice<T extends string>(title: string, message: string, choices: readonly Choice<T>[]): Promise<T | null> {
    return new Promise((resolve) => {
        const dialog = new Dialog({ title });
        dialog.append(new Label({ text: message }));

        const finish = (choice: T | null): void => {
            dialog.close();
            resolve(choice);
        };
        dialog.addActions(...choices.map((choice) => {
            const key = new Key({ label: choice.label, state: choice.primary === true ? 'active' : 'normal', armed: choice.destructive === true });
            key.onPress(() => finish(choice.id));
            return key;
        }));
        dialog.onCancel(() => finish(null));
        dialog.open();
    });
}
