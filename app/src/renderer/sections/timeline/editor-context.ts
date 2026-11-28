/**
 * What the timeline editor needs to name and choose the sources of clips
 * and the settings of tracks: scenes, chasers, groups, media files, video
 * outputs, gobos, timers and audio outputs of the show.
 */

import type { AudioDevice } from '../../../shared/audio/audio.js';
import type { MemoriesSummary } from '../../../shared/console/memories.js';
import type { FixtureGroup } from '../../../shared/patch/groups.js';
import type { ClipSource, Clip, AutomationTarget } from '../../../shared/timeline/timeline.js';
import type { MediaItem } from '../../../shared/transport/engine-api.js';
import type { ShowVideo } from '../../../shared/video/video.js';
import type { ShowMixer } from '../../../shared/mixers/mixers.js';
import { t } from '../../i18n/i18n.js';

export interface EditorContext {
    memories: MemoriesSummary;
    groups: FixtureGroup[];
    media: MediaItem[];
    video: ShowVideo;
    devices: AudioDevice[];
    /** External mixers of the show */
    mixers: ShowMixer[];
    /** Frames per second of the show timecode */
    fps: number;
}

/** Empty context, before the first load */
export const EMPTY_CONTEXT: EditorContext = {
    memories: { scenes: [], chasers: [], cues: [] },
    groups: [],
    media: [],
    video: { outputs: [], gobos: [], timers: [] },
    devices: [],
    mixers: [],
    fps: 25
};

function fileName(file: string): string {
    return file.split('/').pop() ?? file;
}

/**
 * Name of what a clip plays.
 */
export function sourceName(source: ClipSource, context: EditorContext): string {
    switch (source.kind) {
        case 'scene': return context.memories.scenes.find((scene) => scene.id === source.id)?.name ?? t('grid.missing');
        case 'chaser': return context.memories.chasers.find((chaser) => chaser.id === source.id)?.name ?? t('grid.missing');
        case 'audio': return fileName(source.file);
        case 'mixer': return t('mixers.sceneNumber', { number: source.number });
        case 'mapping': return context.video.outputs.flatMap((output) => output.presets).find((preset) => preset.id === source.preset)?.name ?? t('grid.missing');
        case 'layer': {
            const layer = source.layer.source;
            if (layer === null) {
                return '';
            }
            switch (layer.kind) {
                case 'video':
                case 'image': return fileName(layer.file);
                case 'gobo': return context.video.gobos.find((gobo) => gobo.id === layer.gobo)?.name ?? t('grid.missing');
                case 'timer': return context.video.timers.find((timer) => timer.id === layer.timer)?.name ?? t('grid.missing');
                case 'input': return layer.label;
            }
        }
    }
}

/** Text on a clip */
export function clipName(clip: Clip, context: EditorContext): string {
    return clip.name !== '' ? clip.name : sourceName(clip.source, context);
}

/** Name of the target of an automation track */
export function targetName(target: AutomationTarget | null, context: EditorContext): string {
    if (target === null) {
        return t('timeline.noTarget');
    }
    switch (target.kind) {
        case 'master': return t(`grid.masters.${target.master}`);
        case 'group': return context.groups.find((group) => group.id === target.id)?.name ?? t('grid.missing');
        case 'scene': return context.memories.scenes.find((scene) => scene.id === target.id)?.name ?? t('grid.missing');
    }
}
