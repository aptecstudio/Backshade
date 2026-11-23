/**
 * Application paths, computed from the root folder of the app
 * (the one containing package.json), so they do not depend on the location
 * of the compiled files.
 */

import path from 'node:path';
import { app } from 'electron';

const appRoot = app.getAppPath();

/** Folder with the compiled interface, served by the app:// protocol */
export const WEB_ROOT = path.join(appRoot, 'dist', 'web');

/** Compiled preload script */
export const PRELOAD_FILE = path.join(appRoot, 'dist', 'node', 'preload', 'preload.js');

/** Window icon */
export const ICON_FILE = path.join(appRoot, 'build', 'icon.png');

/** Language packs included in the application */
export const BUNDLED_LOCALES_DIR = path.join(WEB_ROOT, 'locales');

/** Language packs installed by the user, in the user data folder */
export const USER_LOCALES_DIR = path.join(app.getPath('userData'), 'locales');

/** Show templates included in the application */
export const BUNDLED_TEMPLATES_DIR = path.join(appRoot, 'templates');

/** Show templates created by the user */
export const USER_TEMPLATES_DIR = path.join(app.getPath('userData'), 'templates');
