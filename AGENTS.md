# AGENTS.md — Istruzioni per gli agenti AI

Questo file definisce le regole che ogni agente AI deve seguire lavorando sul progetto **Backshade**.

## 1. Regole su questo file

- L'agente AI **non deve modificare questo file** senza autorizzazione o esplicito consenso dell'umano.
- Se l'agente ritiene utile una modifica, la propone all'umano e attende la conferma prima di applicarla.

## 2. File di riferimento

| File | Contenuto | Chi lo aggiorna |
| --- | --- | --- |
| `AGENTS.md` | Regole per gli agenti AI | Solo con consenso dell'umano |
| `ROADMAP.md` | Roadmap del progetto: fasi, sottofasi e stato di avanzamento | L'agente, a ogni fase o sottofase completata |
| `MEMORY.md` | Scelte tecniche, convenzioni e decisioni prese | L'agente, ogni volta che viene presa una decisione |
| `CHANGELOG.md` | Storico delle versioni rilasciate | L'agente, a ogni nuova versione approvata |

- La roadmap è descritta e segnata **esclusivamente** in `ROADMAP.md`: le voci completate si spuntano (`- [x]`).
- Ogni scelta o convenzione (librerie, struttura, formati, nomi) va registrata in `MEMORY.md` prima o subito dopo essere stata applicata.
- Prima di iniziare un lavoro, l'agente legge `ROADMAP.md` e `MEMORY.md`.

## 3. Lingua

- I file `.md` e le conversazioni con gli umani sono **in italiano**.
- Il codice sorgente e le nomenclature (variabili, funzioni, classi, file, cartelle, chiavi JSON, messaggi di commit tecnici) sono **in inglese**.
- **Eccezione:** i commenti nel codice sono scritti **in italiano**.
- I testi dell'interfaccia utente seguono il sistema di localizzazione definito in `MEMORY.md`.

## 4. Stile del codice

- Lo stile di ogni linguaggio rispetta lo standard di riferimento di quel linguaggio (indentazione, spaziature, righe vuote, nuove linee, punteggiatura, posizione delle parentesi, punto e virgola).
- I commenti seguono le convenzioni del linguaggio (es. JSDoc per JavaScript) e sono scritti in italiano.
- Ogni file termina con una nuova linea; niente spazi a fine riga.
- Le regole di formattazione condivise sono definite in `.editorconfig`.
- Le convenzioni specifiche (es. stile JavaScript ES5) sono dettagliate in `MEMORY.md`.

## 5. Dubbi e domande

- Quando l'agente ha dubbi deve **chiedere all'umano tramite sondaggi interattivi** (domande a scelta multipla), in italiano.
- L'agente non procede su scelte ambigue, irreversibili o con impatto architetturale senza aver chiesto.

## 6. Git e versionamento

- Si lavora **solo sul branch `main`**. Non creare altri branch.
- L'agente non esegue commit né push senza il consenso dell'umano.
- Il versionamento segue [Semantic Versioning](https://semver.org/lang/it/).
- La versione **1.0.0** corrisponde alla **prima versione avviabile** del software.
- **Prima della 1.0.0** (fase iniziale non funzionante): a fine di ogni fase o sottofase l'agente chiede solo se fare commit e push.
- **Dalla 1.0.0 in poi**: a fine di ogni fase o sottofase l'agente:
  1. presenta la lista del changelog;
  2. propone il nuovo numero di versione (patch, minor o major motivando la scelta);
  3. chiede se procedere con commit e push.
- Dopo l'approvazione l'agente aggiorna `CHANGELOG.md`, la versione in `package.json` e `ROADMAP.md`.

## 7. Dipendenze

- Usare **meno dipendenze possibili**. Preferire le API native di Node.js, Electron e del browser.
- Ogni nuova dipendenza va proposta all'umano con un sondaggio, motivata e registrata in `MEMORY.md`.
- Le librerie lato interfaccia vengono incluse in locale (vendor), mai da CDN: il software deve funzionare offline.

## 8. Progetto

**Backshade** è una console di programmazione per show live, multipiattaforma (Windows, Linux, macOS), basata su Electron con interfaccia web.

- **Tecnologie:** HTML, JavaScript vanilla **ES5**, jQuery, Tailwind CSS.
- **Licenza:** GPL-3.0.
- **Principio guida:** il software deve essere semplice.

Funzionalità da gestire:

- Fixture DMX e Art-Net multiuniverso.
- Matrici LED.
- Periferiche video e audio esterne.
- Console virtuale su griglia personalizzabile per ogni show.
- Console semplice, ibrida tra live e programmazione, con salvataggio di scene e chaser.
- Show preprogrammabili tramite interfaccia a tracce (come l'editor di una DAW).
- Regia video e riproduzione audio con eventuali foto sovrapponibili.
- Integrazione tra luci, audio e video.
- Integrazione con eventuali mixer audio esterni.
- Salvataggio e clonazione degli show come progetti in cartelle dedicate, trasportabili da un dispositivo a un altro.
- Interfaccia web utilizzabile da desktop o mobile, raggiungibile tramite webserver sulla rete interna.

## 9. Linee guida grafiche

- **Modello grafico:** scheumorfismo hardware (l'interfaccia richiama superfici, fader, pulsanti e display di una console fisica).
- **Spaziature:** solo multipli di 8, sempre gli stessi valori della scala definita in `MEMORY.md`.
- **Colori:** solo palette neutra; ridurre al minimo i gradienti; **nessun glow**.
- **Icone:** mai emoji o emoticon. Solo icone a linea, tutte della stessa libreria (vedi `MEMORY.md`).
- **Tipografia:** al massimo due pesi per font; **non usare testo UPPERCASE**.
- **Decorazioni:** ridurre al minimo decorazioni e badge su testi e numeri.
- **Grafici:** linee sottili e colori tenui; assi e dati hanno la priorità visiva.
