/**
 * Colori dei canali, uguali a $channels in framework/scss/tokens/_colors.scss.
 * Ogni colore corrisponde alla classe CSS channel-color--<nome>.
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

/** Nome di un colore dei canali */
export type ChannelColor = typeof CHANNEL_COLORS[number];

/**
 * Restituisce la classe CSS di un colore dei canali.
 */
export function channelColorClass(color: ChannelColor): string {
    return `channel-color--${color}`;
}
