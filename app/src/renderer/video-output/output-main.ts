/**
 * Entry of a video output window: shows the compositions sent by the
 * engine over the whole window, through the videomapping of the output.
 */

import type { VideoOutputBridge } from '../../shared/video/video-output-protocol.js';
import { CompositionView } from '../video/composition-view.js';
import { MappedComposition } from '../video/mapped-composition.js';

declare global {
    interface Window {
        backshadeVideoOutput: VideoOutputBridge;
    }
}

// The dates of the timers follow the language chosen in the interface (same origin, same storage)
document.documentElement.lang = localStorage.getItem('backshade.locale') ?? navigator.language;
const view = new CompositionView(['composition--output']);
view.mount(document.body);
const mapping = new MappedComposition(view, document.body);
window.backshadeVideoOutput.onCompose((message) => {
    view.setGobos(message.gobos, message.context);
    view.setTimers(message.timers, message.timerStates);
    view.show(message.layers, message.transition);
    mapping.apply({ surfaces: message.surfaces, masks: message.masks, testPattern: message.testPattern, name: message.name });
});
