/**
 * Library of fixture definitions: the definitions included in the
 * application (read-only), those of the personal library of the user, in the
 * user data folder, and those of the open show, in its fixtures/ folder.
 * With the same identifier, the show comes before the personal library,
 * which comes before the included ones. What the user imports or saves goes
 * into the show, and into the personal library only when asked.
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

/** Folder of the definitions inside a show */
export const SHOW_FIXTURES_FOLDER = 'fixtures';

/** File of a definition inside a library folder or a show */
export const definitionFile = (directory: string, id: string): string => path.join(directory, ...`${id}.json`.split('/'));

/** Extension of the definition files */
export const FIXTURE_FILE_EXTENSION = 'json';

/** Definition found on disk */
export interface FixtureRecord {
    id: string;
    source: 'bundled' | 'user' | 'show';
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
    /** Show folder the records were read with */
    private loadedShow: string | null = null;

    /**
     * @param showFolder - Folder of the open show, null without one
     */
    constructor(private readonly showFolder: () => string | null = () => null) {}

    /**
     * Scans the folders again, for example after files were added by hand.
     */
    reload(): void {
        const records = new Map<string, FixtureRecord>();
        this.bundledIds.clear();
        this.loadedShow = this.showFolder();
        const folders = [
            ['bundled', BUNDLED_FIXTURES_DIR],
            ['user', USER_FIXTURES_DIR],
            ...(this.loadedShow === null ? [] : [['show', path.join(this.loadedShow, SHOW_FIXTURES_FOLDER)]])
        ] as Array<[FixtureRecord['source'], string]>;
        for (const [source, directory] of folders) {
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
                } else if (records.get(id)?.source === source) {
                    console.warn(`Fixture definition ignored, duplicate identifier ${id}: ${file}`);
                    continue;
                }
                records.set(id, { id, source, replacesBundled: source !== 'bundled' && this.bundledIds.has(id), file, definition });
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
     * Saves a definition into the show, and into the personal library when
     * asked or without a show. With previousId, it replaces the definition it
     * was edited from, also when its identifier changes.
     * @throws EngineError "invalid-fixture" or "fixture-exists"
     */
    save(data: unknown, previousId: string | undefined, toLibrary: boolean): FixtureRecord {
        const result = validateFixture(data);
        if (!result.ok) {
            throw invalidFixtureError(result.issues, 'from the editor');
        }
        const id = fixtureId(result.definition.manufacturer, result.definition.model);
        const directories = this.targets(toLibrary);
        if (id !== previousId && directories.some((directory) => fs.existsSync(definitionFile(directory, id)))) {
            throw new EngineError('fixture-exists', `A fixture definition already exists: ${id}`);
        }
        for (const directory of directories) {
            if (previousId !== undefined && previousId !== id) {
                fs.rmSync(definitionFile(directory, previousId), { force: true });
            }
            writeJsonFileAtomic(definitionFile(directory, id), result.definition);
        }
        this.reload();
        return this.require(id);
    }

    /**
     * Deletes a definition where it is used from (the show or the personal
     * library); one it was covering becomes visible again.
     * @throws EngineError "fixture-read-only" for included definitions
     */
    delete(id: string): void {
        const record = this.require(id);
        if (record.source === 'bundled') {
            throw new EngineError('fixture-read-only', 'Included fixture definitions cannot be changed');
        }
        fs.rmSync(record.file, { force: true });
        this.reload();
    }

    /**
     * Copies definition files into the show, and into the personal library
     * when asked or without a show, replacing definitions with the same
     * identifier. All the files are checked first: if one is invalid, nothing
     * is imported.
     * @returns The identifiers of the imported definitions
     */
    importFiles(files: readonly string[], toLibrary: boolean): string[] {
        const definitions = files.map(readFixtureFile);
        const directories = this.targets(toLibrary);
        const ids = definitions.map((definition) => {
            const id = fixtureId(definition.manufacturer, definition.model);
            for (const directory of directories) {
                writeJsonFileAtomic(definitionFile(directory, id), definition);
            }
            return id;
        });
        this.reload();
        return ids;
    }

    /**
     * Copies into the show the definitions it uses from the personal library,
     * so that it carries them to other computers.
     */
    keepInShow(ids: Iterable<string>): void {
        const show = this.showFolder();
        let copied = false;
        for (const id of new Set(ids)) {
            const record = this.find(id);
            if (show !== null && record?.source === 'user') {
                writeJsonFileAtomic(definitionFile(path.join(show, SHOW_FIXTURES_FOLDER), id), record.definition);
                copied = true;
            }
        }
        if (copied) {
            this.reload();
        }
    }

    /** Folders what is saved or imported goes to */
    private targets(toLibrary: boolean): string[] {
        const show = this.showFolder();
        return [
            ...(show === null ? [] : [path.join(show, SHOW_FIXTURES_FOLDER)]),
            ...(toLibrary || show === null ? [USER_FIXTURES_DIR] : [])
        ];
    }

    private all(): Map<string, FixtureRecord> {
        // Another show has other definitions
        if (this.records === null || this.loadedShow !== this.showFolder()) {
            this.reload();
        }
        return this.records as Map<string, FixtureRecord>;
    }
}
