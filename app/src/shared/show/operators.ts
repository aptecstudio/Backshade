/**
 * Operators of a show: each operator enters with a 4 digit PIN and sees
 * the working sections of the profile, hidden, read only or editable.
 * Administrators can edit everything and manage the operators. Every show
 * has operators: older shows without them ask for the administrator first.
 */

/** Working sections an operator profile controls */
export const OPERATOR_SECTIONS = ['console', 'virtualConsole', 'timeline', 'patch', 'matrices', 'audio', 'video', 'output', 'media', 'stage'] as const;

export type OperatorSection = typeof OPERATOR_SECTIONS[number];

/** Access to a section: hidden, read only (it can be seen and played) or editable */
export const SECTION_ACCESS = ['hidden', 'view', 'edit'] as const;

export type SectionAccess = typeof SECTION_ACCESS[number];

/** Access of an operator to every working section */
export type OperatorAccess = Record<OperatorSection, SectionAccess>;

/** Digits of a PIN */
export const PIN_LENGTH = 4;

/** Maximum length of an operator name */
export const OPERATOR_NAME_LENGTH = 40;

/** Operator as saved in show.json: the PIN is kept only as a salted hash */
export interface ShowOperator {
    id: string;
    name: string;
    admin: boolean;
    access: OperatorAccess;
    /** Random salt of the PIN hash, hexadecimal */
    pinSalt: string;
    /** Hash of the PIN, hexadecimal */
    pinHash: string;
}

/** Operator as the interface sees it, without the PIN */
export interface OperatorProfile {
    id: string;
    name: string;
    admin: boolean;
    access: OperatorAccess;
}

/** Operator state of the open show */
export interface OperatorState {
    /** Identifier of the open show, null without a show */
    showId: string | null;
    /** The show has operators; false until the administrator of an older show is created */
    required: boolean;
    /** Operator who entered, null when nobody entered */
    operator: OperatorProfile | null;
}

/** A PIN is valid: exactly 4 digits */
export function isValidPin(pin: unknown): pin is string {
    return typeof pin === 'string' && new RegExp(`^[0-9]{${PIN_LENGTH}}$`).test(pin);
}

/** Access with the same level for every section */
export function uniformAccess(level: SectionAccess): OperatorAccess {
    return Object.fromEntries(OPERATOR_SECTIONS.map((section) => [section, level])) as OperatorAccess;
}

/** Access that applies to an operator: administrators edit everything */
export function effectiveAccess(operator: Pick<OperatorProfile, 'admin' | 'access'>): OperatorAccess {
    return operator.admin ? uniformAccess('edit') : operator.access;
}

/** Checks the access read from a file; missing sections are hidden */
export function normalizeAccess(value: unknown): OperatorAccess {
    const input = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    const access = uniformAccess('hidden');
    for (const section of OPERATOR_SECTIONS) {
        const level = input[section];
        if (SECTION_ACCESS.includes(level as SectionAccess)) {
            access[section] = level as SectionAccess;
        }
    }
    return access;
}

/** Checks the operators read from show.json; invalid entries are dropped */
export function normalizeOperators(value: unknown): ShowOperator[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const operators: ShowOperator[] = [];
    for (const item of value as unknown[]) {
        if (typeof item !== 'object' || item === null) {
            continue;
        }
        const input = item as Partial<ShowOperator>;
        if (typeof input.id !== 'string' || typeof input.name !== 'string' || typeof input.pinSalt !== 'string' || typeof input.pinHash !== 'string') {
            continue;
        }
        operators.push({
            id: input.id,
            name: input.name.slice(0, OPERATOR_NAME_LENGTH),
            admin: input.admin === true,
            access: normalizeAccess(input.access),
            pinSalt: input.pinSalt,
            pinHash: input.pinHash
        });
    }
    // A list without administrators could never be managed again: the first operator becomes one
    if (operators.length > 0 && !operators.some((operator) => operator.admin)) {
        operators[0] = { ...operators[0], admin: true };
    }
    return operators;
}

/** Profile of an operator, without the PIN */
export function operatorProfile(operator: ShowOperator): OperatorProfile {
    return { id: operator.id, name: operator.name, admin: operator.admin, access: operator.access };
}
