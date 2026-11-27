/**
 * Operators of the open show: entering with the PIN, leaving, managing the
 * operators (administrators only) and the check of the permissions before
 * every engine method. The operator who entered belongs to this instance
 * and is forgotten when a show is opened or closed; the remote interface
 * (Phase 10) and the nodes (Phase 15) will have one per connection.
 */

import { randomUUID } from 'node:crypto';
import {
    OPERATOR_SECTIONS,
    effectiveAccess,
    isValidPin,
    normalizeAccess,
    operatorProfile,
    type OperatorProfile,
    type OperatorState,
    type ShowOperator
} from '../../shared/show/operators';
import { METHOD_RULES } from '../operators/method-rules';
import { operatorName } from '../operators/new-operator';
import { hashPin, matchesPin } from '../operators/operator-pin';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalBoolean, optionalString, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';

// Wrong PINs in a row before the PIN is refused for a while
const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 1000;
// Wait after a wrong PIN, so that PINs cannot be tried quickly
const WRONG_PIN_DELAY_MS = 400;

/** Operator who entered, with the PIN typed to enter (kept only in memory) */
export interface OperatorSessionInfo {
    current(): { operator: ShowOperator; pin: string } | null;
    /** Enters as an operator of the open show and tells every window, for example who just created it */
    signIn(id: string, pin: string): void;
}

export function registerOperatorService(router: RequestRouter, bus: EventBus, session: ShowSession): OperatorSessionInfo {
    let currentId: string | null = null;
    let currentPin: string | null = null;
    let failures = 0;
    let lockedUntil = 0;

    const current = (): ShowOperator | undefined => session.operators().find((operator) => operator.id === currentId);
    const state = (): OperatorState => {
        const operator = current();
        return {
            showId: session.summary()?.id ?? null,
            required: session.operators().length > 0,
            operator: operator === undefined ? null : operatorProfile(operator)
        };
    };
    const profiles = (): OperatorProfile[] => session.operators().map(operatorProfile);
    const changed = (): void => bus.emit('operators.changed', { state: state() });

    /** Administrators only, or anyone while the show waits for its first administrator */
    const requireManager = (): void => {
        if (session.operators().length > 0 && current()?.admin !== true) {
            throw new EngineError('operator-not-allowed', 'Only administrators manage the operators');
        }
    };

    session.onContentChange((part) => {
        if (part === 'all') {
            currentId = null;
            currentPin = null;
            failures = 0;
            changed();
        } else if (part === 'operators') {
            changed();
        }
    });

    router.setGuard((method, context) => {
        if (context.transport === 'internal') {
            return;
        }
        const rule = METHOD_RULES[method];
        // Without a show there are no operators; with a show, only free methods work until an operator entered
        // (a show without operators first creates its administrator, with the free operators.save)
        if (session.summary() === null || rule?.kind === 'free') {
            return;
        }
        const operator = current();
        if (operator === undefined) {
            throw new EngineError('operator-required', 'Enter the PIN of an operator');
        }
        const access = effectiveAccess(operator);
        const allowed = rule === undefined
            || (rule.kind === 'admin' && operator.admin)
            || (rule.kind === 'play' && (rule.sections.length === 0 || rule.sections.some((section) => access[section] !== 'hidden')))
            || (rule.kind === 'edit' && access[rule.section] === 'edit');
        if (!allowed) {
            throw new EngineError('operator-not-allowed', `Not allowed for this operator: ${method}`);
        }
    });

    router.register('operators.getState', () => state());

    router.register('operators.login', async (params) => {
        const input = requireObject(params);
        const pin = requireString(input, 'pin');
        const id = optionalString(input, 'id');
        if (Date.now() < lockedUntil) {
            throw new EngineError('pin-locked', 'Too many wrong PINs, wait');
        }
        const matches = isValidPin(pin) ? session.operators().filter((item) => matchesPin(pin, item)) : [];
        // Imported operators may share a PIN: the operator chooses among them
        if (matches.length > 1 && id === undefined) {
            return { state: state(), choices: matches.map((item) => ({ id: item.id, name: item.name })) };
        }
        const operator = id === undefined ? matches[0] : matches.find((item) => item.id === id);
        if (operator === undefined) {
            failures += 1;
            if (failures >= MAX_ATTEMPTS) {
                failures = 0;
                lockedUntil = Date.now() + LOCK_MS;
            }
            await new Promise((resolve) => setTimeout(resolve, WRONG_PIN_DELAY_MS));
            throw new EngineError('wrong-pin', 'Wrong PIN');
        }
        failures = 0;
        currentId = operator.id;
        currentPin = pin;
        changed();
        return { state: state(), choices: [] };
    });

    router.register('operators.logout', () => {
        currentId = null;
        currentPin = null;
        changed();
        return state();
    });

    router.register('operators.list', () => {
        requireManager();
        return profiles();
    });

    router.register('operators.save', (params) => {
        requireManager();
        const input = requireObject(params);
        const operators = session.operators();
        const id = optionalString(input, 'id');
        const name = operatorName(requireString(input, 'name'));
        const pin = optionalString(input, 'pin');
        const first = operators.length === 0;
        // The first operator is who protects the show: always an administrator
        const admin = first || optionalBoolean(input, 'admin') === true;
        if (pin !== undefined && !isValidPin(pin)) {
            throw new EngineError('invalid-pin', 'The PIN has 4 digits');
        }
        const existing = id === undefined ? undefined : operators.find((operator) => operator.id === id);
        if (id !== undefined && existing === undefined) {
            throw new EngineError('operator-not-found', `Operator not found: ${id}`);
        }
        if (existing === undefined && pin === undefined) {
            throw new EngineError('invalid-pin', 'A new operator needs a PIN');
        }
        if (pin !== undefined && operators.some((operator) => operator.id !== id && matchesPin(pin, operator))) {
            throw new EngineError('pin-in-use', 'Another operator has this PIN');
        }
        if (existing?.admin === true && !admin && operators.filter((operator) => operator.admin).length === 1) {
            throw new EngineError('last-admin', 'The show needs an administrator');
        }
        const access = normalizeAccess(input.access);
        const operator: ShowOperator = {
            id: existing?.id ?? randomUUID(),
            name,
            admin,
            access: admin ? Object.fromEntries(OPERATOR_SECTIONS.map((section) => [section, 'edit'])) as ShowOperator['access'] : access,
            ...(pin === undefined ? { pinSalt: existing!.pinSalt, pinHash: existing!.pinHash } : hashPin(pin))
        };
        // Who protects the show enters at once; set before the change is told
        if (first) {
            currentId = operator.id;
        }
        if (operator.id === currentId && pin !== undefined) {
            currentPin = pin;
        }
        session.setOperators(existing === undefined ? [...operators, operator] : operators.map((item) => item.id === operator.id ? operator : item));
        return profiles();
    });

    router.register('operators.delete', (params) => {
        requireManager();
        const id = requireString(requireObject(params), 'id');
        const operators = session.operators();
        // A show always keeps its operators: the one who entered, an administrator, stays
        if (id === currentId) {
            throw new EngineError('operator-in-use', 'The operator who entered cannot be deleted');
        }
        session.setOperators(operators.filter((operator) => operator.id !== id));
        return profiles();
    });

    return {
        current: () => {
            const operator = current();
            return operator === undefined || currentPin === null ? null : { operator, pin: currentPin };
        },
        signIn: (id, pin) => {
            currentId = id;
            currentPin = pin;
            changed();
        }
    };
}
