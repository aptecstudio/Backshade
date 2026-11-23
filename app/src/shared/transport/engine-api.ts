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

/** Testo in una lingua o tradotto in più lingue (codice lingua -> testo) */
export type LocalizedText = string | Record<string, string>;

/** Show aperto */
export interface ShowSummary {
    id: string;
    name: string;
    /** Cartella dello show */
    folder: string;
    /** Data dell'ultimo salvataggio, ISO 8601 */
    modifiedAt: string;
    /** Ci sono modifiche non salvate */
    dirty: boolean;
}

/** Risultato dell'apertura di uno show */
export interface OpenShowResult {
    show: ShowSummary;
    /** Esiste una copia di recupero più recente dell'ultimo salvataggio */
    recoveryAvailable: boolean;
}

/** Show recente */
export interface RecentShow {
    name: string;
    folder: string;
    /** Data dell'ultima apertura, ISO 8601 */
    openedAt: string;
    /** Data dell'ultimo salvataggio, ISO 8601, se lo show esiste ancora */
    modifiedAt: string | null;
    /** Lo show non si trova più nella cartella (spostato o cancellato) */
    missing: boolean;
}

/** Modello di show */
export interface TemplateInfo {
    /** Identificativo, ad esempio "bundled:empty" o "user:Palco piccolo" */
    id: string;
    name: LocalizedText;
    description: LocalizedText;
    /** Incluso nell'applicazione (sola lettura) o creato dall'utente */
    source: 'bundled' | 'user';
}

/** Impostazioni globali dell'applicazione */
export interface AppSettings {
    /** Cartella predefinita dei nuovi show */
    defaultShowsFolder: string;
}

/** Metodi del motore: parametri e risultato */
export interface EngineMethods {
    /** Informazioni sull'applicazione */
    'app.getInfo': { params: undefined; result: AppInfo };
    /** Chiude la finestra principale dopo la conferma dell'utente */
    'app.confirmClose': { params: undefined; result: undefined };
    /** Apre la finestra Informazioni (solo nell'applicazione desktop) */
    'window.openAbout': { params: undefined; result: undefined };
    /** Fa scegliere una cartella all'utente (solo nell'applicazione desktop) */
    'dialog.chooseFolder': { params: { defaultPath?: string }; result: string | null };

    /** Show aperto, o null */
    'show.getCurrent': { params: undefined; result: ShowSummary | null };
    /** Crea uno show da un modello e lo apre */
    'show.create': { params: { name: string; folder: string; templateId: string }; result: OpenShowResult };
    /** Apre lo show di una cartella */
    'show.open': { params: { folder: string }; result: OpenShowResult };
    /** Fa scegliere la cartella di uno show e lo apre; null se annullato */
    'show.chooseAndOpen': { params: undefined; result: OpenShowResult | null };
    /** Salva lo show aperto */
    'show.save': { params: undefined; result: ShowSummary };
    /** Salva lo show aperto con un nuovo nome in una cartella */
    'show.saveAs': { params: { name: string; folder: string }; result: ShowSummary };
    /** Rinomina lo show aperto (modifica non salvata) */
    'show.rename': { params: { name: string }; result: ShowSummary };
    /** Carica la copia di recupero dello show aperto */
    'show.recover': { params: undefined; result: ShowSummary };
    /** Elimina la copia di recupero dello show aperto */
    'show.discardRecovery': { params: undefined; result: undefined };
    /** Chiude lo show; con discard a true scarta le modifiche non salvate */
    'show.close': { params: { discard?: boolean }; result: undefined };

    /** Show recenti, dal più recente */
    'recent.list': { params: undefined; result: RecentShow[] };
    /** Toglie uno show dai recenti */
    'recent.remove': { params: { folder: string }; result: undefined };

    /** Modelli disponibili: inclusi e dell'utente */
    'template.list': { params: undefined; result: TemplateInfo[] };
    /** Salva lo show aperto come modello dell'utente */
    'template.saveCurrent': { params: { name: string; description: string }; result: TemplateInfo };
    /** Cambia nome e descrizione di un modello dell'utente */
    'template.update': { params: { id: string; name: string; description: string }; result: TemplateInfo };
    /** Elimina un modello dell'utente */
    'template.delete': { params: { id: string }; result: undefined };

    /** Impostazioni globali */
    'settings.get': { params: undefined; result: AppSettings };
    /** Cambia le impostazioni globali */
    'settings.update': { params: Partial<AppSettings>; result: AppSettings };
}

/** Eventi del motore e relativi dati */
export interface EngineEvents {
    /** L'elenco delle lingue disponibili è cambiato (pacchetto aggiunto o rimosso) */
    'locales.changed': { codes: string[] };
    /** Lo show aperto è cambiato (aperto, salvato, modificato, chiuso) */
    'show.changed': { show: ShowSummary | null };
    /** L'elenco degli show recenti è cambiato */
    'recent.changed': Record<string, never>;
    /** L'elenco dei modelli è cambiato */
    'templates.changed': Record<string, never>;
    /** L'utente vuole chiudere la finestra con modifiche non salvate */
    'app.closeRequested': Record<string, never>;
}

/** Nome di un metodo del motore */
export type EngineMethod = keyof EngineMethods;

/** Nome di un evento del motore */
export type EngineEvent = keyof EngineEvents;
