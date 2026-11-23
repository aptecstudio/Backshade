/**
 * Channel colors, equal to $channels in framework/scss/tokens/_colors.scss.
 * Each color matches the CSS class channel-color--<name>.
 */
export const CHANNEL_COLORS = [
    'blue',
    'orange',
    'purple',
    'yellow',
    'teal',
    'pink',
    'green',
    'cyan',
    'amber'
] as const;

/** Name of a channel color */
export type ChannelColor = typeof CHANNEL_COLORS[number];

/**
 * Returns the CSS class of a channel color.
 */
export function channelColorClass(color: ChannelColor): string {
    return `channel-color--${color}`;
}
