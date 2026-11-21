# ROADMAP.md — Roadmap di Backshade

Stato di avanzamento del progetto. Le voci completate si spuntano con `- [x]`.

Regole di versionamento (vedi `AGENTS.md`):

- fino alla prima versione avviabile non si assegnano versioni;
- la **1.0.0** corrisponde alla prima versione avviabile (fine Fase 1);
- da lì in poi, a fine di ogni fase o sottofase si propone una nuova versione con changelog.

---

## Fase 0 — Inizializzazione del progetto

- [x] 0.1 `AGENTS.md` con le regole per gli agenti AI
- [x] 0.2 `ROADMAP.md` e `MEMORY.md`
- [x] 0.3 Licenza GPL-3.0, `README.md`, `.gitignore`, `.editorconfig`
- [x] 0.4 Proposta delle modalità di distribuzione
- [x] 0.5 Bozza grafica dell'interfaccia (artefatto)
- [ ] 0.6 Conferma delle scelte proposte in `MEMORY.md` (architettura, dipendenze, formato show, design system)
  - [x] Distribuzione
  - [x] Libreria icone (Lucide)

## Fase 1 — Base avviabile (obiettivo 1.0.0)

- [ ] 1.1 `package.json`, Electron, script di avvio
- [ ] 1.2 Processo main, `preload` sicuro, finestra principale
- [ ] 1.3 Pipeline Tailwind CSS e inclusione vendor di jQuery e Lucide
- [ ] 1.4 Design system: token di spaziatura, palette, tipografia, componenti base scheumorfici (pannello, pulsante, fader, encoder, display)
- [ ] 1.5 Layout dell'applicazione: barra superiore, navigazione tra le sezioni, barra di stato
- [ ] 1.6 Sistema di localizzazione (italiano)
- [ ] 1.7 Livello di trasporto unico tra interfaccia e motore (IPC)

## Fase 2 — Show e progetti

- [ ] 2.1 Formato della cartella show e `show.json` con `formatVersion`
- [ ] 2.2 Crea, apri, salva, salva con nome
- [ ] 2.3 Clonazione di uno show
- [ ] 2.4 Gestione dei media interni con percorsi relativi
- [ ] 2.5 Elenco degli show recenti e cartella predefinita degli show
- [ ] 2.6 Esportazione e importazione come archivio unico per il trasporto
- [ ] 2.7 Impostazioni globali dell'applicazione separate da quelle dello show

## Fase 3 — DMX e Art-Net

- [ ] 3.1 Modello dati delle fixture (canali, modalità, attributi)
- [ ] 3.2 Libreria di fixture e editor delle fixture personalizzate
- [ ] 3.3 Patch multiuniverso con verifica dei conflitti di indirizzo
- [ ] 3.4 Output Art-Net (UDP nativo), configurazione dei nodi e degli universi
- [ ] 3.5 Motore di output: frame rate, merge HTP/LTP, blackout, grand master
- [ ] 3.6 Monitor dei canali DMX per universo
- [ ] 3.7 Interfacce DMX USB (da valutare, richiede una dipendenza nativa)

## Fase 4 — Console semplice (live e programmazione)

- [ ] 4.1 Selezione delle fixture e dei gruppi
- [ ] 4.2 Controllo degli attributi: intensità, colore, posizione, beam
- [ ] 4.3 Programmer: modifica live e cattura dei valori
- [ ] 4.4 Scene: salvataggio, richiamo, fade in/out
- [ ] 4.5 Chaser: passi, tempi, BPM, tap tempo, modalità di riproduzione
- [ ] 4.6 Playback con fader e pulsanti di esecuzione

## Fase 5 — Matrici LED

- [ ] 5.1 Definizione della matrice (dimensioni, ordine dei pixel, mappatura sugli universi)
- [ ] 5.2 Anteprima della matrice
- [ ] 5.3 Effetti base (colore pieno, gradiente, scorrimento, testo)
- [ ] 5.4 Pixel mapping da immagine e da video

## Fase 6 — Console virtuale su griglia

- [ ] 6.1 Griglia personalizzabile per show (dimensioni, pagine)
- [ ] 6.2 Widget: pulsante, fader, encoder, selettore colore, XY pad, etichetta, monitor
- [ ] 6.3 Collegamento dei widget a scene, chaser, gruppi, media e cue
- [ ] 6.4 Modalità modifica e modalità esecuzione
- [ ] 6.5 Mappatura MIDI dei widget

