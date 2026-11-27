/**
 * A client that opens, creates, imports or closes a show leaves the instance
 * without an operator. It stays connected, waiting: it can use the start
 * page and the PIN keypad of the new show, and enters again with the PIN of
 * one of its operators, which becomes the operator of the instance. Waiting
 * ends after a while, after too many wrong PINs, or when someone else enters.
 */

import type { EngineMethod } from '../../shared/transport/engine-api';

/** Time a client may wait for an operator */
export const WAIT_MS = 5 * 60 * 1000;
/** Wrong PINs after which a waiting client is disconnected */
export const WAIT_ATTEMPTS = 5;

/** Requests that leave the instance without its operator: the client keeps its place */
export const SHOW_CHANGES: ReadonlySet<string> = new Set<EngineMethod>(['show.open', 'show.create', 'show.import', 'show.close']);

/** Requests of an operator entering: the session follows it */
export const ENTRIES: ReadonlySet<string> = new Set<EngineMethod>(['operators.login', 'operators.save', 'show.create']);

/** What a waiting client can ask, on top of the permissions checked by the engine */
export const WAITING_METHODS: ReadonlySet<string> = new Set<EngineMethod>([
    'app.getInfo',
    'operators.getState',
    'operators.login',
    'operators.save',
    'show.getCurrent',
    'show.open',
    'show.create',
    'show.import',
    'show.close',
    'show.recover',
    'show.discardRecovery',
    'recent.list',
    'settings.get',
    'template.list',
    'output.getState',
    'fs.roots',
    'fs.list'
]);
