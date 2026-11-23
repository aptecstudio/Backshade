/**
 * Entry point of the internal TypeScript framework of Backshade.
 * Collects and exports the public modules of the framework.
 */

// DOM
export { query, queryAll } from './dom/query.js';
export { create, type CreateOptions } from './dom/create.js';
export { on, delegate, type Unsubscribe } from './dom/events.js';

// Component base
export { Component } from './core/component.js';
export { Emitter, type Listener } from './core/emitter.js';
export { clamp } from './core/clamp.js';

// Theme
export type { SpacingStep } from './theme/spacing.js';
export { CHANNEL_COLORS, channelColorClass, type ChannelColor } from './theme/channel-colors.js';

// Network and storage
export { fetchJson } from './net/fetch-json.js';
export { LocalPreference } from './storage/local-preference.js';

// Icons
export { icon, type IconOptions } from './icons/icon.js';
export { ICON_NAMES, type IconName } from './icons/icon-names.js';

// Localization
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

// Structure and text
export { Stack, type StackOptions } from './layout/stack.js';
export { Spacer } from './layout/spacer.js';
export { Label, type LabelOptions } from './text/label.js';
export { ExternalLink, type ExternalLinkOptions } from './text/external-link.js';
export { ImageView, type ImageViewOptions } from './media/image-view.js';
export { Panel, type PanelOptions } from './panel/panel.js';

// Forms, lists, dialogs and keyboard
export { TextField, type TextFieldOptions } from './forms/text-field.js';
export { TextArea, type TextAreaOptions } from './forms/text-area.js';
export { NumberField, type NumberFieldOptions } from './forms/number-field.js';
export { ChoiceKeys, type ChoiceKeysOptions, type ChoiceOption } from './forms/choice-keys.js';
export { TimeField, type TimeFieldOptions } from './forms/time-field.js';
export { pickTime, type TimePickerLabels, type TimePickerOptions } from './time/time-picker.js';
export { formatDuration } from './time/format-duration.js';
export { ColorWheel, type ColorWheelLabels, type ColorWheelOptions } from './color/color-wheel.js';
export { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv, type Hsv, type Rgb } from './theme/color-math.js';
export { ListItem, type ListItemOptions } from './list/list-item.js';
export { Dialog, type DialogOptions } from './overlay/dialog.js';
export { onShortcut } from './keyboard/shortcuts.js';

// Keys
export { Key, type KeyOptions, type KeyState } from './keys/key.js';
export { SquareKey, type SquareKeyOptions, type SquareKeyVariant } from './keys/square-key.js';
export { FunctionKey, type FunctionKeyOptions } from './keys/function-key.js';

// Displays
export { ChannelDisplay, type ChannelDisplayOptions } from './displays/channel-display.js';
export { ReadoutDisplay, type ReadoutDisplayOptions } from './displays/readout-display.js';
export { ValueDisplay, type ValueDisplayOptions } from './displays/value-display.js';

// Controls
export { RangeControl, type RangeControlOptions } from './controls/range-control.js';
export { Knob, type KnobOptions } from './controls/knob.js';
export { Fader, type FaderOptions } from './controls/fader.js';
export { LinearSlider } from './controls/linear-slider.js';
export { JogWheel, type JogWheelOptions } from './controls/jog-wheel.js';
export { RangeInput, type RangeInputOptions, type RangeInputRange } from './controls/range-input.js';
export { LIGHT_SCALE, AUDIO_SCALE, type FaderTick } from './controls/fader-scales.js';
