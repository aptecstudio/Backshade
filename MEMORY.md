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

## Language

| Context | Language | Status |
| --- | --- | --- |
| Conversations with humans and polls | Italian | Confirmed |
| `.md` files | English (changed from Italian on 2026-11-21) | Confirmed |
| Source code and naming | English | Confirmed |
| Code comments | Italian | Confirmed |
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

## Start page

Requested by the human on 2026-11-23, after the Studio One start page. Developed as the first block of Phase 2, together with the show format (2.1), new, open and save (2.2) and recent shows (2.5).

- Full page inside the main window, in place of the sections: shown at launch and when a show is closed; reopened with a "Start" key in the top bar.
- Contents: recent shows (name, last modified date, folder; one click opens the show; shows moved or deleted are marked) and the actions new show (name and folder) and open show from a folder.
- Not included for now: thumbnails, favorites, templates and demo show.

Status: Confirmed (2026-11-23).

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
- Comments in Italian, documentation with JSDoc/TSDoc.

Status: Confirmed (2026-11-23).

### Interface structure

- The whole interface structure is built and managed through **components written as TypeScript classes** (decided by the human on 2026-11-23). HTML pages contain only the document head and the entry script; every visible element is created by a component.
- Native Web Components (`customElements`, Shadow DOM) are **not** used.
- Generic components (controls, layout, text) live in the TypeScript framework; application components (sections, pages) live in `src/renderer` and are built from the framework components.
- Components receive texts already translated: the framework does not depend on the localization files.

Status: Confirmed (2026-11-23).

### Application layout

Built in Phase 1.5 after the console reference rendering (`docs/design/console.png`), entirely from components (`src/renderer/shell/`):

- `AppShell`: top bar, section area and status bar; only the section area scrolls.
- `TopBar`: `BrandBlock` (logo, "Backshade" in the accent color, name of the open show or "No show open"), `SectionTabs` with the main sections, timecode and tempo displays, settings key with the `settings` icon.
- `SectionNavigation`: open section and change notifications; the last open section is remembered per device (`localStorage`, key `backshade.section`).
- `SectionHost`: shows the open section; the previous section component is destroyed and the new one created when the section changes.
- `StatusBar`: application status on the left, "A product by" with the Aptec Studio wordmark linking to the website on the right.
- Sections are declared in `src/renderer/sections/section-definitions.ts` (identifier, text, optional icon, factory). Main sections: console, grid (virtual console), timeline, patch, media; settings has its own key. Sections not yet developed show a placeholder panel.
- Settings: `SettingsSection` collects one panel per setting; the first is `LanguageSettings`.
- Timecode and tempo show neutral values (`00:00:00:00`, `---.-`) until the engine provides them.
- The blackout key of the reference is added with the output engine (Phase 3.5): a safety key without effect would be misleading in a live show.
- Narrow windows: below 1280 px the tempo display is hidden, below 1200 px the timecode display too; the show name is shortened with an ellipsis. Navigation and settings are always visible down to the minimum window width (1024 px).
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
| three.js | vendor | 3D stage modeling and fixture emulation (MIT license), including its `OBJLoader` (confirmed by the human on 2026-11-22, see Phase 13) |

Features built with native APIs, without extra dependencies:

- Art-Net: UDP through Node.js `dgram`.
- DOM manipulation: internal TypeScript framework (replaces jQuery).
- Web server: Node.js `http` module.
- OSC for external mixers: UDP through `dgram`.
- MIDI for mixers and controllers: Chromium Web MIDI API.

To be evaluated in the related phases (to be proposed with a poll):

- Server-side WebSocket: `ws` or a minimal internal implementation.
- USB DMX interfaces (e.g. Enttec): `serialport` (native module).

Status: Proposed.

## Show format (proposed)

- Each show is a folder `show-name.backshade/` containing:
  - `show.json`: show data (patch, scenes, chasers, grid, timeline);
  - `media/`: audio, video and image files used by the show;
  - `thumbnails/`: generated previews.
- All internal paths are **relative** to the show folder, so the folder is portable between devices.
- Imported media are copied into `media/`.
- Cloning a show means copying the folder and assigning a new identifier.
- `show.json` contains a `formatVersion` field to handle future migrations.

Status: Proposed.

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
- the 3D stage emulates the fixtures in brightness, colors and movements.

Points to define in Phase 13 (to be proposed with a poll):

- how three.js is vendored: the module build and the needed addons (`OBJLoader`, camera controls), imported as native ES modules (see Code style);
- source and license of the bundled `.obj` models (made in-house or taken from a source compatible with GPL-3.0, such as CC0);
- materials and textures (`.mtl` files) or materials defined in code;
- model location: proposed `app/assets/models/` with `truss/`, `stage/` and `fixtures/` subfolders.

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

Requested by the human on 2026-11-23 (Phase 15): several machines work on the same show, each with a department (lights, video, audio), in real time and in sync.

- **Architecture: master and nodes** (confirmed by the human on 2026-11-23). The master holds the show and the clock and is the source of truth; the other machines are full Backshade instances joining as nodes with a role.
- Each node drives its own outputs locally from the replicated state; frames are never streamed over the network, only state changes and clock data.
- Transport: WebSocket, with the same protocol as IPC and the remote web interface (see Architecture); the server-side WebSocket choice is the one still to be evaluated in Dependencies.
- Discovery: UDP broadcast through Node.js `dgram`, plus manual connection by address.
- Clock sync: NTP-like round trip measurement between node and master, to align cue and timeline playback.
- Conflicts: edits go through the master, with edit locks per object.
- Media: missing files are copied from the master and checked by hash.

Status: Confirmed (architecture), Proposed (other points).

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
