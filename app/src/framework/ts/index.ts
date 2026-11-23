/**
 * Punto di accesso al framework TypeScript interno di Backshade.
 * Raccoglie ed esporta i moduli pubblici del framework.
 */

// DOM
export { query, queryAll } from './dom/query.js';
export { create, type CreateOptions } from './dom/create.js';
export { on, delegate, type Unsubscribe } from './dom/events.js';

// Base dei componenti
export { Component } from './core/component.js';
export { Emitter, type Listener } from './core/emitter.js';
export { clamp } from './core/clamp.js';

// Tema
export type { SpacingStep } from './theme/spacing.js';
export { CHANNEL_COLORS, channelColorClass, type ChannelColor } from './theme/channel-colors.js';

// Rete e archiviazione
export { fetchJson } from './net/fetch-json.js';
export { LocalPreference } from './storage/local-preference.js';

// Icone
export { icon, type IconOptions } from './icons/icon.js';
export { ICON_NAMES, type IconName } from './icons/icon-names.js';

// Localizzazione
export {
    createTranslator,
    type MessageTree,
    type MessageKey,
    type MessageParams,
    type Translate
} from './i18n/translator.js';
export {
    loadLanguagePack,
    loadLanguageList,
    LANGUAGE_PACK_FORMAT,
    type LanguageInfo,
    type LanguageMeta,
    type LanguagePack
} from './i18n/language-pack.js';
export { negotiateLocale } from './i18n/negotiate-locale.js';
export { applyTranslations, type TranslateKey } from './i18n/apply-translations.js';

// Struttura e testo
export { Stack, type StackOptions } from './layout/stack.js';
export { Spacer } from './layout/spacer.js';
export { Label, type LabelOptions } from './text/label.js';
export { ExternalLink, type ExternalLinkOptions } from './text/external-link.js';
export { ImageView, type ImageViewOptions } from './media/image-view.js';
export { Panel, type PanelOptions } from './panel/panel.js';

// Tasti
export { Key, type KeyOptions, type KeyState } from './keys/key.js';
export { SquareKey, type SquareKeyOptions, type SquareKeyVariant } from './keys/square-key.js';
export { FunctionKey, type FunctionKeyOptions } from './keys/function-key.js';

// Display
export { ChannelDisplay, type ChannelDisplayOptions } from './displays/channel-display.js';
export { ReadoutDisplay, type ReadoutDisplayOptions } from './displays/readout-display.js';
export { ValueDisplay, type ValueDisplayOptions } from './displays/value-display.js';

// Controlli
export { RangeControl, type RangeControlOptions } from './controls/range-control.js';
export { Knob, type KnobOptions } from './controls/knob.js';
export { Fader, type FaderOptions } from './controls/fader.js';
export { LIGHT_SCALE, AUDIO_SCALE, type FaderTick } from './controls/fader-scales.js';
