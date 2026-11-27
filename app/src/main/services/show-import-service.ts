/**
 * Import from another show into the open show (administrators only). A
 * source show with operators asks for the PIN of one of its
 * administrators, unless the administrator who entered the open show is
 * one of them: same name and same PIN.
 */

import fs from 'node:fs';
import path from 'node:path';
import { CONFLICT_RESOLUTIONS, type ConflictResolution, withRequirements } from '../../shared/show/show-import';
import { matchesPin } from '../operators/operator-pin';
import { buildCatalog, type ImportShow } from '../show-import/import-catalog';
import { planImport } from '../show-import/import-apply';
import { isShowFolder, readShow } from '../shows/show-files';
import type { ShowSession } from '../shows/show-session';
import { EngineError } from '../transport/engine-error';
import type { EventBus } from '../transport/event-bus';
import { optionalString, requireObject, requireString } from '../transport/params';
import type { RequestRouter } from '../transport/request-router';
import type { OperatorSessionInfo } from './operator-service';

// Wait after a wrong PIN of the source, so that PINs cannot be tried quickly
const WRONG_PIN_DELAY_MS = 400;

export function registerShowImportService(router: RequestRouter, bus: EventBus, session: ShowSession, operators: OperatorSessionInfo): void {
    const target = (): ImportShow => {
        if (session.summary() === null) {
            throw new EngineError('no-show', 'No show is open');
        }
        return session.snapshot();
    };

    /** Reads the source show and checks the access to it */
    const openSource = async (input: Record<string, unknown>): Promise<ImportShow> => {
        const folder = path.resolve(requireString(input, 'folder'));
        if (folder === path.resolve(target().folder)) {
            throw new EngineError('same-show', 'The source is the open show');
        }
        if (!isShowFolder(folder)) {
            throw new EngineError('show-not-found', `Show not found: ${folder}`);
        }
        const document = readShow(folder);
        const admins = document.operators.filter((operator) => operator.admin);
        if (document.operators.length === 0) {
            return { folder, document };
        }
        const me = operators.current();
        if (me !== null && me.operator.admin
            && admins.some((admin) => admin.name.toLowerCase() === me.operator.name.toLowerCase() && matchesPin(me.pin, admin))) {
            return { folder, document };
        }
        const pin = optionalString(input, 'pin');
        if (pin === undefined) {
            throw new EngineError('source-pin-required', 'The PIN of an administrator of the source show is needed');
        }
        if (!admins.some((admin) => matchesPin(pin, admin))) {
            await new Promise((resolve) => setTimeout(resolve, WRONG_PIN_DELAY_MS));
            throw new EngineError('wrong-pin', 'Wrong PIN');
        }
        return { folder, document };
    };

    router.register('showImport.inspect', async (params) => {
        const source = await openSource(requireObject(params));
        return buildCatalog(source, target(), operators.current()?.operator.id ?? null);
    });

    router.register('showImport.apply', async (params) => {
        const input = requireObject(params);
        const source = await openSource(input);
        if (!Array.isArray(input.items)) {
            throw new EngineError('invalid-params', 'Invalid field "items"');
        }
        const resolutions = new Map<string, ConflictResolution>();
        for (const entry of input.items as unknown[]) {
            const choice = requireObject(entry);
            const resolution = requireString(choice, 'resolution');
            if (!CONFLICT_RESOLUTIONS.includes(resolution as ConflictResolution)) {
                throw new EngineError('invalid-params', 'Invalid field "resolution"');
            }
            resolutions.set(requireString(choice, 'key'), resolution as ConflictResolution);
        }
        const show = target();
        const catalog = buildCatalog(source, show, operators.current()?.operator.id ?? null);
        const plan = planImport(source, show, catalog, withRequirements(catalog.items, resolutions.keys()), resolutions);

        for (const copy of plan.copies) {
            fs.mkdirSync(path.dirname(copy.to), { recursive: true });
            fs.copyFileSync(copy.from, copy.to);
        }
        if (plan.copies.length > 0) {
            bus.emit('media.changed', {});
        }
        if (plan.patch !== null) {
            session.setPatch(plan.patch);
        }
        if (plan.audio !== null) {
            session.setAudio(plan.audio);
        }
        if (plan.video !== null) {
            session.setVideo(plan.video);
        }
        if (plan.memories !== null) {
            session.setMemories(plan.memories);
        }
        if (plan.operators !== null) {
            session.setOperators(plan.operators);
        }
        return plan.result;
    });
}
