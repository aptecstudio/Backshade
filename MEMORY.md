# MEMORY.md - Choices and conventions

Log of Backshade's technical decisions and conventions. Each entry shows its status:

- **Confirmed**: decided by the human or derived directly from the specifications.
- **Proposed**: chosen by the agent, awaiting confirmation; may change.

## General

| Topic | Decision | Status |
| --- | --- | --- |
| Name | Backshade | Confirmed |
| License | GPL-3.0 (`LICENSE`) | Confirmed |
| Branch | `main` only | Confirmed |
| Platforms | Windows, Linux, macOS | Confirmed |
| Runtime | Electron | Confirmed |
| Interface | HTML, TypeScript, SCSS, internal TypeScript and SCSS frameworks | Confirmed (TypeScript and SCSS replace JavaScript, jQuery and Tailwind on 2026-11-23) |
| Versioning | SemVer; 1.0.0 is the first release, when all planned features are implemented and the application is ready for distribution and testing; no versions before it (`app/package.json` stays at `0.0.0`) | Confirmed (changed on 2026-11-23, it was the first runnable version) |
| Live tests | `TESTING.md`: checklist of the final tests to run live with real hardware; the agent adds the new features to it at the end of every phase or sub-phase | Confirmed (requested by the human on 2026-11-26) |
| README screenshots | Only 5 screenshots in `README.md`, showing the most interesting features; updated when better features arrive | Confirmed (requested by the human on 2026-11-26) |
| Demo show | The included "Demo show" template (`app/templates/demo.backshade`) is updated with every new feature and committed and pushed with it | Confirmed (requested by the human on 2026-11-26) |

## Language

| Context | Language | Status |
| --- | --- | --- |
| Conversations with humans and polls | Italian | Confirmed |
| `.md` files | English (changed from Italian on 2026-11-21) | Confirmed |
| Source code and naming | English | Confirmed |
| Code comments, log and error messages in the code | English (changed from Italian on 2026-11-23) | Confirmed |
| Commit messages | English | Confirmed |

### Allowed characters

- Code, `.md` files and interface: only letters, digits, standard ASCII punctuation and whitespace; accented letters allowed.
- No special characters, glyphs, symbols or emoji (long dashes, typographic quotes, arrows, degree sign, multiplication sign, bullets, check marks).
- ASCII replacements: `-` for dashes, `->` for arrows, `deg` for degrees, `x` for dimensions.

Status: Confirmed (2026-11-21).

## Architecture

See also Transport layer below.


- **Engine in the main process (Node.js):** show management, DMX/Art-Net output, timeline clock, web server. The engine is the single source of truth for state.
- **Interface as a web client:** the same interface runs in the Electron window and in the browser of a networked device. It talks to the engine through a single transport layer:
  - in Electron: IPC through `preload` with `contextIsolation` enabled;
  - remotely: WebSocket served by the built-in web server.
- **Video outputs:** dedicated fullscreen Electron windows on external displays.
- **Audio:** Web Audio API and `<audio>`/`<video>` elements with output device selection (`setSinkId`).

Status: Confirmed (2026-11-23).

### Transport layer

Built in Phase 1.7. One protocol for every transport (IPC now, WebSocket for remote clients in Phase 10):

- **Messages** (`src/shared/transport/protocol.ts`, `PROTOCOL_VERSION` 1): `request` (`id`, `method`, `params`), `response` (same `id`, `ok` with `result` or `error` with a stable `code`), `event` (`event`, `payload`). All messages are JSON objects.
- **Contract** (`src/shared/transport/engine-api.ts`): `EngineMethods` (parameters and result of each method) and `EngineEvents` (payload of each event), shared by main and interface. Methods are named `area.action` (for example `app.getInfo`, `window.openAbout`), events `area.pastTense` (for example `locales.changed`).
- **Main process:** `RequestRouter` dispatches requests to the registered handlers and always returns a response (errors included); `EventBus` sends events to every transport; `ipc-transport.ts` connects both to IPC and accepts only messages from pages served by `app://`. Handlers receive `params` as `unknown` and validate them, because requests will also come from remote clients; the `RequestContext` tells which transport a request comes from.
- **Services** (`src/main/services/`): each service registers its methods or events; `src/main/engine/engine-host.ts` is the only place that creates router and bus and registers all services.
- **Preload:** exposes only `window.backshadeHost` with `platform` and a generic `transport` (`request`, `onEvent`), never `ipcRenderer`. The sandboxed preload cannot import other files: it repeats the IPC channel names of `src/shared/transport/ipc-channels.ts` and imports only types.
- **Interface:** `engine()` (`src/renderer/transport/engine.ts`) returns the typed `EngineClient` (`request(method, params)`, `on(event, listener)`), built on a `TransportChannel`; the IPC channel is the only one for now.
- **Shared code** (`src/shared/`) is compiled by both TypeScript configurations, so it must not use DOM or Node APIs; relative imports inside it use the `.js` extension.

Status: Confirmed (2026-11-23).

### Windows and menu

- About window (Phase 1.8): `src/main/window/about-window.ts`, fixed size, child of the main window, single instance, no menu; page `renderer/about.html` built from components, data from `app.getInfo`. It is opened from Settings (`window.openAbout`, available only through IPC).
- Application menu (`src/main/menu/app-menu.ts`): on macOS the standard menu with system roles (texts translated by the system) and the native About panel; on Windows and Linux no menu in packaged builds, Electron default menu during development (reload, developer tools).
- The application name and version shown in the interface come from `app/package.json` (`productName`, `version`).

Status: Confirmed (2026-11-23).

### Screen and sleep

Requested by the human on 2026-11-26: with the application open the screen must not turn off and the system must not go to sleep.

- `src/main/system/keep-awake.ts` starts `powerSaveBlocker.start('prevent-display-sleep')` when the application is ready and stops it at quit: native Electron API, no dependency. It prevents both the screen sleep and the system sleep (on Linux it registers an idle inhibitor with the session, checked on GNOME). (Confirmed)
- Always on while the application is open, with no setting. (Proposed)

## Start page

Requested by the human on 2026-11-23, after the Studio One start page. Developed as the first block of Phase 2, together with the show format (2.1), new, open and save (2.2) and recent shows (2.5).

- Full page inside the main window, in place of the sections: shown at launch and when a show is closed; reopened with a "Start" key in the top bar.
- Contents: recent shows (name, last modified date, folder; one click opens the show; shows moved or deleted are marked), the actions new show (name and folder) and open show from a folder, and the choice of the template for a new show.
- Not included for now: thumbnails, favorites and demo show.

Status: Confirmed (2026-11-23).

## Shows: implementation

Built in the first block of Phase 2 (2026-11-23).

- **Engine** (`src/main/shows/`): `ShowSession` holds the open show and is the only source of truth; `show-files.ts` reads and validates `show.json` (a newer `formatVersion` is refused), writes it atomically, keeps the last 10 saved versions in `history/` and writes the recovery copy in `autosave/` every 2 minutes when there are unsaved changes (and at quit). A show with unsaved changes is never replaced or closed silently: the engine answers `unsaved-changes`.
- **Recent shows:** `recent-shows.json` in the user data folder, at most 20 entries, updated on create, open, save and save as; missing folders are reported, never removed automatically.
- **Global settings:** `settings.json` in the user data folder (`defaultShowsFolder` for now).
- **Errors:** methods throw `EngineError` with a stable code (for example `unsaved-changes`, `invalid-name`, `show-not-found`); the interface translates codes in `errors.*` texts (`src/renderer/dialogs/show-error.ts`).
- **Names:** names chosen by the user become folder names without the characters forbidden on Windows, macOS or Linux; an existing folder gets a number (`Name 2.backshade`).
- **Interface:** `show-store.ts` mirrors the open show from the `show.changed` event; `show-commands.ts` runs the user operations (new, open, open recent, save, save as, rename, save as template, close) and asks to save unsaved changes before replacing or closing the show, and offers recovery when opening.
- **Start page:** it is the `start` section (key with the `house` icon). Without an open show it is the only reachable page besides the settings and the main section keys are disabled; when a show opens the last main section is restored.
- **Shortcuts:** Ctrl or Cmd + S save, + Shift + S save as, + N new show, + O open show.
- **Window close:** with unsaved changes the main window does not close; the engine sends `app.closeRequested`, the interface asks the user and then calls `app.confirmClose`.
- **Framework additions:** `TextField`, `TextArea`, `NumberField` (accepts comma or point as decimal separator, clamps to its limits), `ChoiceKeys`, `Dialog` (modal, Esc to cancel, focus kept inside), `ListItem`, `onShortcut`, `Key.setDisabled`; the base styles make the `hidden` attribute always win over component `display` rules and set `color-scheme: dark` for native controls.
- **Framework additions of Phase 3:** `SelectField` (native select styled as the text fields, with groups), compact `TextField` without a label (`ariaLabel`) and its `onChange` on confirmation, `Dialog` size `large` for editors, `TabBar` (flat tabs, 48 px high), `ChoiceKeys` without a label and with a `value` getter, `ListItem` `classes`, labels keep line breaks, palette color `warning` for functional indicators.
- **Desktop-only methods:** `requireDesktop()` (`src/main/transport/require-desktop.ts`) is the single guard used by every service.
- **Scrollbars** (`framework/scss/base/_scrollbar.scss`, requested by the human on 2026-11-23): themed like the console, 8 px (`space(1)`), transparent track, thumb in the key grey with the key border and a lighter tone on hover and drag, no arrow buttons; browsers without the webkit selectors get `scrollbar-color` with the same colors.
- **Value input controls** (requested by the human on 2026-11-23), to be used everywhere:
  - **durations:** always a `TimeField`, a key showing the time ("2.5 s", "1:15.0") that opens the time picker: large readout, `JogWheel` turned by dragging around its center (one turn is 10 s, 1 s in fine mode), mouse wheel and arrow keys, step keys (-1, -0.1, +0.1, +1 s), zero key and direct entry of the seconds;
  - **RGB colors:** always a `ColorWheel`: hue around the wheel (red at the top, clockwise), saturation from the center, brightness on a `LinearSlider`, plus R, G, B (0 to 255) and hex fields;
  - **fader and knob values:** every fader and every knob (trimmer), small or large, has a `RangeInput` under it, so the value can always be typed on the keyboard (displayed range configurable, for example 0 to 100 % or 0 to 255); control and field stay in sync also when the engine changes the value (`RangeControl.onRender`). Exception (decided by the human on 2026-11-24): the faders of the preset surface of the simple console show their value only in the display above them, without a field under them, to avoid repeating it.
