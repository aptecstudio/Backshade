/**
 * Entry of a video output window: shows the compositions sent by the
 * engine over the whole window.
 */

import type { VideoOutputBridge } from '../../shared/video/video-output-protocol.js';
import { CompositionView } from '../video/composition-view.js';

declare global {
    interface Window {
        backshadeVideoOutput: VideoOutputBridge;
    }
}

const view = new CompositionView(['composition--output']);
view.mount(document.body);
window.backshadeVideoOutput.onCompose((message) => view.show(message.layers, message.transition));
