/**
 * Sessions of the remote clients. A client enters with the PIN of the
 * operator entered on this instance and acts as that operator: the session
 * lasts only while that operator, with that PIN, stays entered. Wrong PINs
 * lock the address that typed them, and many of them lock every address.
 */

import { randomBytes } from 'node:crypto';
import { isValidPin } from '../../shared/show/operators';
import { matchesPin } from '../operators/operator-pin';
import type { OperatorSessionInfo } from '../services/operator-service';

const MAX_SESSIONS = 64;
// Wrong PINs before an address, and before every address, is locked
const ADDRESS_ATTEMPTS = 5;
const TOTAL_ATTEMPTS = 30;
const LOCK_MS = 5 * 60 * 1000;
const WRONG_PIN_DELAY_MS = 600;

/** Why entering failed */
export type LoginError = 'no-operator' | 'wrong-pin' | 'pin-locked';

/** Result of a login: the session token, or why it failed */
export type LoginResult = { token: string } | { error: LoginError };

export class RemoteAuth {
    private readonly operators: OperatorSessionInfo;
    private readonly sessions = new Map<string, { operatorId: string; pinHash: string }>();
    private readonly failures = new Map<string, number>();
    private totalFailures = 0;
    private readonly locked = new Map<string, number>();
    private totalLockedUntil = 0;

    constructor(operators: OperatorSessionInfo) {
        this.operators = operators;
    }

    /** An operator is entered on the instance: remote clients may enter */
    get open(): boolean {
        return this.operators.current() !== null;
    }

    async login(address: string, pin: unknown): Promise<LoginResult> {
        const now = Date.now();
        if (now < this.totalLockedUntil || now < (this.locked.get(address) ?? 0)) {
            return { error: 'pin-locked' };
        }
        const current = this.operators.current();
        if (current === null) {
            return { error: 'no-operator' };
        }
        if (!isValidPin(pin) || !matchesPin(pin, current.operator)) {
            this.fail(address);
            await new Promise((resolve) => setTimeout(resolve, WRONG_PIN_DELAY_MS));
            return { error: 'wrong-pin' };
        }
        this.failures.delete(address);
        this.purge();
        if (this.sessions.size >= MAX_SESSIONS) {
            this.sessions.delete(this.sessions.keys().next().value as string);
        }
        const token = randomBytes(32).toString('hex');
        this.sessions.set(token, { operatorId: current.operator.id, pinHash: current.operator.pinHash });
        return { token };
    }

    /** The session belongs to the operator entered now */
    isValid(token: string | null): boolean {
        const session = token === null ? undefined : this.sessions.get(token);
        const current = this.operators.current();
        return session !== undefined && current !== null
            && current.operator.id === session.operatorId && current.operator.pinHash === session.pinHash;
    }

    logout(token: string): void {
        this.sessions.delete(token);
    }

    /** Forgets the sessions of operators no longer entered */
    private purge(): void {
        for (const token of [...this.sessions.keys()]) {
            if (!this.isValid(token)) {
                this.sessions.delete(token);
            }
        }
    }

    private fail(address: string): void {
        const count = (this.failures.get(address) ?? 0) + 1;
        this.failures.set(address, count);
        this.totalFailures += 1;
        if (count >= ADDRESS_ATTEMPTS) {
            this.failures.delete(address);
            this.locked.set(address, Date.now() + LOCK_MS);
        }
        if (this.totalFailures >= TOTAL_ATTEMPTS) {
            this.totalFailures = 0;
            this.totalLockedUntil = Date.now() + LOCK_MS;
        }
    }
}
