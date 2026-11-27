/**
 * Creation of the first administrator of a show: every show has operators,
 * so a new show is born with this one and an older show without operators
 * gets it before anything else. Name and PIN are checked here.
 */

import { randomUUID } from 'node:crypto';
import { isValidPin, OPERATOR_NAME_LENGTH, uniformAccess, type ShowOperator } from '../../shared/show/operators';
import { EngineError } from '../transport/engine-error';
import { hashPin } from './operator-pin';

/** Name of an operator, trimmed and cut to its maximum length */
export function operatorName(name: string): string {
    const result = name.trim().slice(0, OPERATOR_NAME_LENGTH);
    if (result === '') {
        throw new EngineError('invalid-name', 'Empty name');
    }
    return result;
}

/** Administrator with a PIN, not yet part of a show */
export function newAdministrator(name: string, pin: string): ShowOperator {
    if (!isValidPin(pin)) {
        throw new EngineError('invalid-pin', 'The PIN has 4 digits');
    }
    return { id: randomUUID(), name: operatorName(name), admin: true, access: uniformAccess('edit'), ...hashPin(pin) };
}
