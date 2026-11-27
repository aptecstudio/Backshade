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
 * Returns a required boolean field.
 */
export function requireBoolean(params: Record<string, unknown>, field: string): boolean {
    const value = optionalBoolean(params, field);
    if (value === undefined) {
        throw new EngineError('invalid-params', `Missing field "${field}"`);
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

/**
 * Returns a required integer field.
 */
export function requireInteger(params: Record<string, unknown>, field: string): number {
    const value = params[field];
    if (!Number.isInteger(value)) {
        throw new EngineError('invalid-params', `Missing or invalid field "${field}"`);
    }
    return value as number;
}

/**
 * Returns an optional integer field.
 */
export function optionalInteger(params: Record<string, unknown>, field: string): number | undefined {
    return params[field] === undefined ? undefined : requireInteger(params, field);
}

/**
 * Returns a required list of texts.
 */
export function requireStringArray(params: Record<string, unknown>, field: string): string[] {
    const value = params[field];
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
        throw new EngineError('invalid-params', `Missing or invalid field "${field}"`);
    }
    return value as string[];
}

/**
 * Returns a required text field that must be one of the given values.
 */
export function requireChoice<T extends string>(params: Record<string, unknown>, field: string, choices: readonly T[]): T {
    const value = requireString(params, field);
    if (!choices.includes(value as T)) {
        throw new EngineError('invalid-params', `Invalid field "${field}"`);
    }
    return value as T;
}

/**
 * Returns a required integer field within limits.
 * @param code - Error code when the value is out of the limits
 */
export function requireRange(params: Record<string, unknown>, field: string, min: number, max: number, code = 'invalid-params'): number {
    const value = requireInteger(params, field);
    if (value < min || value > max) {
        throw new EngineError(code, `Invalid field "${field}"`);
    }
    return value;
}

/**
 * Returns a required finite number field.
 */
export function requireNumber(params: Record<string, unknown>, field: string): number {
    const value = params[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new EngineError('invalid-params', `Missing or invalid field "${field}"`);
    }
    return value;
}
