/**
 * Library of fixture definitions: the definitions included in the
 * application (read-only) and those created or imported by the user,
 * in the user data folder. A user definition with the same identifier
 * as an included one replaces it, like the language packs.
 *
 * Files are "<manufacturer>/<model>.json"; the identifier comes from the
 * manufacturer and model written in the file. Invalid files are ignored
 * with a console warning.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { FixtureDefinition } from '../../shared/fixtures/fixture-definition';
import { fixtureId } from '../../shared/fixtures/fixture-id';
import { validateFixture, type FixtureIssue } from '../../shared/fixtures/validate-fixture';
import type { FixtureSummary } from '../../shared/transport/engine-api';
import { BUNDLED_FIXTURES_DIR, USER_FIXTURES_DIR } from '../paths';
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-file';
import { EngineError } from '../transport/engine-error';

/** Extension of the definition files */
export const FIXTURE_FILE_EXTENSION = 'json';

/** Definition found on disk */
export interface FixtureRecord {
    id: string;
    source: 'bundled' | 'user';
    replacesBundled: boolean;
    file: string;
    definition: FixtureDefinition;
}

/**
 * Error with the problems of an invalid definition.
 */
export function invalidFixtureError(issues: readonly FixtureIssue[], origin: string): EngineError {
    const detail = issues.map((issue) => issue.subject === undefined ? issue.code : `${issue.code} (${issue.subject})`).join(', ');
    return new EngineError('invalid-fixture', `Invalid fixture definition ${origin}: ${detail}`);
}

/**
 * Reads and validates a definition file.
 * @throws EngineError "invalid-fixture"
 */
export function readFixtureFile(file: string): FixtureDefinition {
    let data: unknown;
    try {
        data = readJsonFile(file);
    } catch {
        throw new EngineError('invalid-fixture', `Unreadable fixture definition: ${file}`);
    }
    const result = validateFixture(data);
    if (!result.ok) {
        throw invalidFixtureError(result.issues, file);
    }
    return result.definition;
}

/**
 * Definition files of a library folder.
 */
function definitionFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) {
        return [];
    }
    return fs.readdirSync(directory, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(`.${FIXTURE_FILE_EXTENSION}`))
        .map((entry) => path.join(entry.parentPath, entry.name))
        .sort();
}

/**
 * Library summary of a record.
 */
export function toSummary(record: FixtureRecord): FixtureSummary {
    const { definition } = record;
    return {
        id: record.id,
        manufacturer: definition.manufacturer,
        model: definition.model,
        category: definition.category,
        source: record.source,
        replacesBundled: record.replacesBundled,
        modes: definition.modes.map((mode) => ({ name: mode.name, channelCount: mode.channels.length }))
    };
}

export class FixtureLibrary {
    private records: Map<string, FixtureRecord> | null = null;
    private readonly bundledIds = new Set<string>();

    /**
     * Scans the folders again, for example after files were added by hand.
     */
    reload(): void {
        const records = new Map<string, FixtureRecord>();
        this.bundledIds.clear();
        for (const [source, directory] of [['bundled', BUNDLED_FIXTURES_DIR], ['user', USER_FIXTURES_DIR]] as const) {
            for (const file of definitionFiles(directory)) {
                let definition: FixtureDefinition;
                try {
                    definition = readFixtureFile(file);
                } catch (error) {
                    console.warn('Fixture definition ignored', error instanceof Error ? error.message : error);
                    continue;
                }
                const id = fixtureId(definition.manufacturer, definition.model);
                if (source === 'bundled') {
                    this.bundledIds.add(id);
                } else if (records.get(id)?.source === 'user') {
                    console.warn(`Fixture definition ignored, duplicate identifier ${id}: ${file}`);
                    continue;
                }
                records.set(id, { id, source, replacesBundled: source === 'user' && this.bundledIds.has(id), file, definition });
            }
        }
        this.records = records;
    }

    /**
     * All the definitions, sorted by manufacturer and model.
     */
    list(): FixtureRecord[] {
        this.reload();
        return [...this.all().values()].sort((a, b) =>
            a.definition.manufacturer.localeCompare(b.definition.manufacturer)
            || a.definition.model.localeCompare(b.definition.model));
    }

    /**
     * Definition with an identifier, or undefined.
     */
    find(id: string): FixtureRecord | undefined {
        return this.all().get(id);
    }

    /**
     * Definition with an identifier.
     * @throws EngineError "fixture-not-found"
     */
    require(id: string): FixtureRecord {
        const record = this.find(id);
        if (record === undefined) {
            throw new EngineError('fixture-not-found', `Fixture definition not found: ${id}`);
        }
        return record;
    }

    /**
     * Saves a user definition. With previousId, the definition replaces
     * the user definition it was edited from, also when its identifier changes.
     * @throws EngineError "invalid-fixture" or "fixture-exists"
     */
    saveUser(data: unknown, previousId?: string): FixtureRecord {
        const result = validateFixture(data);
        if (!result.ok) {
            throw invalidFixtureError(result.issues, 'from the editor');
        }
        const id = fixtureId(result.definition.manufacturer, result.definition.model);
        const existing = this.find(id);
        if (existing !== undefined && existing.source === 'user' && id !== previousId) {
            throw new EngineError('fixture-exists', `A user fixture definition already exists: ${id}`);
        }
        const previous = previousId === undefined ? undefined : this.find(previousId);
        if (previous !== undefined && previous.source === 'user' && previous.id !== id) {
            fs.rmSync(previous.file, { force: true });
        }
        writeJsonFileAtomic(this.userFile(id), result.definition);
        this.reload();
        return this.require(id);
    }

    /**
     * Deletes a user definition; an included definition it replaced becomes visible again.
     * @throws EngineError "fixture-read-only" for included definitions
     */
    deleteUser(id: string): void {
        const record = this.require(id);
        if (record.source !== 'user') {
            throw new EngineError('fixture-read-only', 'Included fixture definitions cannot be changed');
        }
        fs.rmSync(record.file, { force: true });
        this.reload();
    }

    /**
     * Copies definition files into the user library, replacing user
     * definitions with the same identifier. All the files are checked first:
     * if one is invalid, nothing is imported.
     * @returns The identifiers of the imported definitions
     */
    importFiles(files: readonly string[]): string[] {
        const definitions = files.map(readFixtureFile);
        const ids = definitions.map((definition) => {
            const id = fixtureId(definition.manufacturer, definition.model);
            writeJsonFileAtomic(this.userFile(id), definition);
            return id;
        });
        this.reload();
        return ids;
    }

    private all(): Map<string, FixtureRecord> {
        if (this.records === null) {
            this.reload();
        }
        return this.records as Map<string, FixtureRecord>;
    }

    private userFile(id: string): string {
        return path.join(USER_FIXTURES_DIR, ...`${id}.${FIXTURE_FILE_EXTENSION}`.split('/'));
    }
}
