/**
 * Hash of the operator PINs: scrypt with a random salt, so show.json
 * never contains a PIN in clear.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 32;

/** Salt and hash of a new PIN */
export function hashPin(pin: string): { pinSalt: string; pinHash: string } {
    const salt = randomBytes(16);
    return { pinSalt: salt.toString('hex'), pinHash: scryptSync(pin, salt, KEY_LENGTH).toString('hex') };
}

/** The PIN matches the saved hash */
export function matchesPin(pin: string, saved: { pinSalt: string; pinHash: string }): boolean {
    const expected = Buffer.from(saved.pinHash, 'hex');
    if (expected.length !== KEY_LENGTH) {
        return false;
    }
    const actual = scryptSync(pin, Buffer.from(saved.pinSalt, 'hex'), KEY_LENGTH);
    return timingSafeEqual(actual, expected);
}
