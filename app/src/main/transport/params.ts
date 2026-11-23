/**
 * Validation of request parameters, which can come from remote
 * clients: every method checks its own parameters with these functions.
 */

import { EngineError } from './engine-error';

/**
 * Returns the parameters as an object, or an error if they are not one.
 */
export function requireObject(params: unknown): Record<string, unknown> {
    if (typeof params !== 'object' || params === null || Array.isArray(params)) {
        throw new EngineError('invalid-params', 'Missing or invalid parameters');
    }
    return params as Record<string, unknown>;
}

/**
 * Returns a required text field.
 */
export function requireString(params: Record<string, unknown>, field: string): string {
    const value = params[field];
    if (typeof value !== 'string') {
        throw new EngineError('invalid-params', `Missing or invalid field "${field}"`);
    }
    return value;
}

/**
 * Returns an optional text field.
 */
export function optionalString(params: Record<string, unknown>, field: string): string | undefined {
    const value = params[field];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}

/**
 * Returns an optional boolean field.
 */
export function optionalBoolean(params: Record<string, unknown>, field: string): boolean | undefined {
    const value = params[field];
    if (value === undefined) {
        return undefined;
    }
    if (typeof value !== 'boolean') {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value;
}