## Fase 7 — Audio e video

- [ ] 7.1 Rilevamento e selezione delle periferiche audio e video esterne
- [ ] 7.2 Riproduzione audio: playlist, volume, dissolvenze, uscita per periferica
- [ ] 7.3 Regia video: uscite su display esterni a schermo intero
- [ ] 7.4 Livelli: video, immagini sovrapposte, opacità, transizioni
- [ ] 7.5 Ingressi video (webcam e schede di acquisizione)
- [ ] 7.6 Anteprima e programma (preview/program)

## Fase 8 — Show preprogrammati (timeline a tracce)

- [ ] 8.1 Editor a tracce stile DAW: righello, zoom, scorrimento, playhead
- [ ] 8.2 Tracce luci (scene, chaser, valori), tracce audio, tracce video e immagini
- [ ] 8.3 Clip: spostamento, ridimensionamento, dissolvenze, ancoraggio alla griglia
- [ ] 8.4 Forma d'onda audio e marker
- [ ] 8.5 Clock condiviso e riproduzione sincronizzata
- [ ] 8.6 Cue list e modalità go (avanzamento manuale)

## Fase 9 — Integrazioni

- [ ] 9.1 Integrazione luci, audio e video: trigger incrociati e sincronismo
- [ ] 9.2 Mixer audio esterni via OSC (UDP nativo)
- [ ] 9.3 Mixer e controller via MIDI (Web MIDI API)
- [ ] 9.4 Profili per i mixer più diffusi (da definire)
- [ ] 9.5 Timecode esterno (MIDI Timecode, da valutare)

## Fase 10 — Interfaccia web remota

- [ ] 10.1 Webserver sulla rete interna (modulo `http` nativo)
- [ ] 10.2 Trasporto WebSocket con lo stesso protocollo dell'IPC
- [ ] 10.3 Layout responsive per desktop e mobile
- [ ] 10.4 Accesso protetto da PIN e permessi per ruolo (solo esecuzione o modifica)
- [ ] 10.5 Indirizzo e codice QR di collegamento mostrati nell'applicazione

## Fase 11 — Distribuzione

- [ ] 11.1 Configurazione del packaging
- [ ] 11.2 Build Windows
- [ ] 11.3 Build macOS
- [ ] 11.4 Build Linux
- [ ] 11.5 Script di build locali e pubblicazione manuale su GitHub Releases
- [ ] 11.6 Notifica degli aggiornamenti disponibili

### Proposta delle modalità di distribuzione

Strumento di packaging proposto: **electron-builder** (unica dipendenza di sviluppo per tutte e tre le piattaforme). Pubblicazione su **GitHub Releases** del repository.

| Piattaforma | Formati | Architetture | Note |
| --- | --- | --- | --- |
| Windows | Installer NSIS (`.exe`) e versione portabile (`.exe`) | x64, arm64 | La firma del codice (certificato Authenticode) è facoltativa ma evita gli avvisi di SmartScreen. In seguito: pubblicazione su winget. |
| macOS | Immagine disco (`.dmg`) e archivio (`.zip`) | Universal (Apple Silicon e Intel) | Firma con Developer ID e notarizzazione Apple necessarie per evitare il blocco di Gatekeeper; richiedono l'Apple Developer Program. Senza firma l'app si apre solo con procedura manuale. |
| Linux | AppImage (universale) e pacchetto `.deb` (Debian, Ubuntu, Mint) | x64, arm64 | AppImage funziona senza installazione. Facoltativi in seguito: `.rpm` e Flatpak. arm64 permette l'uso su Raspberry Pi 4/5 come postazione dedicata. |

- **Build:** locali tramite script npm, **senza GitHub Actions**. La build macOS va eseguita su un Mac (necessario anche per firma e notarizzazione); Windows e Linux si possono generare dalle rispettive macchine.
- **Aggiornamenti:** controllo della versione più recente tramite le API di GitHub Releases e notifica all'utente, senza aggiornamento automatico, per non aggiungere dipendenze. L'aggiornamento automatico (`electron-updater`) resta un'opzione.
- **Portabilità degli show:** le cartelle degli show sono indipendenti dall'installazione, quindi funzionano con qualsiasi formato di distribuzione.

Stato: Confermata (nessun uso di GitHub Actions).
