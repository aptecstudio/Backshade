/**
 * Engine startup: creates the request router, the event bus, the show
 * session and the fixture library, registers the services and connects the
 * transports. It is the only place that knows all the services; the
 * services do not know each other.
 */

import { app } from 'electron';
import { startCloseGuard } from '../services/close-guard-service';
import { FixtureLibrary } from '../fixtures/fixture-library';
import { PlaybackWindow } from '../playback/playback-window';
import { registerAppInfoService } from '../services/app-info-service';
import { registerAudioService } from '../services/audio-service';
import { registerVideoService } from '../services/video-service';
import { registerAttributeService } from '../services/attribute-service';
import { registerConsoleService } from '../services/console-service';
import { registerCueService } from '../services/cue-service';
import { registerFileService } from '../services/file-service';
import { registerFixtureService } from '../services/fixture-service';
import { registerGridService } from '../services/grid-service';
import { registerGroupService } from '../services/group-service';
import { registerOutputService } from '../services/output-service';
import { registerPatchService } from '../services/patch-service';
import { startLocaleService } from '../services/locale-service';
import { registerMatrixService } from '../services/matrix-service';
import { registerMediaService } from '../services/media-service';
import { registerOperatorService } from '../services/operator-service';
import { registerMemoryService } from '../services/memory-service';
import { registerRecentService } from '../services/recent-service';
import { registerRemoteService } from '../services/remote-service';
import { registerRemoteViewService } from '../services/remote-view-service';
import { registerSettingsService } from '../services/settings-service';
import { registerShowImportService } from '../services/show-import-service';
import { registerShowService } from '../services/show-service';
import { registerStageService } from '../services/stage-service';
import { registerTemplateService } from '../services/template-service';
import { registerTimelineService } from '../services/timeline-service';
import { registerUploadService } from '../services/upload-service';
import { registerMixerService } from '../services/mixer-service';
import { registerMidiService } from '../services/midi-service';
import { registerWindowService } from '../services/window-service';
import { ShowSession } from '../shows/show-session';
import { EventBus } from '../transport/event-bus';
import { attachIpcTransport } from '../transport/ipc-transport';
import { RequestRouter } from '../transport/request-router';

/**
 * Starts the engine. To be called once, after app.whenReady().
 */
export function startEngine(): void {
    const router = new RequestRouter();
    const bus = new EventBus();
    const session = new ShowSession((show) => bus.emit('show.changed', { show }));
    const library = new FixtureLibrary(() => session.summary()?.folder ?? null);

    registerAppInfoService(router);
    registerWindowService(router, bus);
    registerSettingsService(router);
    const operators = registerOperatorService(router, bus, session);
    registerShowService(router, bus, session, library, operators);
    registerFixtureService(router, bus, session, library);
    registerPatchService(router, bus, session, library);
    const output = registerOutputService(router, bus, session, library);
    const desk = registerConsoleService(router, bus, session, library, output.engine);
    registerAttributeService(router, bus, session, library, desk);
    const groupLevels = registerGroupService(router, bus, session, output.engine, desk);
    const playback = new PlaybackWindow();
    const audio = registerAudioService(router, bus, session, playback);
    const video = registerVideoService(router, bus, session, () => audio.videoInputs());
    const live = registerMatrixService(router, bus, session, output.engine, desk);
    const mixers = registerMixerService(router, bus, session, playback);
    const player = registerMemoryService(router, bus, session, desk, output.engine, live, audio, video, mixers);
    registerCueService(router, bus, session, player);
    const timelinePlayer = registerTimelineService(router, bus, session, { memory: player, video, playback, desk, output: output.engine, groupLevels, audio, mixers });
    registerGridService(router, bus, session);
    registerMidiService(router, bus, session, playback, timelinePlayer);
    registerRecentService(router, bus);
    registerTemplateService(router, bus, session);
    registerMediaService(router, bus, session);
    registerFileService(router, bus, session);
    registerShowImportService(router, bus, session, operators, library);
    startLocaleService(bus);
    startCloseGuard(bus, session);

    attachIpcTransport(router, bus);
    const remoteAccess = registerRemoteService(router, bus, operators, registerUploadService(router, bus, session));
    registerRemoteViewService(router);
    registerStageService(router, bus, session);

    // At quit the recovery copy stays only if there are unsaved changes
    app.on('before-quit', () => {
        remoteAccess.stop();
        session.autosave();
        session.dispose();
        output.dispose();
        playback.close();
    });
}
