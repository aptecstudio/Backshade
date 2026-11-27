/**
 * Backshade instances on the local network: the name given to each computer
 * and what a search finds. Shared between engine and interface.
 */

/** Longest name of an instance */
export const INSTANCE_NAME_LENGTH = 40;

/** Instance found on the network */
export interface DiscoveredInstance {
    name: string;
    /** IP address it answered from */
    address: string;
    /** Port of its web server */
    port: number;
}
