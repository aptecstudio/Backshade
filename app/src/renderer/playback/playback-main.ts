/**
 * Entry of the playback window: receives the commands of the engine and
 * plays the sound on the chosen audio output, with the volume of the
 * player. Voices finish by themselves; the window keeps the ones playing.
 */

import type { AudioDevice } from '../../shared/audio/audio.js';
import type { PlaybackBridge } from '../../shared/audio/playback-bridge.js';
import type { PlaybackCommand } from '../../shared/audio/playback-protocol.js';
import { AudioVoice } from './audio-voice.js';

declare global {
    interface Window {
        backshadePlayback: PlaybackBridge;
    }
    interface AudioContext {
        setSinkId(id: string): Promise<void>;
    }
}

const bridge = window.backshadePlayback;
const context = new AudioContext();
const master = context.createGain();
master.connect(context.destination);
const voices = new Map<string, AudioVoice>();

async function listDevices(): Promise<AudioDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
        .filter((device) => device.kind === 'audiooutput' && device.deviceId !== 'default' && device.deviceId !== 'communications')
        .map((device) => ({ id: device.deviceId, label: device.label }));
}

function handle(command: PlaybackCommand): void {
    switch (command.type) {
        case 'play': {
            const voice = new AudioVoice(command, context, master, (status) => {
                if (status.type === 'ended' || status.type === 'error') {
                    voices.delete(status.voice);
                }
                bridge.report(status);
            });
            voices.set(voice.id, voice);
            break;
        }
        case 'stop':
            voices.get(command.voice)?.stop(command.fade);
            voices.delete(command.voice);
            break;
        case 'pause':
            voices.get(command.voice)?.pause();
            break;
        case 'resume':
            voices.get(command.voice)?.resume();
            break;
        case 'volume':
            voices.get(command.voice)?.setVolume(command.volume, command.ramp);
            break;
        case 'output':
            master.gain.setTargetAtTime(command.volume, context.currentTime, 0.02);
            // An output that is gone falls back to the default one
            void context.setSinkId(command.device).catch(() => context.setSinkId(''));
            break;
        case 'listVideoInputs':
            void navigator.mediaDevices.enumerateDevices()
                .then((devices) => devices.filter((device) => device.kind === 'videoinput').map((device) => ({ id: device.deviceId, label: device.label })))
                .catch(() => [])
                .then((inputs) => bridge.report({ type: 'videoInputs', request: command.request, inputs }));
            break;
        case 'listDevices':
            void listDevices().catch(() => []).then((devices) => bridge.report({ type: 'devices', request: command.request, devices }));
            break;
    }
}

bridge.onCommand(handle);
bridge.report({ type: 'ready' });