- **Display of fader and knob values** (requested by the human on 2026-11-23): percentage (default) or 0 to 255, chosen in the Application settings separately for faders and for knobs (called "trimmer" in the Italian interface, at the human's request), saved per device (`localStorage`, keys `backshade.faderValues` and `backshade.knobValues`) and applied immediately, also to the other open windows. Every fader and knob of the interface is bound with `bindControlValue` (`src/renderer/preferences/control-values.ts`), which updates the typed field range, the value text of assistive technologies and the related displays.
- **System dialogs:** all file and folder pickers of the engine go through `src/main/window/file-dialogs.ts` and are available only through IPC; they always start from the nearest existing folder of the proposed path, so a default folder not yet created (for example `Documents/Backshade/Shows`) never triggers a system warning (fixed on 2026-11-24 at the human's request).

Status: Confirmed (2026-11-23).

## Show media

Built in Phase 2.4 (2026-11-23).

- The `media/` folder of the show is the only source of truth for media files: the list is read from the folder, so it can never disagree with the files on disk. Cues and tracks of later phases will reference media by their path relative to `media/`, always with `/` as separator.
- Accepted types by extension (`src/shared/show/media-kinds.ts`): audio (wav, mp3, aif, aiff, flac, ogg, m4a), video (mp4, mov, m4v, webm, mkv), image (png, jpg, jpeg, webp, gif, svg). Other files are skipped.
- Import copies the files (asynchronously, so large videos do not block the engine); a name already in use gets a number (`Name 2.wav`). Import and delete act on disk immediately and are not part of the unsaved changes of `show.json`.
- Every path coming from the interface is resolved inside `media/`; paths that leave it are refused (`invalid-media-path`).

Status: Confirmed (2026-11-23).

## Show settings

Built in Phase 2.7 (2026-11-23), stored in `show.json` under `settings` (`src/shared/show/show-settings.ts`):

- `description` and `notes`: free text;
- `timecodeRate`: `24`, `25` (default), `29.97df` (drop frame) or `30`;
- `fadeInSeconds` and `fadeOutSeconds`: default fades of scenes and cues, 0 to 600 seconds, default 0.
- Missing or invalid values in a file are completed with the defaults when the show is read; invalid values sent by the interface are refused (`invalid-params`).
- The settings section has two tabs: Application (saved on the workstation) and Show (saved with the show, available only with an open show). Show settings changes are unsaved changes of the show.

Status: Confirmed (2026-11-23).

## Archives

Built in Phases 2.6 and 2.9.4 (2026-11-23).

- Extensions: `.bshow` for shows, `.btemplate` for templates (confirmed by the human on 2026-11-23). Both are standard ZIP files, readable by any ZIP tool.
- Content: `archive.json` (`kind` show or template, `formatVersion` 1, `name`, `createdWith`) and `content/` with the files of the show or template folder, without `autosave/` and `history/`.
- ZIP implementation (`src/main/archive/`): text files (JSON, SVG, text) are compressed with deflate, media are stored without recompression and streamed; Zip64 is used for entries, offsets or archives over 4 GB. The reader supports store and deflate, checks CRC and size of every file and refuses paths outside the destination. Verified with `unzip` and `7z`.
- Export requires a saved show (the interface saves it first). Import extracts into a temporary folder, validates it and only then moves it to its final place; an invalid archive leaves nothing on disk (`invalid-archive`), an archive of the wrong kind is refused (`wrong-archive-kind`).
- Imported shows go to the default shows folder and keep their identifier (the same show moved to another workstation); imported templates go to the user templates folder.

Status: Confirmed (2026-11-23).

## Show operators

Requested by the human on 2026-11-26, in view of the multi-device work: every show can have its operators with a 4 digit PIN, each one with the working sections enabled or not. It replaces a first per-workstation setting of hidden sections, removed on the human's request: everything goes through the operators.

- **Saved in the show** (`operators` in `show.json`: `id`, `name`, `admin`, `access`, `pinSalt`, `pinHash`). The PIN is never saved in clear: scrypt with a random salt (Node.js `crypto`). A new show and a saved template never carry operators. (Confirmed)
- **Access per working section:** `hidden`, `view` (read only: the section is seen and played, not changed) or `edit`. (Confirmed)
- **Administrators** edit every section and manage the operators. Who creates the first profile of a show (the creator of the protection) is an administrator; more administrators are allowed; the last administrator cannot lose the role. (Confirmed)
- **Entering:** a show with operators asks for the PIN when it opens, on every workstation, the main one included; the operator key in the top bar leaves, so another operator can enter. A show without operators opens without a PIN. (Confirmed)
- **PIN rules:** login by PIN only, so PINs are unique in the show; 400 ms wait after a wrong PIN and 30 s lock after 5 wrong PINs in a row. (Proposed)
- **Engine check:** `RequestRouter.setGuard` runs before every method; `src/main/operators/method-rules.ts` gives every method a rule: `free` (application, windows, opening, saving and closing shows, PIN), `play` (allowed when one of its sections is shown, for example the grid keys play scenes and cues), `edit` (needs the section editable), `admin` (show settings, rename, save as template); unlisted methods only read and need an operator who entered. Errors: `operator-required`, `operator-not-allowed`. (Proposed)
- **Interface:** hidden sections lose their tab and are never opened (the requested section opens as soon as it becomes visible, for example after the PIN); a read-only section carries a notice above it; the show settings tab, with the Operators panel, is available only to administrators. Disabling the editing controls of read-only sections is a follow-up (ROADMAP 2.10.4). (Proposed)
- **Same PIN for several operators:** possible after an import (PIN hashes cannot be compared); the login then offers the names of the operators with that PIN. (Proposed)
- **Scope:** the operator who entered belongs to the instance and is forgotten when a show opens or closes; the remote interface (Phase 10) and the nodes (Phase 15) will have one operator per connection. Deleting the own and last profile removes the protection. (Proposed)

Status: Confirmed (request and polls of the human, 2026-11-26), Proposed (marked points).

## Import from another show

Requested by the human on 2026-11-26, with polls on the same day.

- **Where:** Settings > Show > "Import from another show", administrators only (method rule `admin`). The source is chosen among the recent shows or as a show folder. (Confirmed)
- **What:** categories and single items, each with a toggle (confirmed): scenes, chasers, fixtures (with LED matrices and groups), audio (playlist items and audio files), video (outputs, text gobos, timers and video files), images, operators. Audio, video and images mean the files and their configuration. (Confirmed)
- **Dependencies:** every item lists the items it needs, imported with it and marked "needed" in the dialog: chaser -> scenes; scene -> fixtures and matrices of its channels and effects, playlist item, video outputs, gobos, timers and media of its program; playlist item -> audio file; gobo -> mask image; group -> fixtures. Grid pages, cues and timelines are not imported. (Proposed)
- **Conflicts, chosen in the dialog** (confirmed): an occupied scene or chaser slot, overlapping DMX addresses, a media file with the same path and another content, an operator name already used. Add puts the item elsewhere: first free slot, first free address (same universe, then the next ones; a matrix goes to the first universe after the used ones), "name 2.ext", "Name 2". Replace takes the place, keeping the identifier of the replaced scene or chaser so references keep working; the operator who entered cannot be replaced. Skip leaves the item out; a skipped file uses the file of the open show. Fixture and group numbers in use are renumbered without asking; identical files are not copied again. (Proposed)
- **Rewriting:** imported items get new identifiers; references, media paths and the DMX channels of scenes follow moved fixtures and matrices. (Proposed)
- **PIN of the source** (confirmed): a source with operators asks for the PIN of one of its administrators, unless the administrator who entered the open show is one of them, with the same name and the same PIN (the PIN typed to enter is kept only in memory). A source without operators needs no PIN.
- **Operators into a show without operators:** the show becomes protected, so who imports enters as the source administrator of the PIN typed, imported with them when not chosen. (Proposed)
- Code: `src/shared/show/show-import.ts` (model), `src/main/show-import/` (catalog and plan), `src/main/services/show-import-service.ts`, `src/renderer/sections/settings/show-import-dialog.ts`.

Status: Confirmed (request and polls of the human), Proposed (marked points).

## Show templates

Requested by the human on 2026-11-23 (Phase 2.9).

- A template is a **complete show folder**, with the same format as a show (`show.json`, `media/`): creating a show from a template copies the folder and assigns a new name and identifier. There is no second format.
- Included templates live in the application (`app/templates`): "Empty show" and "Demo show". The demo (requested by the human on 2026-11-26, so that anyone can try the application) is a complete show: 20 fixtures of the included library in 3 groups, a 32 x 16 LED wall, 8 scenes (one with an LED effect, one with a video program), 3 chasers, 5 cues, a grid page for the show and one for media, an audio playlist, a video output (off by default, so no window opens by surprise), a text gobo, two timers and a timeline with light, automation, audio and video tracks. Its media files are generated for the project (synthesized audio, drawn images, a canvas video) and the Backshade logo. The demo is updated when new features deserve to be shown. (Proposed)
- User templates live in `templates/` in the user data folder (`app.getPath('userData')`), like the language packs: no administrator rights, they survive updates.
- The user creates a template with "Save as template" from the open show (name and description), and can export and import a template as a single archive, with the same format as the show export (2.6).
- Files: a template folder is `<name>.backshade/` with `show.json` and `template.json` (`name` and `description`, either a text or an object with one text per language code, used by the included templates). Template identifiers are `bundled:<folder name>` and `user:<folder name>`. Included templates live in `app/templates/`.
- Template management screen (requested by the human on 2026-11-23), opened from the start page: it lists included and user templates; user templates can be renamed, have their description edited and be deleted (with confirmation); included templates are read-only.

Status: Confirmed (2026-11-23).

## Fixtures and patch

Built in the first block of Phase 3 (3.1, 3.2, 3.3) on 2026-11-24.

- **Definition format** (confirmed by the human on 2026-11-24): Backshade's own JSON (`src/shared/fixtures/fixture-definition.ts`), with `formatVersion` 1, `manufacturer`, `model`, `category`, optional `physical`, `channels` and `modes`.
  - Channels have a `key` (letters and digits), a `name`, an `attribute` from a fixed list grouped as the console shows them (intensity, color, position, beam, effects, control), an optional `fineOf` (16-bit low byte of another channel), an optional `defaultValue` and optional `capabilities` (DMX ranges with a description, a known `kind` such as open, strobe, color, gobo, and a wheel `color`).
  - Modes list the channel keys in DMX order; optional `heads` list the channel keys of each cell of bars and matrices (for Phase 5).
  - Physical data (confirmed by the human on 2026-11-24, optional from the start so no migration is needed for the 3D stage): width, height, depth (mm), weight (kg), power (W), light source, lumens, color temperature (K), beam angle or zoom range, pan and tilt range (deg).
  - Fixture data texts (channel names, mode names, range descriptions) are in English, as in the manufacturer manuals, and are not translated.
- **Identifier:** `<manufacturer>/<model>` in slug form (`src/shared/fixtures/fixture-id.ts`), for example `clay-paky/sharpy`; it is also the file path in a library (`clay-paky/sharpy.json`).
- **Validation:** `validateFixture()` (`src/shared/fixtures/validate-fixture.ts`) is shared by engine and editor; it returns a clean copy or a list of problems with stable codes, translated in `fixtureIssues.*`.
- **Libraries** (`src/main/fixtures/fixture-library.ts`): included definitions in `app/assets/fixtures/` (read-only) and user definitions in `fixtures/` in the user data folder. A user definition with the same identifier replaces the included one, like the language packs; editing an included definition saves a user copy. Invalid files are ignored with a console warning.
- **Included library:** generic fixtures written for Backshade and a curated selection of common models, written in Backshade's format from the public technical data of the manufacturers (channel layout, DMX ranges, physical data). Reference lists of other projects may be used only to choose models and find their data, never copied as they are (decided by the human on 2026-11-24).
- **Shows reference definitions by identifier only** (confirmed by the human on 2026-11-24). A patched fixture also keeps the channel count of its mode, so its addresses stay reserved when the definition is missing. When a show is opened, the missing definitions are listed in a dialog, as the missing resources of Studio One, with import of definition files from the same dialog; the fixtures stay in the patch, marked as missing.
- **Patch** (`src/shared/patch/patch.ts`): `show.json` has `patch.fixtures`, each with `id`, `number` (fixture number for selection, unique), `name`, `definition`, `mode`, `channelCount`, `universe` (1 to 32768) and `address` (1 to 512). Missing or invalid entries are dropped when reading, so a damaged entry never blocks a show.
- **Address checks** (`src/shared/patch/address-map.ts`, shared): the engine refuses overlapping addresses, fixtures beyond channel 512 and duplicate fixture numbers; the interface suggests the first free address and number. Conflicts that can still appear (a definition edited to a longer mode, a file edited by hand) are shown in the patch.
- **Editing a definition used by the open show:** the patch follows it (new identifier after a rename, new channel count); addresses are never moved automatically.
- **Engine methods:** `fixtures.*` (list, get, validate, save, delete, import, export) and `patch.*` (get, missingFixtures, add, update, remove), events `fixtures.changed` and `patch.changed`. Show open results carry `missingFixtures`.
- **Interface:** Patch section with one table per universe (`src/renderer/sections/patch/`), add fixtures dialog (library list with search and category filter, mode, quantity, universe, start address, first number, name), fixture dialog (name, number, universe, address, mode, remove); fixture library and editor in `src/renderer/fixtures/`; missing definitions dialog in `src/renderer/show/dialogs/`.
- **Files:** definition files use the `.json` extension also for import and export.
- **Patch views** (requested by the human on 2026-11-24, chosen with keys in the section bar, remembered per device with `localStorage` key `backshade.patchView`):
  - **List:** one table per universe, as built first;
  - **DMX map:** the grid of the 512 channels of a universe, as in many light controllers. Used cells take a color of the fixture (channel colors, by fixture number) with a bar and the fixture number on the first address; addresses used by more than one fixture are outlined in the warning color. A used cell opens its fixture, a free cell opens "Add fixtures" from that address. Cells are at least 48 px for touch. The view is called "DMX map" ("Mappa DMX") so it is not confused with the Grid section (virtual console).
- **Fixture type icons** (requested by the human on 2026-11-24): every category has a Lucide icon (`src/renderer/fixtures/fixture-icons.ts`), shown in the patch list and in the library lists: dimmer `lightbulb`, PAR `cone`, LED bar `columns-4`, pixel bar `grid-3x2`, moving head `spotlight`, scanner `scan-line`, strobe `zap`, blinder `sun`, effect `sparkles`, laser `radar`, fog machine `cloud-fog`, hazer `haze`, other `circle-dot`; a missing definition shows `circle-help`.

Status: Confirmed (format, physical data, references by identifier with missing resources dialog, library source), Proposed (attribute and category lists, file extension, user definitions replacing included ones).

## DMX output and Art-Net

Built in the second block of Phase 3 (3.4, 3.5, 3.6) on 2026-11-24.

- **Configuration in the show** (confirmed by the human on 2026-11-24): `show.json` has `output` with `frameRate` (1 to 44 fps, default 40) and `universes`, the Art-Net destinations of the universes that differ from the default (`src/shared/output/output-config.ts`). Each destination has `enabled`, `portAddress` (0 to 32767: Net, Sub-Net, Universe), `transport` (`broadcast` or `unicast`) and `targets` (IPv4 addresses, at most 16).
- **Default destination** (confirmed by the human on 2026-11-24): Backshade universe 1 is Art-Net Port-Address 0 (universe N -> N - 1), broadcast; it can be changed per universe.
- **Broadcast or unicast per universe** (confirmed by the human on 2026-11-24), with the search of the nodes through ArtPoll (2.5 s) to choose unicast addresses.
- **Workstation settings** in `settings.json`: `outputEnabled` (default true) and `artNetInterface` (IPv4 address of the interface, empty for all the external interfaces). Broadcast goes to the directed broadcast address of the chosen interface, or of every external interface; the loopback interface sends to 127.0.0.1, for visualizers on the same computer. A chosen interface that is not available sends nothing rather than on a wrong network.
- **Art-Net** (`src/main/artnet/`): ArtDmx, ArtPoll and ArtPollReply built and read with Node.js `dgram`, no dependencies. The socket listens on port 6454 when it is free; when another program uses it, output still works from another port but the search of the nodes is not available (shown to the user).
- **Output engine** (`src/main/output/`): at the frame rate of the show every universe is composed and sent. Universes sent: those used by the patch and those configured, unless disabled. Sending is continuous (no change detection), which keeps nodes and their timeouts simple.
- **Merge** (`dmx-mixer.ts`): sources (programmer, playbacks and cues of the next phases) write channel levels. Intensity channels are merged HTP, all the others LTP (the last written wins); channels without sources take the default value of the definition. Intensity channels are the dimmer channels of a fixture, or its additive color channels (red, green, blue, white, warm and cold white, amber, UV, lime) when it has no dimmer. The grand master and the blackout scale only the intensity channels, 16-bit pairs as one value. Channels without a fixture count as intensity channels (changed on 2026-11-26, see Simple console). Grand master and blackout are not saved: every session starts at full and without blackout.
- **Interface:** new main section Output (`src/renderer/sections/output/`) with the grand master fader and blackout key, the Art-Net settings with the output status, the universes table with the destination dialog, and the DMX monitor. The blackout key is also in the top bar; when on it is active with the red bar of the armed state, in every window (`src/renderer/output/output-store.ts` follows `output.stateChanged`).
- **DMX monitor:** grid of the 512 channels of a universe like the DMX map of the patch, with value and level bar, in DMX values or percent (remembered per device, `backshade.monitorUnit`); values are read about 15 times per second while the section is open (`output.getFrame`).

Status: Confirmed (configuration in the show, numbering, broadcast or unicast with ArtPoll), Proposed (Output section and its layout, intensity rules of the merge, frame rate limits, continuous sending).

## USB DMX interfaces

Built in Phase 3.7 on 2026-11-24, with the native dependency chosen by the human (serialport).

- **Dependency:** only `@serialport/bindings-cpp` (the native part of serialport, without its streams and parsers), runtime dependency pinned to 13.0.1. It ships prebuilt N-API binaries for Windows, macOS and Linux (x64 and arm64), which load in Electron without a rebuild. It is loaded lazily (`src/main/usbdmx/serial-binding.ts`): if it cannot be loaded, USB DMX is shown as unavailable and the rest of the engine works. Packaging (Phase 11) must keep the native module outside the asar archive (`asarUnpack`).
- **Supported interfaces:** Enttec DMX USB Pro and compatible (message with label 6 "Output Only Send DMX Packet", the interface makes the DMX timing) and Open DMX USB with an FTDI chip only (250000 baud, 8N2, break of at least 1 ms before every frame, RTS low). The user chooses the type, because both use the same FTDI identifiers.
- **Workstation settings:** the interfaces are hardware of the computer, so they are saved in `settings.json` (`usbDmxDevices`: `id`, `path`, `type`, `universe`, `enabled`), not in the show; Phase 15 (hardware map) may move them into the show. A device is found again by its serial number, then by its path; ports not listed by the system are opened by path on macOS and Linux.
- **Engine:** every interface receives the frame of its universe at the frame rate of the show, from the same merge as Art-Net; a frame is skipped while the previous one is still being written. Interfaces not connected are searched again every 3 seconds; a write error closes the device and it is opened again when it comes back. The connection (connected, not connected, error, not sent) is part of the output state.
- **Interface:** panel "USB DMX interfaces" in the Output section, with a dialog to choose the serial port (FTDI ports first), the type, the universe and sending. Adding and removing interfaces is available only in the desktop application.
- Verified: the Enttec message byte by byte on a virtual serial port; Open DMX needs real hardware to be verified (break and 250000 baud).

Status: Confirmed (dependency), Proposed (settings on the workstation, supported types, reconnection).

## Simple console

Defined with the human on 2026-11-24 from the rendering `Backshade - console semplice` (artboard "Console a due preset A/B"), after the two-preset hardware desks. The grid console with free widgets is the virtual console of Phase 6. Reference products are not named in the project.

- **Preset surface:** two rows of 12 faders, Preset A and Preset B, each with a LED (on above 0), its value and a flash key; a row of displays between them shows what each fader controls.
- **Faders on raw DMX channels** (decided by the human): a fader controls one DMX channel of a universe; banks of 12 (or 24) channels move along the universe.
- **Modes:** A/B 2 x 12 (two prepared scenes with crossfade between Master A and Master B, B reversed as on the hardware desks) and single 24 channels (the two rows are 24 consecutive channels).
- **Masters and keys:** Master A, Master B, scene master (scenes and chasers recalled), grand master; fade time with the time field, chaser speed in bpm with tap; full on, blind (prepare without output), home (back to zero), record; blackout in the top bar.
- **Attributes panel** (decided by the human): selecting a fixture puts its channels on the faders, named after the definition; pan and tilt move with two jog wheels X and Y (16 bit), RGB with the color wheel.
- **Scenes and chasers:** two banks of 12 scenes (S) and one bank of 12 chasers (C) (changed by the human on 2026-11-26, replacing three banks of 12 mixed memories); a scene records the output of the preset and attributes; recall with fade.
- **Live cues** (confirmed by the human): a list of the recorded scenes in order, with Go, Back and Pause, current and next cue and the fade progress.

Implementation of 4.1 (2026-11-24):

- **Engine** (`src/main/console/preset-desk.ts`): the desk is the source `preset` of the mixer. It keeps the fader levels of every universe (rows A and B), so moving to another bank or universe never loses them. Output per channel: A/B mode the highest of A x Master A and B x (1 - Master B position); single mode the levels of row A x Master A (row B of the surface shows channels 13 to 24 of the bank, stored in row A); a held flash key gives 255 ignoring the masters. Only channels above 0 are written, so a fader at 0 never takes a channel from another source (scenes). Changed in 4.2: the masters scale only the intensity channels (see below).
- **Blind:** the faders change but the output keeps the last result; turning blind off applies the faders at once.
- **Full on:** applied by the output engine on every universe: intensity channels of the patched fixtures and every channel without a fixture at full; colors and movements of fixtures with a dimmer stay as they are; blackout still wins.
- **Home:** every fader of every universe back to 0.
- The state of the desk lives in the engine for the running session (like the physical faders of a desk) and is not saved in the show; every window follows `console.stateChanged`, `console.faderChanged` and `console.levelsChanged`. Universes controlled by a source are sent with Art-Net even when nothing is patched on them.
- **Interface** (`src/renderer/sections/console/`): Console section with the preset surface (bank keys, universe, mode, two rows of strips with channel number, fixture and channel name from the patch, display with the value, compact fader, flash; no typed field under these faders) and the masters panel (A, B with reversed scale, scenes, grand master, full on, blind, home). Framework additions: `Fader` size `compact` (144 px), `SquareKey.onHold` for momentary keys.

Status: Confirmed (2026-11-24).

Implementation of 4.2 (2026-11-25), choices confirmed by the human on 2026-11-25:

- **Layout:** the attributes panel is a separate panel below the preset surface and the masters, which stay on the raw DMX channels.
- **Selection:** several fixtures can be selected, one key per patched fixture in fixture number order (`fixture-selector.ts`). The order of selection is kept: the first fixture is the reference, and the panel shows its channels and values. The selection belongs to the window. Moves are applied by the engine to every selected fixture: the same channel key for the same model, otherwise the first channel with the same attribute (`generic`, `control` and `none` channels are not matched between models).
- **Same levels as the preset** (decided by the human): values are written into the levels of Preset A (`console.setAttributes`), so a channel of the panel and the raw fader of the same DMX channel are the same fader. Blind and home apply to the panel too. Several channels moved at once are announced with `console.fadersChanged` (one event per universe).
- **Masters only on intensity** (decided by the human, changes 4.1): Masters A and B and the crossfade scale only the intensity channels (as defined by the merge, `channel-map.ts`) and the channels without a fixture; 16-bit intensity pairs are scaled as one value. Every other channel (pan, tilt, gobo, colors of fixtures with a dimmer) is sent at the level of its fader: in A/B mode the row moved last wins (LTP). Non-intensity channels are written only after a fader moved them since the last home, so default values of the definition stay until then. The desk follows patch and definition changes (`PresetDesk.refresh`).
- **Channels** (`src/main/console/attribute-layout.ts`, `src/shared/console/fixture-attributes.ts`): one entry per channel of the mode in DMX order; a low byte (`fineOf`) is shown with its high byte as one 16-bit value. Values travel as 0 to 1 and become 8 or 16-bit levels.
- **Interface** (`attributes-panel.ts`, `attribute-strip.ts`, `position-wheels.ts`): a compact fader with display for each channel (display color by attribute group), except pan and tilt, which are on two jog wheels X and Y (one turn moves a quarter of the travel); the color wheel appears when the reference fixture has red, green and blue. Framework addition: `JogWheel` size `compact` (128 px).

Status: Confirmed (layout, selection, same levels as the preset, masters only on intensity), Proposed (matching between models, jog travel per turn, display colors).

Implementation of 4.3 and 4.4 (2026-11-26), choices confirmed by the human on 2026-11-26:

- **Data** (`src/shared/console/memories.ts`): `show.json` has `memories` with `scenes` and `chasers`, completed when missing (no format version change). A scene has `id`, `slot` (1 to 24), `name`, `fadeIn` and `fadeOut` in seconds, and `levels` (per universe, pairs of channel and value). A chaser has `id`, `slot` (1 to 12), `name`, `steps` (scene identifiers), `bpm` (1 to 600, one step per beat), `fade` (crossfade between steps as a part of the step time, 0 to 1) and `direction` (`loop`, `bounce`, `random`, `oneShot`).
- **Separate banks** (decided by the human): two banks of 12 scenes and one bank of 12 chasers, two rows of keys.
- **Record** (decided by the human): stores the result of the desk (preset faders and attributes panel, after Masters A and B, also while blind is on) on every universe; scenes being played are not included. Recording again on a used place keeps the scene identifier, name and fades, so the chasers using it follow. New scenes take the default fades of the show settings.
- **Fades saved in the scene** (decided by the human), changed in the scene dialog.
- **Several memories on together** (decided by the human): each memory key turns its scene or chaser on and off; each memory is a mixer source (`memory:<id>`) written in order of activation: intensity HTP, other channels LTP (the memory turned on last wins). Every channel follows the fades (decided by the human): intensity channels fade from and to zero and are scaled by the scene master; the other channels move between the output without the memory and their values, 16-bit pairs as one value (`widePairs` of the channel map), and also crossfade between chaser steps. When a memory is turned off, only the channels where it still gives the output fade back; channels taken since by other sources stay theirs. Release all turns every memory off with its fade out. Playback belongs to the running session and is not saved.
- **Steps reference scenes** (decided by the human): deleting a scene removes it from the chaser steps, after a warning with the number of chasers.
- **Speed per chaser** (decided by the human): each chaser saves its bpm; the tempo row (speed field and tap key) and the tempo display of the top bar act on the selected chaser, the last one turned on, created or edited. A one shot chaser turns off after its last step.
- **Mixer order of writing:** `DmxMixer.replaceSource` replaces a source keeping the order of writing of the channels whose value did not change, so a desk move or a fade never takes an LTP channel from a source written later. The desk uses it too.
- **Channels without a fixture** (correction of the merge of Phase 3.5, 2026-11-26): they are merged HTP and scaled by grand master and blackout like the intensity channels, also on universes with no fixture patched (before, blackout did not reach them).
- **Interface** (`memory-panel.ts`, `scene-dialog.ts`, `chaser-dialog.ts`, `tap-tempo.ts`, `shell/tempo-readout.ts`): Memories panel between the desk and the attributes panel, with the scene bank keys, Record (arms the scene keys for one press, asks before recording on a used place), Edit (the next key opens its dialog), Release all, the scene and chaser rows, and the tempo row with the current step. An empty chaser key opens the dialog to create a chaser. Tap tempo averages the last five taps and starts again after a pause of two seconds. Framework addition: `NumberField.setDisabled`.

Status: Confirmed (data shape, separate banks, record, fades in the scene, several memories on, steps by reference, speed per chaser), Proposed (one shot turning off, tap averaging, key labels).

Implementation of 4.5 (2026-11-26), choices confirmed by the human on 2026-11-26:

- **One cue list per show** (decided by the human): `memories.cues` in `show.json`, in number order. A cue has `id`, `number` (0.1 to 9999.9, one decimal digit, unique, to insert cues between others), `scene` (reference to a scene, like the chaser steps), `note`, `fadeIn` and `fadeOut` (null to use the times of the scene) and `follow` (seconds after its Go when the next cue goes by itself, null for manual). Deleting a scene removes its cues too, after the same warning as the chaser steps. New cues get the next whole number.
- **Crossfade on Go** (decided by the human): the previous cue fades out with its fade out while the new one fades in; only one cue is on stage. Back plays the previous cue the same way. Pause stops the fades and the follow wait; Go after Pause continues them. Release fades out the current cue, and the next Go continues from the cue after it. Pressing a cue in the list makes it the next one.
- **Follow with a wait** (decided by the human): the follow time counts from the Go of the cue and stops during Pause.
- **Scene master** (decided by the human): cues are played by the memory player as their own playbacks (mixer source `memory:<cue id>`), with the same merge and fades as the scenes, scaled by the scene master; Release all of the memory keys does not touch the cue list.
- **Engine** (`src/main/console/cue-stack.ts`, `src/main/services/cue-service.ts`): the state (`CueStackState`, `src/shared/console/cue-stack.ts`) gives the current and next cue, pause, and the fade and follow timings as elapsed and total milliseconds, so every window animates the progress with its own clock; `cues.stateChanged` is sent at every change and at the end of a fade.
- **Interface** (`cue-panel.ts`, `cue-dialog.ts`, `cue-progress.ts`, `cue-text.ts`): Cues panel between the memories and the attributes panel, with the list (number, scene, note, times, edit key), the add row, the current and next cue displays, the fade and follow bars, Go (large), Back, Pause and Release. The cue dialog sets number, scene, note and the optional times ("From the scene" or "Manual", or a time).
- **Attributes panel layout** (2026-11-26): the jog wheels and the color wheel stay on the row of the faders, and the faders scroll horizontally when they are many; the color wheel shows its fields beside the disc.

Status: Confirmed (one list, crossfade, scene master, follow), Proposed (cue numbers with one decimal digit, Release behavior, panel layout).

## LED matrices

Defined with the human on 2026-11-26 (Phase 5).

- **Pixels driven directly on DMX** (decided by the human): a matrix is its own object in the patch (`patch.matrices` in `show.json`, `src/shared/patch/matrix.ts`), not built from fixture definitions. It has `id`, `number` (shared with the fixture numbers), `name`, `width` and `height` (1 to 512, at most 16384 pixels), `pixelType` (`rgb`, `rbg`, `grb`, `gbr`, `brg`, `bgr`, `rgbw`, `grbw`, `w`), `startCorner`, `direction` (`rows` or `columns`), `snake` (zigzag) and the `universe` and `address` of the first pixel.
- **Several universes** (decided by the human): the matrix continues by itself on the next universes, each from address 1; a pixel is never split between two universes, so a universe holds as many whole pixels as fit (170 RGB, 128 RGBW). The parts on each universe (`matrixSegments`) are address ranges like fixtures: conflict checks, free address and number search work on fixtures and matrix parts together (`occupiedRanges`, `src/main/patch/patch-checks.ts`).
- **Merge:** matrix channels are intensity channels (additive colors without a dimmer): HTP, grand master and blackout.
- **Patch section** (decided by the human): "Add matrix" key and matrix dialog (`matrix-dialog.ts`) with the summary of pixels, channels and universes; every matrix part is a row of the universe tables and takes its cells in the DMX map (`patch-rows.ts`); the raw faders of the desk name matrix channels by pixel and color, for example "12 R".
- **Matrices section** (decided by the human): new main section after Patch, with one key per matrix and the live preview (`matrix-preview.ts`, canvas, about 15 readings per second of `matrices.getPixels`, colors in grid order; the white channel adds to the colors on screen).
- **Effects in the scenes** (decided by the human): the live effect of each matrix is set in the Matrices section and is part of the desk: it reaches the output at once (mixer source `matrix-live`, frozen while blind is on), the record key stores the live effects in the scene (`Scene.matrices`, matrix identifier -> effect) with the faders, and home turns them off. Memory keys and cues play the effects of their scenes, drawn about 40 times per second and faded like the intensity channels.
- **Effects** (`src/shared/patch/matrix-effect.ts`, `src/main/matrix/`): basic effects (solid color, gradient with angle, scroll, text) and preset animations whose colors can be chosen (requested by the human): rainbow, wave, sparkle, fire, pulse, plasma, chase. Every effect has the same flat parameters (colors, speed, direction, angle, size, text, font); `EFFECT_SPECS` tells which ones each kind uses and its default colors. Effects are drawn in the engine as RGB frames and turned into the channels of the pixel type; the white channel of RGBW pixels takes the common part of the colors.
- **Text with system fonts** (decided by the human): the interface draws the text with the chosen font at the height of the matrix (`text-mask.ts`, canvas) and stores the alpha image (base64) in the effect; the engine moves it, so the effect plays without any window open. Font families offered: generic families and common fonts; the system falls back when one is missing.
- **Pixel mapping from image** (5.4, decided by the human on 2026-11-26: image now, video with Phase 7 and 14.5): image effect with a raster image of the show media (`media.readImage`, base64, at most 20 MB, SVG excluded), sampled by the interface at the size of the matrix with fill (cover and crop), whole (bars) or stretch (`image-sampler.ts`, `createImageBitmap`, no change to the Content Security Policy), stored in the effect as RGB pixels; still by default, it can move and repeat in a direction.
- **Interface:** effect panel beside the preview (`effect-panel.ts`): effect and animation keys, color keys opening the color wheel (`color-swatch.ts`, live while the wheel moves, Cancel restores), sliders for speed and size, direction keys, angle field, text and font.

Status: Confirmed (pixels on DMX, several universes, Patch and Matrices sections, effects in scenes, system fonts, preset animations with chosen colors), Proposed (pixel types, limits, preview, list of animations and their parameters, white channel rule, live effect frozen by blind).

## Fixture groups

Defined with the human on 2026-11-26 (introduced with Phase 6).

- **Groups** (`src/shared/patch/groups.ts`): named sets of patched fixtures saved in `patch.groups` (`id`, `number` 1 to 999, `name`, `fixtures` in the chosen order). Removing a fixture removes it from its groups.
- **Patch section:** "Groups" key with the list of groups and the group editor (number, name, fixtures chosen with keys); delete keeps the fixtures.
- **Attributes panel:** group keys select the fixtures of a group (the first one is the reference); "Save as group" stores the current selection with the next free number.
- **Group level** (`src/main/console/group-levels.ts`, proposed): a group fader puts the intensity channels of its fixtures at its level (16-bit as one value), as mixer source `groups`, HTP with the desk and the memories, like the submasters of a desk; fixtures without a dimmer get their additive colors (white light). Levels belong to the running session; home brings them to zero.

Status: Confirmed (groups introduced now, group faders), Proposed (storage in the patch, group level rule).

## Virtual console

Defined with the human on 2026-11-26 (Phase 6), in the Grid section.

- **Pages** (`src/shared/grid/grid.ts`, `grid` in `show.json`): each page has a name, columns (1 to 32) and rows (1 to 24); square cells adapt to the width of the window (decided by the human); at most 50 pages and 400 widgets.
- **Widgets:** key, fader, knob, color picker, XY pad, label, monitor; each takes a rectangle of cells, has an optional label (otherwise the name of what it controls) and a link. Links: scene, chaser, cue list action (go, back, pause, release), master (A, B, scene, grand), group, raw DMX channel (row A of the desk), desk command (blackout, full on, blind, home). `WIDGET_LINKS` lists the links each type accepts; media links come with Phase 7 (decided by the human).
- **Behavior:** keys toggle scenes and chasers, run cue actions and desk commands, flash groups and channels while held; faders and knobs set levels; a fader on a scene or chaser is its level (decided by the human): above zero the memory is on, intensity follows the fader, the other channels take their values as soon as it leaves zero, zero stops it (`memories.setLevel`, `MemoryPlayback.level`); color picker and XY pad set RGB and pan/tilt of a group through the attributes service; monitors show the current and next cue, chaser tempo and step, or a level.
- **Run and edit mode:** in edit mode empty cells add widgets, a widget is pressed to open its dialog (type when added, label, link, size, delete), dragged to move it and resized from its corner; pages are added, changed (name, size; widgets are moved inside) and deleted. The interface edits a copy and sends the whole grid (`grid.set`), checked by the engine; the chosen page is remembered per device (`backshade.gridPage`).
- **Interface** (`src/renderer/sections/grid/`): `GridStore` follows desk, output, memories, cues, groups and the channels in use; widgets refresh at most once per frame. Framework additions: `Fader` size `fill`, `XyPad`.
- **Touch** (6.6): every control uses pointer events with one drag per pointer, so several faders and keys work at the same time (checked with two fingers); controls block scrolling while dragged.
- **MIDI mapping** (6.5) waits for the shared MIDI layer of Phase 16.

Status: Confirmed (adaptive cells, groups, scene fader level, media with Phase 7), Proposed (widget sizes and limits, flash behavior of group and channel keys, monitor texts).

## Audio and video

Defined with the human on 2026-11-26 (Phase 7). Audio first, then video (decided by the human).

- **Playback window** (decided by the human): a hidden window started by the main process (`src/main/playback/playback-window.ts`, page `renderer/playback.html`, preload `playback-preload.ts`) plays the sound and will drive the video outputs; playback continues whatever section is open. The engine sends commands and receives reports (`src/shared/audio/playback-protocol.ts`, own IPC channels); commands wait in a queue until the window is ready. Video outputs will be windows that can be smaller than the screen, with chosen display, position and size, or fullscreen, and an order of stacking between them (requested by the human).
- **Show media for playback:** the app protocol serves the media of the open show at `/show-media/<path>`, with byte ranges for seeking (`src/main/protocol/show-media-route.ts`); nothing is served without an open show.
- **Sections** (decided by the human): new main sections Audio and Video; Media stays the archive of the files.
- **One audio player with a playlist** (decided by the human), saved in `show.json` under `audio` (`src/shared/audio/audio.ts`): output device (empty for the system output), volume, auto advance, items. Each item (requested by the human) plays a media file between a start and an end time (or the end of the file), with fade in, fade out, volume and repeat. One item plays at a time; a new one crossfades with the playing one (the old one fades out with its own fade).
- **Audio in scenes** (decided by the human): the record key stores the item playing in the scene (`Scene.audio`); turning the scene or cue on plays the item with its settings but the fades of the scene or cue, turning it off fades it out and stops it if it is still playing; a scene fader sets its volume. Chasers do not start audio (proposed).
- **Audio engine** (`src/main/audio/audio-engine.ts`): one voice per playing file; the playback window plays voices with Web Audio (element source, gain per voice, master gain, `AudioContext.setSinkId` for the output) and reports positions about four times per second. Audio outputs are listed by the playback window, the only one allowed the media permission (device names).
- **Grid:** keys can play, pause, stop, go to the next or previous item; a monitor shows the item playing and the time left (media links of Phase 6.3).
- **Interface** (`src/renderer/sections/audio/`): player panel (item, elapsed and remaining time, progress, transport keys, volume, output, auto advance) and playlist (play, move, change, add from the show media).

Status: Confirmed (playback window, sections, one player with playlist, item settings, audio in scenes with the fades of the scene), Proposed (crossfade between items, chasers without audio, transport layout).

Video outputs (7.3, 7.4, 7.6), defined with the human on 2026-11-26:

- **Outputs** (`src/shared/video/video.ts`, `video` in `show.json`): each output has a name, on or off (window open), display, fullscreen or a window at a position and size from the top left corner of the display, an order of stacking (higher above; windows are raised in order) and a number of layers (1 to 8). Displays are listed by the main process (`screen`).
- **Layers per output** (decided by the human): bottom to top; each layer shows a video or an image of the show media, or nothing, with opacity, fit (fill, whole, stretch) and repeat for videos. Videos of the outputs are muted (proposed).
- **Preview and program as on a vision mixer** (decided by the human): program is what goes out, preview the next composition; Take brings the preview to program with a transition time (zero is a cut), on one output or on all; layers can also be changed directly in program. Program and preview belong to the running session.
- **Scenes record the program** (decided by the human): the program of the outputs that show something (`Scene.video`); turning the scene or cue on puts it on the outputs with its fade in, turning it off brings back the program it replaced, where it is still its own, with its fade out. Videos start again from the beginning.
- **Output windows** (`src/main/video/output-window.ts`, page `renderer/video-output.html`, preload `video-output-preload.ts`): frameless windows sent the composition and the transition time by the engine (`src/main/video/video-engine.ts`).
- **Composition** (`src/renderer/video/composition-view.ts`, proposed): layers are stacked video and image elements; a new source fades in over the old one with CSS opacity transitions. The same component shows preview and program in the Video section. WebGL comes with the videomapping of Phase 14.
- **Interface** (`src/renderer/sections/video/`): output keys (red bar when the window is open), output settings dialog, preview and program side by side with the aspect ratio of the output and their layers (top layer first), transition time, Take and Take all. New color token `video-black` (true black of the outputs).

Status: Confirmed (layers per output, preview and program with Take, scenes record the program, window position, size, fullscreen and stacking), Proposed (CSS composition, muted videos, recording only outputs that show something).

Video inputs (7.5), defined with the human on 2026-11-26:

- **Source of a layer:** a video input of the computer (camera, capture card) besides videos and images: `{ kind: 'input', device, label, quality, frameRate }`. The device is found again by its name when its identifier changes; an input not connected stays in the list with its name.
- **Quality per layer** (decided by the human): 720p, 1080p or 2160p and 25, 30, 50 or 60 fps, asked as ideal values: the device uses the nearest it supports.
- **Live image in the monitors too** (decided by the human): the output windows and the preview and program of the Video section open the same input (shared by Chromium).
- **No sound from inputs** (decided by the human): external audio comes with the mixer integration of Phase 9.
- **Media permission** (`src/main/security/media-permissions.ts`): cameras, capture cards and device names are allowed only to the windows on the internal protocol; inputs are listed by the playback window (`video.listInputs`).
- Tests use the fake camera of Chromium (`--use-fake-device-for-media-stream`), so no real camera is turned on.

Status: Confirmed (live monitors, quality per layer, no sound), Proposed (finding the device by its name).

## Brand

- Backshade is a product of **Aptec Studio** (website `https://www.aptecstudio.com`). Aptec Studio is the project name of the owner, not a separate legal entity, as in the WooJam project.
- Brand assets are taken from the `aptecstudio/woojam` repository and stored in `docs/brand/`.
- `docs/brand/aptecstudio-wordmark.png`: Aptec Studio wordmark, light letters for dark backgrounds, 1080 x 200 px. It is a logo image, so its uppercase lettering is not covered by the no-uppercase text rule.
- Credit line used in the interface and on the landing site: "Un prodotto Aptec Studio" (Italian) and "A product by Aptec Studio" (English), with the wordmark linking to the website.
- Copyright notice: "Copyright (C) 2026 Aptec Studio".
- Official Backshade logo: provided by the human on 2026-11-22 in `docs/logo/` (`icon-512.png` and `icon-maskable-512.png`, with their `.psd` sources). It replaces the temporary line mark and the "08a crossed beams" reference. Derived platform and web icons are in the same folder (see `docs/logo/README.md`).
- Logo colors: background `#33343a`, mark `#ebe8e0`.
- The `.psd` files are the masters: derived icons are regenerated from the PNG exports, never edited by hand.

Status: Confirmed (2026-11-21, logo 2026-11-22).

## Repository structure

The repository contains two separate projects, each with its own `package.json`:

| Folder | Content | Technologies | Status |
| --- | --- | --- | --- |
| `/app` | Electron application | HTML, TypeScript, SCSS, internal frameworks | Confirmed |
| `/landing` | Static bilingual website (English and Italian) | Astro, TypeScript, Tailwind CSS | Confirmed (JavaScript replaced by TypeScript on 2026-11-23) |

Shared files (`AGENTS.md`, `ROADMAP.md`, `MEMORY.md`, `README.md`, `LICENSE`, `.editorconfig`, `.gitignore`) stay in the repository root.

### `/app` structure

```
app/
  src/
    framework/
      ts/        # internal TypeScript framework (DOM, events, base components)
      scss/      # internal SCSS framework (tokens, base, components)
    main/        # Electron main process, engine, web server
    preload/     # secure IPC bridge between main and interface
    renderer/    # web interface: pages, app code and app styles
    locales/     # interface texts, one JSON file per language
    shared/      # shared constants and models
  scripts/       # build scripts (TypeScript run by Node)
  dist/          # compiled output, not committed
    node/        # main process and preload
    web/         # interface served by app://, framework included
  assets/
    icons/
      lucide/    # Lucide icons, one SVG file per icon, copied unchanged
    fixtures/    # fixture library
    models/      # 3D .obj models (truss, stage, fixtures)
  build/         # packaging resources
```

- The two internal frameworks live **only** in `src/framework/ts` and `src/framework/scss` (requested by the human on 2026-11-23): framework code is never scattered in other folders, and application code never lives inside `src/framework`.
- `dist/` is generated by `npm run build` and ignored by git; `npm start` builds before launching.
- `npm run catalog` opens the component catalog (`renderer/catalog.html`, sections in `renderer/catalog/`) instead of the main page, to develop the components and compare them with `docs/design`. The `--catalog` option is ignored in packaged builds.
- The interface is served from `dist/web` through the internal `app://backshade/` protocol instead of `file://`, so native ES modules and the Content Security Policy work; the same folder will be served by the remote web server.

Status: Confirmed (2026-11-23).

### `/landing` structure (proposed)

```
landing/
  src/
    pages/       # pages, with en/ and it/ locales
    layouts/     # page layouts
    components/  # Astro components
    i18n/        # translation strings
  public/        # static assets (icons, images, favicon)
```

- Static output only (`output: 'static'`), no server-side rendering.
- Astro is the only framework dependency of the site; it does not affect the application.

Status: Proposed.

## Code style

### TypeScript

TypeScript replaces JavaScript in the whole project (decided by the human on 2026-11-23, replacing the ES2017 JavaScript rules).

- Compiler: `tsc` from the `typescript` package, without a bundler; output target **ES2022**, modern TypeScript syntax allowed.
- `strict` mode and the checks in `app/tsconfig.base.json` (no unused locals or parameters, no implicit returns).
- Configurations, one per context:
  - `tsconfig.node.json`: main process and `preload`, compiled to CommonJS in `dist/node` (`module: nodenext`);
  - `tsconfig.web.json`: interface and TypeScript framework, compiled to native ES modules in `dist/web`, with DOM types and no Node types;
  - `tsconfig.scripts.json`: type check only for the build scripts in `scripts/`, written as `.mts` and run directly by Node (type stripping, Node 22.18 or later).
- Imports in the interface use the `.js` extension (for example `'../framework/ts/index.js'`), so the browser resolves them without a bundler.
- Vendored libraries (Lucide, three.js) are used as distributed.
- 4-space indentation, single quotes, mandatory semicolons, opening brace on the same line.
- Single responsibility (requested by the human on 2026-11-23): each file is a component with one specific task. Different contexts or roles (for example engine logic and interface, transport and rendering, data model and view) are never mixed in the same file. A file that grows to cover more than one task is split.
- Naming: `camelCase` for variables and functions, `PascalCase` for classes, types and interfaces, `UPPER_SNAKE_CASE` for constants.
- Comments in English (changed from Italian on 2026-11-23), documentation with JSDoc/TSDoc. Log and developer error messages are in English too; texts shown to the user always come from the language packs.

Status: Confirmed (2026-11-23).

### Interface structure

- The whole interface structure is built and managed through **components written as TypeScript classes** (decided by the human on 2026-11-23). HTML pages contain only the document head and the entry script; every visible element is created by a component.
- Native Web Components (`customElements`, Shadow DOM) are **not** used.
- Generic components (controls, layout, text) live in the TypeScript framework; application components (sections, pages) live in `src/renderer` and are built from the framework components.
- Components receive texts already translated: the framework does not depend on the localization files.

Status: Confirmed (2026-11-23).

### Reordering by drag and drop

Requested by the human on 2026-11-26: every element that can be reordered is moved by drag and drop, with mouse, pen or touch, never with up and down keys.

- Framework `makeSortable` (`framework/ts/list/sortable.ts`, styles `components/_sortable.scss`): the item follows the pointer, the other items move aside with an animation to show where it will land, the dragged item settles in its place before the list is rebuilt; the list scrolls near its edges; with the mouse the drag starts after 4 px, with touch after a press of 250 ms (a finger that moves first scrolls the page). Animations are off with the reduced motion preference.
- Items that accept others (timeline folders) receive the dragged item when the pointer is over their middle (dashed outline); near their top or bottom edge the item goes before or after them.
- Fields and keys inside an item do not start a drag, unless they are marked `data-sortable-handle` (the name of a track header, the rows of the cue list); an optional handle selector limits the drag to a part of the item (the track headers, so dragging on the lanes stays for the clips).
- Used by: timeline tracks (also into and out of folders), chaser steps, audio playlist (`audio.moveItem` to a place), channels of a fixture mode, cue list (`cues.move`: the cue takes a number between its neighbours with one decimal digit, or every cue is numbered again when there is no room), video layers of program and preview (`video.moveLayer`).

Status: Confirmed (drag and drop only, cue list and video layers included), Proposed (thresholds and animation times).

### Application layout

Built in Phase 1.5 after the console reference rendering (`docs/design/console.png`), entirely from components (`src/renderer/shell/`):

- `AppShell`: top bar, section area and status bar; only the section area scrolls.
- `TopBar`: `BrandBlock` (logo, "Backshade" in the accent color, name of the open show or "No show open"), timecode and tempo displays, Start and Settings keys.
- Section navigation (moved into the status bar at the human's request on 2026-11-24): `SectionTabBar` shows the main sections (console, grid, timeline, patch, output, media) as flat tabs (framework `TabBar`) in the middle of the status bar; the active tab has the accent label and an accent bar on its top edge, as the states of the keys; disabled without an open show.
- `SectionNavigation`: open section and change notifications; the last open section is remembered per device (`localStorage`, key `backshade.section`).
- `SectionHost`: shows the open section; the previous section component is destroyed and the new one created when the section changes.
- `StatusBar`: application status on the left, section tabs in the middle, "A product by" with the Aptec Studio wordmark linking to the website on the right.
- Sections are declared in `src/renderer/sections/section-definitions.ts` (identifier, text, optional icon, factory). Main sections: console, grid (virtual console), timeline, patch, matrices, audio, video, output, media; settings has its own key.
- Settings: `SettingsSection` collects one panel per setting; the first is `LanguageSettings`.
- Timecode and tempo show neutral values (`00:00:00:00`, `---.-`) until the engine provides them.
- The blackout key of the reference is in the top bar since the output engine (Phase 3.5).
- Fullscreen key (requested by the human on 2026-11-26): last key of the top bar, icon only (Lucide `maximize`, `minimize` when fullscreen, active state while fullscreen); it follows fullscreen changes made by the system too (`window.fullScreenChanged`) and is hidden outside the desktop application. Framework addition: `Key.setIcon`.
- Narrow windows: the show name is shortened with an ellipsis; with the navigation in the status bar the timecode and tempo displays always fit down to the minimum window width (1024 px).
- Images used by the interface live in `app/assets/images/` (copied from `docs/logo` and `docs/brand`) and are served at `/assets/images/`.

Status: Confirmed (2026-11-23).

### Internal TypeScript framework

Replaces jQuery (2026-11-23). It lives in `app/src/framework/ts`, exposes its public modules through `index.ts` and contains only reusable code with no application logic.

- `dom/query.ts`: element selection (`query`, `queryAll`).
- `dom/create.ts`: element creation with classes, attributes, text and children (`create`); text is always inserted as text, never as HTML.
- `dom/events.ts`: listeners that return their own removal function (`on`, `delegate`).
- `i18n/translator.ts`: typed translator (`createTranslator`) with dotted keys, `{name}` placeholders and fallback to the reference language; `i18n/language-pack.ts`: loading and validation of language packs and of the language list; `i18n/negotiate-locale.ts`: choice of the language among the available ones; `i18n/apply-translations.ts`: translation of `data-i18n`, `data-i18n-title` and `data-i18n-aria-label` attributes.
- `net/fetch-json.ts`: JSON download; `storage/local-preference.ts`: preference saved on the device (`localStorage`), safe when storage is unavailable.
- `icons/icon.ts`: icon creation from the sprite (`icon(name)`); `icons/icon-names.ts` is generated by the build and must not be edited by hand.
- `core/component.ts`: base class `Component` of every component: root `element`, `mount(target)`, `append(...children)`, `destroy()` (children, listeners and element); `listen()` and `track()` register cleanups released by `destroy()`.
- `core/emitter.ts`: typed `Emitter` used for presses and value changes; components expose `onPress(listener)` or `onChange(listener)`, which return the removal function.
- `layout/stack.ts` (`Stack`), `layout/spacer.ts` (`Spacer`), `text/label.ts` (`Label`), `text/external-link.ts` (`ExternalLink`, opened in the system browser), `media/image-view.ts` (`ImageView`), `panel/panel.ts` (`Panel`): structure, text and images.
- `keys/`: `Key` (soft key with states normal, inactive, active, the armed bar and an icon-only variant), `SquareKey` (flash, solo, select), `FunctionKey`.
- `displays/`: `ChannelDisplay` (name, value, level bar in the channel color), `ReadoutDisplay` (timecode and tempo), `ValueDisplay` (caption and value).
- `controls/`: `RangeControl` (shared base: value from 0 to 1, slider role, keyboard, mouse wheel, `setValue(value, notify)`), `Knob` (vertical drag, Shift for fine adjustment), `Fader` (cap drag without jumps, click on the travel to move the cap, printed scale), `fader-scales.ts` (`LIGHT_SCALE`, `AUDIO_SCALE`), `pointer-drag.ts` (pointer capture).
- `theme/`: `SpacingStep` and `ChannelColor`, which mirror the SCSS tokens.
- Values set by the engine use `setValue(value)` without notification; only user actions notify `onChange`, so the engine stays the source of truth.

Status: Confirmed (2026-11-23).

### SCSS and the internal SCSS framework

SCSS replaces Tailwind CSS in `/app` (2026-11-23). Compiled with Dart Sass (`sass` package) using the module system (`@use` and `@forward`, never `@import`), with `src` as the load path.

- `app/src/framework/scss/tokens/`: design tokens that generate no CSS: spacing (`space(n)`, raises an error outside the scale), colors (`color(name)`), typography (`$font-*`), radius (`$radius-*`); collected by `tokens/_index.scss`.
- `app/src/framework/scss/base/`: reset and document styles; generates CSS and is included once.
- `app/src/framework/scss/components/`: one partial per component (BEM class names, for example `.key`, `.key--active`, `.key__led`), collected by `components/_index.scss`. Material colors of the realistic controls (knob and fader cap) are local variables of their partial, taken from the reference renderings.
- Knobs are drawn concentric: knurled ring, smooth cap and indicator share the same center (corrected on 2026-11-23 at the human's request; the cap was offset upward).
- Dynamic values (fader position, knob angle, level) are passed to CSS through custom properties set with the CSSOM (`style.setProperty`), which the Content Security Policy allows; inline `style` attributes are never used.
- Application styles live in `app/src/renderer/styles/` and use the framework; `main.scss` is the single entry point.
- Values always come from the tokens: no hard-coded spacing or colors in the application styles.

Status: Confirmed (2026-11-23).

### HTML and CSS

- 4-space indentation, double-quoted attributes.
- No inline styles or scripts: the Content Security Policy allows only files from the application.
- File and folder names in `kebab-case`; SCSS partials start with `_`.

Status: Confirmed (2026-11-23).

## Dependencies (proposed)

Principle: as few dependencies as possible.

| Dependency | Type | Reason |
| --- | --- | --- |
| `electron` | development | Application runtime |
| `typescript` (7.x) | development | TypeScript compiler (`tsc`) for the application, the framework and the build scripts (confirmed on 2026-11-23) |
| `sass` (Dart Sass) | development, `/app` only | SCSS compiler for the application and the SCSS framework (confirmed on 2026-11-23) |
| `tailwindcss` | development, `/landing` only | Styling of the landing site (the application uses SCSS) |
| `astro` | development, `/landing` only | Static site generator for the landing site |
| `electron-builder` | development | Packaging for the three platforms |
| Lucide | vendor | Line icon library (ISC license), version 1.78.0, individual SVG files with a sprite generated at build (confirmed) |
| `@serialport/bindings-cpp` (13.0.1) | runtime, `/app` only | Native access to the serial ports for the USB DMX interfaces (confirmed by the human on 2026-11-24, Phase 3.7) |
| three.js | vendor | 3D stage modeling and fixture emulation (MIT license), including its `OBJLoader` (confirmed by the human on 2026-11-22, see Phase 13) |

Features built with native APIs, without extra dependencies:

- ZIP archives (`.bshow`, `.btemplate`): internal reader and writer on Node.js `zlib`, with Zip64 (decided by the human on 2026-11-23).
- Art-Net: UDP through Node.js `dgram` (built in Phase 3.4).
- DOM manipulation: internal TypeScript framework (replaces jQuery).
- Web server: Node.js `http` module.
- OSC for external mixers: UDP through `dgram`.
- MIDI for mixers and controllers: Chromium Web MIDI API.

To be evaluated in the related phases (to be proposed with a poll):

- Server-side WebSocket: `ws` or a minimal internal implementation.

Status: Proposed.

## Show format

Confirmed by the human on 2026-11-23.

- Each show is a folder `<show name>.backshade/` containing:
  - `show.json`: **all** the show data in a single file (patch, scenes, chasers, grid, timeline, as the phases add them), with `formatVersion` to handle future migrations;
  - `media/`: audio, video and image files used by the show;
  - `thumbnails/`: generated previews;
  - `autosave/`: recovery copy written by the autosave;
  - `history/`: the last saved versions of `show.json`, kept as backups.
- All internal paths are **relative** to the show folder, so the folder is portable between devices.
- Imported media are copied into `media/`.
- Cloning a show means copying the folder and assigning a new identifier.

### Saving

- **Manual save plus autosave**, as in Studio One: explicit Save and Save as; every few minutes, if there are unsaved changes, a recovery copy is written to `autosave/`. When a show with a recovery copy newer than `show.json` is opened (for example after an unexpected exit), the interface offers to recover it. A clean save or close removes the recovery copy.
- Every save keeps the previous `show.json` in `history/` (last versions only).
- Writes are atomic: the new file is written next to the old one and then renamed, so a crash never leaves a half-written `show.json`.

### Default folder

- New shows are created by default in `Documents/Backshade/Shows`; the folder can be changed for each new show and, as the default, in the settings (requested by the human on 2026-11-23).

Status: Confirmed (2026-11-23).

## Design system

### Spacing

Single scale, multiples of 8 only: `8, 16, 24, 32, 48, 64` px. No other values are used.

Status: Confirmed (proposed scale).

### Colors

Dark theme only. Neutral dark greys for surfaces, a single accent color for active states and desaturated status colors (green, amber, red) only for functional indicators. No glow. Gradients and shadows only on realistic controls (see Visual model).

Status: Proposed (dark theme, no glow and realistic controls confirmed on 2026-11-22).

### Typography

- System font (`system-ui`) for text, system monospace for numeric values.
- Two weights only: 400 and 500.
- No uppercase text (`text-transform: uppercase` is forbidden).

Status: Proposed.

### Icons

- Single library: **Lucide**, line icons only, uniform stroke width.
- Never emoji or emoticons.
- Sources: one SVG file per icon in `app/assets/icons/lucide/`, copied unchanged from `lucide-static` 1.78.0, with the Lucide `LICENSE`. Only the icons used by the interface are kept (decided by the human on 2026-11-23).
- Build: `scripts/build-icons.mts` generates the sprite `dist/web/assets/icons.svg` (one `<symbol>` per icon, served at `/assets/icons.svg`) and the type `IconName` in `src/framework/ts/icons/icon-names.ts`, so a wrong icon name is a compile error.
- Rendering: `icon(name)` creates an `<svg class="icon">` that references the sprite; stroke and color come from `.icon` in the SCSS framework (stroke width 2, `currentColor`), sizes `space(2)` and `space(3)` (`.icon--large`).

Status: Confirmed.

### Visual model

Hardware skeuomorphism, defined on 2026-11-22 (it replaces the earlier cream and anthracite hybrid drafts):

- the theme is always dark;
- panels and cards are flat, on a smooth dark surface;
- controls are realistic: ribbed metal fader caps on thin slots with a printed scale, small knurled knobs, soft keys with a light gradient and shadow, small per-channel displays;
- states use solid colors: accent label, small LED in the key corner, colored bar on the top edge; no glow.

The approved reference renderings, components and palette are in `docs/design/README.md`.

Status: Confirmed (2026-11-22).

## 3D stage

Requested by the human on 2026-11-22:

- the stage is modeled in 3D with **three.js**;
- Backshade ships with ready-to-use `.obj` models of truss, the stage itself and the most used fixtures;
- the model library also includes musicians with their instrument (drummer, guitarist, bassist, pianist, singer) and stage elements (amplifiers, risers and platforms, wedge monitors, PA speakers, stands, cases), requested by the human on 2026-11-23;
- the 3D stage emulates the fixtures in brightness, colors and movements.

Points to define in Phase 13 (to be proposed with a poll):

- how three.js is vendored: the module build and the needed addons (`OBJLoader`, camera controls), imported as native ES modules (see Code style);
- source and license of the bundled `.obj` models (made in-house or taken from a source compatible with GPL-3.0, such as CC0);
- materials and textures (`.mtl` files) or materials defined in code;
- model location: proposed `app/assets/models/` with `truss/`, `stage/`, `fixtures/`, `musicians/` and `stage-elements/` subfolders.

Status: Confirmed (request), Proposed (open points).

### Video outputs in the 3D stage

Requested by the human on 2026-11-23: the 3D stage also emulates the video outputs, so the whole show can be pre-programmed. It includes (Phase 13.9):

- screens and LED walls showing the real program output of the linked video output as a live texture;
- virtual projectors with lens and position, projecting on the stage surfaces and models;
- the preview of the videomapping (warp, masks, edge blending) on the 3D surfaces.

Status: Confirmed (2026-11-23).

## Videomapping

Requested by the human on 2026-11-23 (Phase 14). Supported features:

- 2D warp on the output: corner pin, mesh warp, masks, input crop;
- edge blending between overlapping projectors;
- 3D mapping on the stage models with virtual projectors calibrated on the real ones;
- pixel mapping of the video on LED walls and LED matrices.

Proposed technical choices:

- rendering with WebGL in the fullscreen output windows, through three.js (already a dependency), without new libraries;
- mapping settings and presets saved in `show.json`.

Status: Confirmed (features), Proposed (technical choices).

## Multi-device

Requested by the human on 2026-11-23 (Phase 15): several machines work on the same show in real time and in sync.

- **Architecture: master and nodes** (confirmed by the human on 2026-11-23). The master holds the show and the clock and is the source of truth; the other machines are full Backshade instances joining as nodes.
- **Two working modes** (requested by the human on 2026-11-23), which can be combined in the same session:
  - **master-slave:** the slaves mirror the master (state and playback); a slave can be an additional operator position or a tracking backup that runs in parallel with its outputs disabled and takes over when needed;
  - **distributed hardware:** the machines are synchronized and each one is dedicated to a task, driving only the hardware connected to it. The show stores a **hardware map** that assigns every output and input device (DMX interfaces and Art-Net universes, video outputs and displays, audio devices, MIDI controllers, timecode inputs) to a machine, identified by a stable machine identifier. Inputs on any machine are forwarded to the master. If a machine fails, its hardware can be reassigned to another machine with the same devices.
- Each node drives its own outputs locally from the replicated state; frames are never streamed over the network, only state changes and clock data.
- Transport: WebSocket, with the same protocol as IPC and the remote web interface (see Architecture); the server-side WebSocket choice is the one still to be evaluated in Dependencies.
- Discovery: UDP broadcast through Node.js `dgram`, plus manual connection by address.
- Clock sync: NTP-like round trip measurement between node and master, to align cue, timeline, audio and video playback.
- Conflicts: edits go through the master, with edit locks per object.
- Media: missing files are copied from the master and checked by hash.

Status: Confirmed (architecture and the two modes), Proposed (other points).

## Touch and external controllers

Requested by the human on 2026-11-23 (Phase 16). These are requirements for **every** component, also before Phase 16:

- **Touch:** components use pointer events only (mouse, pen and touch with the same code), never functions available only on hover; hit areas are at least 48 px even when the visible control is smaller; several controls can be used at the same time with multi-touch (each drag follows its own pointer, as `RangeControl` already does); dragging a control never scrolls or zooms the page (`touch-action: none` on the controls); long press replaces the right click. A touch mode with larger controls can be chosen per device.
- **External MIDI hardware:** every control that changes a value or triggers an action must be mappable with MIDI learn and must send feedback (LEDs, motorized faders) when the controller supports it; faders without motors use pickup to avoid jumps. Mappings are saved per show and per workstation; profiles for common controllers are bundled. MIDI goes through the Web MIDI API, with the permission granted by the main process.
- OSC control surfaces use the OSC layer of Phase 9.2; HID devices such as Stream Deck need a native dependency and are to be evaluated.

Status: Confirmed (requirements), Proposed (details).

## Text gobos

Requested by the human on 2026-11-23 (Phase 7.7), defined on 2026-11-26.

- **Presets of the show** (decided by the human): text gobos are saved in `video.gobos` (`src/shared/video/text-gobo.ts`); a layer uses a preset as its source (`{ kind: 'gobo', gobo }`), so a change of the preset shows on every layer and in the recorded scenes. Deleting a preset leaves its layers empty.
- **Settings:** text (several lines), font (generic families and common fonts), weight (regular or bold), size and outline as parts of the output height, colors, alignment, position, rotation; gobo look: shape mask (none, circle, or an image of the show media whose brightness lets the text through) with size and soft edge, focus (blur), prism of 3, 5, 6 or 8 facets with spread; animations: scroll, rotation, fade, type-on, with speed and direction; countdown for a duration (from when the gobo appears) or to a time of the day.
- **Dynamic texts as placeholders** (decided by the human): `{cue}` (current cue, its note or scene name), `{song}` (audio item playing), `{clock}`, `{timecode}` (shows its empty value until the shared clock of Phase 8.5), `{countdown}`. The engine sends the live data to the output windows with the composition.
- **Drawing** (`src/renderer/video/gobo-renderer.ts`): a canvas per gobo layer drawn every frame at the size of the composition, with a transparent background over the layers below; fonts are the system fonts, so the look can differ between computers (fonts in the show media can come later).
- **Editor in the Video section** (decided by the human): Text gobos panel with one key per preset and the editor with an animated preview (sample cue and song names); changes are saved a moment after the last one. The monitors of the Video section show `{cue}` and `{song}` empty (proposed).
- Shown in the 3D stage and in the pixel mapping with Phases 13 and 14.

Status: Confirmed (presets, editor in the Video section, placeholders), Proposed (canvas drawing, prism and animation formulas, system fonts only, empty live texts in the monitors).

## Timer screens

Requested by the human on 2026-11-26 (Phase 7.8): screens of the current time and countdowns, useful in live shows.

- **Kinds** (decided by the human): current time (seconds and date optional), countdown for a duration, countdown to a time of the day, stopwatch.
- **Presets of the show** (`src/shared/video/show-timer.ts`, `video.timers`), used by layers like the text gobos (`{ kind: 'timer', timer }`): label above the digits, font, colors normal, warning (a number of seconds before the end) and end, background color or transparent.
- **At zero** (decided by the human: a choice per timer): count on with a minus sign or stop at zero; the digits can flash after zero.
- **Live state** (`src/main/video/timer-clock.ts`): countdowns and stopwatches are started, paused, reset and changed by one minute; the state (running, time counted, change, wall clock time of the state) is sent to the output windows, which move the digits on with their own clock. States belong to the running session. Countdowns to a time and clocks follow the wall clock.
- **Controls** (decided by the human): the Timer screens panel of the Video section (preset keys, new timer by kind, editor with live preview, start or pause, reset, plus and minus one minute) and the grid (keys with a timer command, monitors showing the time).
- **Drawing** (`src/renderer/video/timer-renderer.ts`): large digits fitted to the width, label above, date below; the date follows the interface language (output windows read it from the same storage).

Status: Confirmed (kinds, choice at zero, controls in the Video section and the grid), Proposed (one minute changes, colors and layout, flashing every half second).

## Timelines

Defined with the human on 2026-11-26 (Phase 8), after the reference rendering `docs/design/timeline.png`. Editing works as in an audio workstation (requested by the human; reference products are not named in the project).

- **Several timelines per show** (decided by the human), saved in `show.json` under `timelines` (`src/shared/timeline/timeline.ts`): name, tempo (bpm), beats per bar, length; tracks and markers. Times are in seconds; the ruler shows bars and the displays show time (timecode of the show rate), bar (bar.beat.sixteenth) and tempo (decided by the human: bars and seconds).
- **Free tracks** (requested by the human): added, removed, moved by dragging their header (between tracks, or into a folder), grouped in folder tracks that open and close (a deleted folder gives its tracks to its own parent), muted (also through their folders), with their height (32 to 256 px, multiple of 8). Kinds: lights (clips of scenes and chasers), audio (clips of audio files, output device and volume per track), video (clips of videos, images, gobos and timers on an output and layer), automation (curve for a master, a group or a scene), folder.
- **Clips:** start, length, offset into the file, fades, name (empty for the name of the source). In the editor: select (Shift or Ctrl add), move (also to another track of the same kind when only one track is selected), resize from the edges (the start edge moves the offset), fades from the top handles, double click to change, double click on an empty lane to add, snap to bars, beats, half and quarter beats, seconds or frames. Keys: Space play or pause, Delete removes, Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y) undo and redo, Ctrl+D duplicates, S splits at the playhead, Home goes to the start; Ctrl and the wheel zoom the time.
- **Automation:** points added with a click, moved by dragging, removed with a double click; straight lines between points (`curveValue`).
- **Editing session** (`timeline-session.ts`): the interface edits a copy and sends the whole timeline (`timeline.save`), checked by the engine; undo and redo keep up to 100 steps per window.
- **Shared clock and player** (`src/main/timeline/timeline-player.ts`, 8.5): one timeline loaded at a time; play, pause, stop (to the start, clips leave the outputs), locate, loop (over the selected clips, or four bars from the playhead). While playing, every 25 ms: light clips set the level of their scene or chaser in the memory player (`setClipLevel`, a fade of every channel, scaled by the scene master; clips play lights only, the audio and video of their scenes are not started); audio clips play on the bus of their track in the playback window (`timeline-audio.ts`, a bus per audio track with its device and volume); video clips take their output layer over the program (`VideoEngine.setTimelineLayer`); automation sets masters, groups and scenes (the last value stays after stop). The state is sent with the wall clock time, so every window moves the playhead and the timecode display of the top bar with its own clock.
- **Go mode and recording:** options of the player already sent to the interface; stop markers pause the playback in go mode exactly at their time (fixed on 2026-11-27: the pause added the time passed since the marker); recording of live actions comes in the next steps.
- **Waveforms** (8.4, 2026-11-27): the interface reads the audio file from the show media and decodes it once with Web Audio (`OfflineAudioContext` at 11025 Hz, light on memory), keeping 100 peaks per second (highest level of every channel) in memory for the running session (`audio-peaks.ts`); the key of a file includes its size and date, so a replaced file is read again. Each audio clip draws the part of the file it plays (from its offset, for its length) as a shape mirrored around the middle line, about one point every 2 px (`clip-waveform.ts`). Peaks are not saved in the show (proposed).
- **Go, Back and markers panel** (8.6, decided by the human on 2026-11-27): the markers are the cues of the timeline, there is no separate cue list. A panel beside the editor (`marker-panel.ts`) shows the next stop marker, a large Go key, a Back key and the list of the markers (name, time, stop; a row moves the playhead there, its key opens the marker dialog); the marker passed last has the accent color, the next stop the armed bar. Go and Back are actions of the engine (`timeline.transport` with `go` and `back`), so the grid and the remote clients can use them later. Go plays (in go mode up to the next stop marker) and does nothing while playing, so a double press never skips a part of the show (proposed); Back moves the playhead to the previous marker, or to the start, playing or paused as it was, and while playing it skips the marker passed less than one second before (proposed).
- **Markers** (8.4, 2026-11-27): shown in the lower half of the ruler, under the bar numbers (the loop is a band over the whole ruler height). Added at the playhead with the Marker key (Lucide `flag`) or the M key, or with a double click on the ruler (snapped), named "Marker N"; dragged to move (with snap); a press without dragging moves the playhead to the marker; a double click opens the marker dialog (name, time, in go mode play through or pause here, delete). Every change goes through the editing session, so it can be undone.

Status: Confirmed (several timelines, free tracks and folders, editing as in an audio workstation, bars and seconds, recording of live actions), Proposed (colors per kind, header layout, keyboard shortcuts, clips without media of their scenes, last automation value kept, waveform decoding and peaks kept in memory, marker interactions and ruler layout, Go ignored while playing, Back grace time, markers panel layout).

## Localization

Backshade is multilingual and modular (decided by the human on 2026-11-23). Translator guide: `docs/localization/README.md`.

- **Reference and default language: English** (`en`). Italian (`it`) is included. Keys are typed from `en.json`: a wrong key in `t()` is a compile error.
- **Language packs:** one JSON file per language, `<code>.json`, with `meta` (`code` equal to the file name, `name` in the language itself, `formatVersion` 1) and `messages` (the texts, grouped by area, keys in `camelCase`).
- **Included packs:** `app/src/locales/`. `scripts/build-locales.mts` (part of `npm run build`) checks `meta`, allowed characters and the same keys as `en.json`, then copies them to `dist/web/locales/`.
- **Packs installed by the user:** `locales/` in the user data folder (`app.getPath('userData')`, for example `~/.config/Backshade/locales`), created at startup. They survive application updates and need no administrator rights. A user pack with the same code as an included one replaces it. Invalid packs are ignored with a console warning.
- **Discovery:** the main process (`src/main/locales/locale-registry.ts`) scans both folders at every request; the protocol (`src/main/protocol/locale-routes.ts`) serves `/locales/index.json` (code and name of the available languages) and `/locales/<code>.json`. New packs appear when the interface is reloaded, without restarting. The remote web server will use the same addresses.
- **Missing texts:** a text missing from the active language is taken from English, so partial packs work.
- **Choice of the language:** saved **per device** (`localStorage`, key `backshade.locale`), so each workstation and each remote client can use its own language. Without a saved choice, the system language is used if available (also matching the base language, for example `it-IT` -> `it`), otherwise English.
- **Changing language:** `changeLocale(code)` saves the choice and reloads the interface, so every component is rebuilt with the new texts.
- The generic mechanism is in the TypeScript framework (`src/framework/ts/i18n/`); the application part is `src/renderer/i18n/i18n.ts` (`initI18n()`, `t()`, `availableLocales()`, `currentLocale()`, `changeLocale()`).
- Placeholders use braces: `"Connected to {target}"` with `t('status.connected', { target })`.
- Texts are always inserted as text, never as HTML, and follow the typography rules: no uppercase-only text.

Status: Confirmed (2026-11-23).

## Distribution

- Packaging with `electron-builder`, publishing on GitHub Releases.
- Windows: NSIS installer and portable version. macOS: universal `.dmg` and `.zip`, signed and notarized. Linux: AppImage and `.deb`.
- **Do not use GitHub Actions**: builds run locally through npm scripts.
- Details in Phase 11 of `ROADMAP.md`.

Status: Confirmed.
