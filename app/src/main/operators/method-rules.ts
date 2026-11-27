/**
 * What every engine method needs from the operator of a show with
 * operators. Methods not listed only read the show: any operator who
 * entered can call them.
 */

import type { OperatorSection } from '../../shared/show/operators';
import type { EngineMethod } from '../../shared/transport/engine-api';

/**
 * Rule of a method:
 * - free: allowed also before entering the PIN (application, windows, opening and closing shows);
 * - play: plays the show; allowed when one of the sections is shown (no sections: any operator);
 * - edit: changes the show; needs the section editable;
 * - admin: only administrators.
 */
export type MethodRule =
    | { kind: 'free' }
    | { kind: 'play'; sections: readonly OperatorSection[] }
    | { kind: 'edit'; section: OperatorSection }
    | { kind: 'admin' };

const FREE: MethodRule = { kind: 'free' };
const ADMIN: MethodRule = { kind: 'admin' };

function play(...sections: OperatorSection[]): MethodRule {
    return { kind: 'play', sections };
}

function edit(section: OperatorSection): MethodRule {
    return { kind: 'edit', section };
}

const DESK = ['console', 'virtualConsole'] as const;

export const METHOD_RULES: Partial<Record<EngineMethod, MethodRule>> = {
    'app.getInfo': FREE,
    'remote.getInfo': FREE,
    'app.confirmClose': FREE,
    'window.openAbout': FREE,
    'window.isFullScreen': FREE,
    'window.toggleFullScreen': FREE,
    // Browsing and new folders are needed to choose where to open, save and import
    'fs.roots': FREE,
    'fs.list': FREE,
    'fs.createFolder': FREE,
    'fs.rename': ADMIN,
    'fs.copy': ADMIN,
    'fs.move': ADMIN,
    'fs.trash': ADMIN,
    'fs.delete': ADMIN,
    'show.getCurrent': FREE,
    'show.create': FREE,
    'show.open': FREE,
    'show.save': FREE,
    'show.close': FREE,
    'show.import': FREE,
    'show.recover': FREE,
    'show.discardRecovery': FREE,
    'recent.list': FREE,
    'recent.remove': FREE,
    'template.list': FREE,
    'template.update': FREE,
    'template.delete': FREE,
    'template.export': FREE,
    'template.import': FREE,
    'settings.get': FREE,
    'settings.update': FREE,
    'output.getState': FREE,
    'output.listInterfaces': FREE,
    'timeline.getState': FREE,
    'memories.getState': FREE,
    'operators.getState': FREE,
    'operators.login': FREE,
    'operators.logout': FREE,
    'operators.list': FREE,
    'operators.save': FREE,
    'operators.delete': FREE,

    'show.rename': ADMIN,
    'show.updateSettings': ADMIN,
    'template.saveCurrent': ADMIN,
    'showImport.inspect': ADMIN,
    'showImport.apply': ADMIN,

    'output.setGrandMaster': play(),
    'output.setBlackout': play(),
    'console.setFader': play('console'),
    'console.setFlash': play('console'),
    'console.setMode': play('console'),
    'console.setBank': play('console'),
    'console.setBlind': play('console'),
    'console.home': play('console'),
    'console.setAttributes': play('console'),
    'console.setMaster': play(...DESK),
    'console.setFullOn': play(...DESK),
    'console.setGroupLevel': play(...DESK),
    'console.flashGroup': play(...DESK),
    'memories.setBpm': play(...DESK),
    'memories.setActive': play(...DESK),
    'memories.setLevel': play(...DESK),
    'memories.selectChaser': play(...DESK),
    'memories.releaseAll': play(...DESK),
    'cues.go': play(...DESK),
    'cues.back': play(...DESK),
    'cues.pause': play(...DESK),
    'cues.release': play(...DESK),
    'cues.setNext': play(...DESK),
    'matrices.setLive': play('matrices'),
    'audio.setPlayer': play('audio', 'virtualConsole'),
    'audio.play': play('audio', 'virtualConsole'),
    'audio.stop': play('audio', 'virtualConsole'),
    'audio.pause': play('audio', 'virtualConsole'),
    'audio.next': play('audio', 'virtualConsole'),
    'audio.previous': play('audio', 'virtualConsole'),
    'video.setLayer': play('video', 'virtualConsole'),
    'video.moveLayer': play('video', 'virtualConsole'),
    'video.take': play('video', 'virtualConsole'),
    'video.timerCommand': play('video', 'virtualConsole'),
    'timeline.load': play('timeline', 'virtualConsole'),
    'timeline.transport': play('timeline', 'virtualConsole'),
    'timeline.setOptions': play('timeline'),
    'mixers.recall': play('output', 'console', 'virtualConsole', 'timeline'),

    'patch.add': edit('patch'),
    'patch.update': edit('patch'),
    'patch.remove': edit('patch'),
    'patch.addMatrix': edit('patch'),
    'patch.updateMatrix': edit('patch'),
    'patch.saveGroup': edit('patch'),
    'patch.deleteGroup': edit('patch'),
    'fixtures.save': edit('patch'),
    'fixtures.delete': edit('patch'),
    'fixtures.import': edit('patch'),
    'output.setWorkstation': edit('output'),
    'output.setFrameRate': edit('output'),
    'output.updateUniverse': edit('output'),
    'output.resetUniverse': edit('output'),
    'output.setUsbDevice': edit('output'),
    'output.removeUsbDevice': edit('output'),
    'mixers.save': edit('output'),
    'midi.setLearn': ADMIN,
    'midi.choose': ADMIN,
    'midi.deleteMapping': ADMIN,
    'midi.clearMappings': ADMIN,
    'midi.updateMapping': ADMIN,
    'midi.setMsc': ADMIN,
    'midi.addMappings': ADMIN,
    'midi.setMtc': ADMIN,
    'mixers.delete': edit('output'),
    'memories.recordScene': edit('console'),
    'memories.updateScene': edit('console'),
    'memories.deleteScene': edit('console'),
    'memories.saveChaser': edit('console'),
    'memories.deleteChaser': edit('console'),
    'cues.add': edit('console'),
    'cues.update': edit('console'),
    'cues.move': edit('console'),
    'cues.delete': edit('console'),
    'audio.addItems': edit('audio'),
    'audio.updateItem': edit('audio'),
    'audio.removeItem': edit('audio'),
    'audio.moveItem': edit('audio'),
    'video.addOutput': edit('video'),
    'video.updateOutput': edit('video'),
    'video.removeOutput': edit('video'),
    'video.saveGobo': edit('video'),
    'video.deleteGobo': edit('video'),
    'video.saveTimer': edit('video'),
    'video.deleteTimer': edit('video'),
    'timeline.create': edit('timeline'),
    'timeline.save': edit('timeline'),
    'timeline.setRecording': edit('timeline'),
    'timeline.delete': edit('timeline'),
    'grid.set': edit('virtualConsole'),
    'media.import': edit('media'),
    'media.remove': edit('media')
};
