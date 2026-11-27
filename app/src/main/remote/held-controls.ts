/**
 * Controls a remote client holds: flash keys (channel or group) and MIDI
 * learn and monitor. If the client disconnects while holding them (Wi-Fi
 * lost, phone locked) they are released, so no light stays at full.
 */

import type { EngineMethod } from '../../shared/transport/engine-api';

/** Request that releases a held control */
export interface Release {
    method: EngineMethod;
    params: unknown;
}

export class HeldControls {
    private readonly held = new Map<string, Release>();

    /** Follows a successful request of the client */
    follow(method: string, params: unknown): void {
        const input = (typeof params === 'object' && params !== null ? params : {}) as Record<string, unknown>;
        const track = (key: string, on: boolean, release: unknown): void => {
            if (on) {
                this.held.set(key, { method: method as EngineMethod, params: release });
            } else {
                this.held.delete(key);
            }
        };
        switch (method) {
            case 'console.setFlash':
                track(`flash ${input.row} ${input.universe} ${input.channel}`, input.on === true, { ...input, on: false });
                break;
            case 'console.flashGroup':
                track(`group ${input.id}`, input.on === true, { ...input, on: false });
                break;
            case 'midi.setLearn':
            case 'midi.setMonitor':
                track(method, input.on === true, { on: false });
                break;
        }
    }

    /** Requests that release everything held, once */
    releases(): Release[] {
        const result = [...this.held.values()];
        this.held.clear();
        return result;
    }
}
