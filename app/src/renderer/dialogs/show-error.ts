/**
 * Error messages for the user: translates the codes returned by the engine.
 */

import { t, type TextKey } from '../i18n/i18n.js';
import { EngineRequestError } from '../transport/engine-client.js';
import { askChoice } from './ask-choice.js';

// Engine codes with a dedicated message (code -> text key)
const MESSAGES: Record<string, TextKey> = {
    'unsaved-changes': 'errors.unsavedChanges',
    'invalid-name': 'errors.invalidName',
    'show-not-found': 'errors.showNotFound',
    'invalid-show': 'errors.invalidShow',
    'newer-show-format': 'errors.newerShowFormat',
    'template-not-found': 'errors.templateNotFound',
    'template-read-only': 'errors.templateReadOnly',
    'no-show': 'errors.noShow',
    'desktop-only': 'errors.desktopOnly',
    'no-recovery': 'errors.noRecovery',
    'invalid-archive': 'errors.invalidArchive',
    'wrong-archive-kind': 'errors.wrongArchiveKind',
    'media-not-found': 'errors.mediaNotFound',
    'invalid-media-path': 'errors.invalidMediaPath',
    'fixture-not-found': 'errors.fixtureNotFound',
    'fixture-exists': 'errors.fixtureExists',
    'fixture-read-only': 'errors.fixtureReadOnly',
    'invalid-fixture': 'errors.invalidFixture',
    'mode-not-found': 'errors.modeNotFound',
    'address-conflict': 'errors.addressConflict',
    'address-out-of-range': 'errors.addressOutOfRange',
    'invalid-universe': 'errors.invalidUniverse',
    'invalid-fixture-number': 'errors.invalidFixtureNumber',
    'fixture-number-in-use': 'errors.fixtureNumberInUse',
    'patch-fixture-not-found': 'errors.patchFixtureNotFound',
    'invalid-ip-address': 'errors.invalidIpAddress',
    'operator-required': 'errors.operatorRequired',
    'operator-not-allowed': 'errors.operatorNotAllowed',
    'wrong-pin': 'errors.wrongPin',
    'pin-locked': 'errors.pinLocked',
    'invalid-pin': 'errors.invalidPin',
    'pin-in-use': 'errors.pinInUse',
    'last-admin': 'errors.lastAdmin',
    'operator-in-use': 'errors.operatorInUse',
    'operator-not-found': 'errors.operatorNotFound',
    'file-not-found': 'errors.fileNotFound',
    'file-not-allowed': 'errors.fileNotAllowed',
    'file-protected': 'errors.fileProtected',
    'file-exists': 'errors.fileExists',
    'copy-into-itself': 'errors.copyIntoItself',
    'trash-failed': 'errors.trashFailed',
    'same-show': 'errors.sameShow',
    'source-pin-required': 'errors.sourcePinRequired'
};

/**
 * Returns the user message of an error.
 */
export function errorMessage(error: unknown): string {
    if (error instanceof EngineRequestError && Object.hasOwn(MESSAGES, error.code)) {
        return t(MESSAGES[error.code]);
    }
    return t('errors.generic');
}

/**
 * Shows an error to the user and logs it in the console.
 */
export async function showError(error: unknown): Promise<void> {
    console.error(error);
    await askChoice(t('errors.title'), errorMessage(error), [{ id: 'ok', label: t('common.ok'), primary: true }]);
}
