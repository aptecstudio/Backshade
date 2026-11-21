# MEMORY.md — Scelte e convenzioni

Registro delle decisioni tecniche e delle convenzioni di Backshade. Ogni voce indica lo stato:

- **Confermata**: decisa dall'umano o derivata direttamente dalle specifiche.
- **Proposta**: scelta dall'agente in attesa di conferma; può cambiare.

## Generale

| Tema | Decisione | Stato |
| --- | --- | --- |
| Nome | Backshade | Confermata |
| Licenza | GPL-3.0 (`LICENSE`) | Confermata |
| Branch | Solo `main` | Confermata |
| Piattaforme | Windows, Linux, macOS | Confermata |
| Runtime | Electron | Confermata |
| Interfaccia | HTML, JavaScript vanilla ES5, jQuery, Tailwind CSS | Confermata |
| Versionamento | SemVer, 1.0.0 alla prima versione avviabile | Confermata |

## Architettura (proposta)

- **Motore nel processo main (Node.js):** gestione show, output DMX/Art-Net, clock della timeline, webserver. Il motore è l'unica fonte di verità dello stato.
- **Interfaccia come client web:** la stessa interfaccia gira nella finestra Electron e nel browser di un dispositivo in rete. Comunica con il motore tramite un livello di trasporto unico:
  - in Electron: IPC tramite `preload` con `contextIsolation` attivo;
  - da remoto: WebSocket servito dal webserver interno.
- **Uscite video:** finestre Electron dedicate a schermo intero sui display esterni.
- **Audio:** Web Audio API ed elementi `<audio>`/`<video>` con selezione della periferica di uscita (`setSinkId`).

Stato: Proposta.

## Struttura delle cartelle (proposta)

```
backshade/
  src/
    main/        # processo main Electron, motore, webserver
    preload/     # ponte IPC sicuro tra main e interfaccia
    renderer/    # interfaccia web (html, js, css)
    shared/      # costanti e modelli condivisi
  assets/
    icons/       # icone a linea (sprite SVG)
    fixtures/    # libreria delle fixture
  build/         # risorse per il packaging
```

Stato: Proposta.

## Stile del codice

### JavaScript

- ES5 sia nell'interfaccia sia nel processo main, per coerenza: `var`, `function`, nessuna arrow function, nessun template literal, nessuna classe ES6, nessun `let`/`const`.
- Moduli: CommonJS (`require` / `module.exports`) nel processo main; nell'interfaccia pattern a modulo (IIFE) con un unico namespace globale `Backshade`.
- `'use strict';` all'inizio di ogni file o IIFE.
- Indentazione 4 spazi, apici singoli, punto e virgola obbligatorio, parentesi graffa sulla stessa riga.
- Nomi: `camelCase` per variabili e funzioni, `PascalCase` per costruttori, `UPPER_SNAKE_CASE` per costanti.
- Commenti in italiano, documentazione con JSDoc.

Stato: Proposta.

### HTML e CSS

- Indentazione 4 spazi, attributi con doppi apici.
- Classi Tailwind come stile principale; CSS personalizzato solo per componenti scheumorfici non esprimibili con le utility.
- Nomi di file e cartelle in `kebab-case`.

Stato: Proposta.

## Dipendenze (proposta)

Principio: meno dipendenze possibili.

| Dipendenza | Tipo | Motivo |
| --- | --- | --- |
| `electron` | sviluppo | Runtime dell'applicazione |
| `tailwindcss` (CLI) | sviluppo | Compilazione del CSS; il CSS compilato è incluso nel progetto |
| `electron-builder` | sviluppo | Packaging per le tre piattaforme |
| jQuery 3.x | vendor | Manipolazione DOM nell'interfaccia |
| Lucide | vendor | Libreria di icone a linea (licenza ISC), inclusa come sprite SVG (confermata) |

Funzionalità realizzate con API native, senza dipendenze aggiuntive:

- Art-Net: UDP con il modulo `dgram` di Node.js.
- Webserver: modulo `http` di Node.js.
- OSC per mixer esterni: UDP con `dgram`.
- MIDI per mixer e controller: Web MIDI API di Chromium.

Da valutare nelle fasi relative (da proporre con sondaggio):

- WebSocket lato server: `ws` oppure implementazione minimale interna.
- Interfacce DMX USB (es. Enttec): `serialport` (modulo nativo).

Stato: Proposta.

## Formato degli show (proposta)

- Ogni show è una cartella `nome-show.backshade/` contenente:
  - `show.json`: dati dello show (patch, scene, chaser, griglia, timeline);
  - `media/`: file audio, video e immagini usati dallo show;
  - `thumbnails/`: anteprime generate.
- Tutti i percorsi interni sono **relativi** alla cartella dello show, così la cartella è trasportabile tra dispositivi.
- I media importati vengono copiati dentro `media/`.
- Clonare uno show significa copiare la cartella e assegnare un nuovo identificativo.
- `show.json` contiene un campo `formatVersion` per gestire le migrazioni future.

Stato: Proposta.

## Design system

### Spaziature

Scala unica, solo multipli di 8: `8, 16, 24, 32, 48, 64` px. Non si usano altri valori.

Stato: Confermata (scala proposta).

### Colori

Palette neutra (grigi caldi tipo metallo e plastica scura), un solo colore di accento tenue per lo stato attivo e colori di stato desaturati (verde, ambra, rosso) solo per indicatori funzionali. Nessun glow, gradienti ridotti al minimo.

Stato: Proposta.

### Tipografia

- Font di sistema (`system-ui`) per i testi, monospaziato di sistema per valori numerici.
- Due soli pesi: 400 e 500.
- Nessun testo in maiuscolo (`text-transform: uppercase` vietato).

Stato: Proposta.

### Icone

- Libreria unica: **Lucide**, solo icone a linea, spessore tratto uniforme.
- Mai emoji o emoticon.

Stato: Confermata.

### Modello grafico

Scheumorfismo hardware: pannelli in rilievo con bordi sottili, fader e encoder disegnati come componenti fisici, display a segmenti sobri, ombre interne leggere al posto dei gradienti.

Stato: Confermata.

## Localizzazione

- Lingua iniziale dell'interfaccia: italiano.
- Le stringhe dell'interfaccia sono separate dal codice in file dedicati (es. `src/renderer/i18n/it.json`) per permettere altre lingue in futuro.

Stato: Proposta.

## Distribuzione

- Packaging con `electron-builder`, pubblicazione su GitHub Releases.
- Windows: installer NSIS e versione portabile. macOS: `.dmg` e `.zip` universal, firmati e notarizzati. Linux: AppImage e `.deb`.
- **Non usare GitHub Actions**: le build si eseguono in locale con script npm.
- Dettagli nella Fase 11 di `ROADMAP.md`.

Stato: Confermata.
