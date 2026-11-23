/**
 * Contratto tra interfaccia e motore: metodi che l'interfaccia può chiamare
 * ed eventi che il motore può inviare, con i tipi dei dati.
 * Il motore verifica i parametri di ogni metodo, perché le richieste
 * possono arrivare da client remoti.
 */

/** Informazioni sull'applicazione, per la finestra Informazioni */
export interface AppInfo {
    name: string;
    version: string;
    license: string;
    electron: string;
    chrome: string;
    node: string;
    platform: string;
    arch: string;
}

/** Metodi del motore: parametri e risultato */
export interface EngineMethods {
    /** Informazioni sull'applicazione */
    'app.getInfo': { params: undefined; result: AppInfo };
    /** Apre la finestra Informazioni (solo nell'applicazione desktop) */
    'window.openAbout': { params: undefined; result: undefined };
}

/** Eventi del motore e relativi dati */
export interface EngineEvents {
    /** L'elenco delle lingue disponibili è cambiato (pacchetto aggiunto o rimosso) */
    'locales.changed': { codes: string[] };
}

/** Nome di un metodo del motore */
export type EngineMethod = keyof EngineMethods;

/** Nome di un evento del motore */
export type EngineEvent = keyof EngineEvents;
