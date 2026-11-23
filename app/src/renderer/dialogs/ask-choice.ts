/**
 * Domanda all'utente con un messaggio e alcune scelte: restituisce la
 * scelta fatta, o null se la finestra viene annullata con Esc.
 */

import { Dialog, Key, Label } from '../../framework/ts/index.js';

/** Scelta offerta all'utente */
export interface Choice<T extends string> {
    id: T;
    label: string;
    /** Scelta principale, evidenziata */
    primary?: boolean;
    /** Scelta che distrugge dati, segnata in rosso */
    destructive?: boolean;
}

/**
 * Mostra la domanda e attende la risposta.
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
