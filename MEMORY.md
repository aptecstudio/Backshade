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
| Interface | HTML, vanilla JavaScript ES2017, jQuery, Tailwind CSS | Confirmed (ES5 replaced by ES2017 on 2026-11-22) |
| Versioning | SemVer, 1.0.0 at the first runnable version | Confirmed |

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

## Architecture (proposed)

- **Engine in the main process (Node.js):** show management, DMX/Art-Net output, timeline clock, web server. The engine is the single source of truth for state.
- **Interface as a web client:** the same interface runs in the Electron window and in the browser of a networked device. It talks to the engine through a single transport layer:
  - in Electron: IPC through `preload` with `contextIsolation` enabled;
  - remotely: WebSocket served by the built-in web server.
- **Video outputs:** dedicated fullscreen Electron windows on external displays.
- **Audio:** Web Audio API and `<audio>`/`<video>` elements with output device selection (`setSinkId`).

Status: Proposed.

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
| `/app` | Electron application | HTML, vanilla JavaScript ES2017, jQuery, Tailwind CSS | Confirmed |
| `/landing` | Static bilingual website (English and Italian) | Astro, vanilla JavaScript, Tailwind CSS | Confirmed |

Shared files (`AGENTS.md`, `ROADMAP.md`, `MEMORY.md`, `README.md`, `LICENSE`, `.editorconfig`, `.gitignore`) stay in the repository root.

### `/app` structure (proposed)

```
app/
  src/
    main/        # Electron main process, engine, web server
    preload/     # secure IPC bridge between main and interface
    renderer/    # web interface (html, js, css)
    shared/      # shared constants and models
  assets/
    icons/       # line icons (SVG sprite)
    fixtures/    # fixture library
    models/      # 3D .obj models (truss, stage, fixtures)
  build/         # packaging resources
```

Status: Proposed.

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

### JavaScript

- ECMAScript 2017 is the highest language level, in both the interface and the main process (confirmed by the human on 2026-11-22, replacing ES5).
  - Allowed: `const` and `let` (no `var`), arrow functions, template literals, classes, destructuring, default and rest parameters, array spread, `Promise`, `async`/`await`.
  - Not allowed, because newer than ES2017: object spread and rest (`{ ...obj }`), `for await`, optional chaining (`?.`), nullish coalescing (`??`), `Array.prototype.flat`, `Object.fromEntries`, class fields and private members, top-level `await`, and any later feature.
  - The limit applies to the project's own code; vendored libraries (jQuery, Lucide, three.js) are used as distributed.
- Modules (confirmed on 2026-11-22):
  - main process and `preload`: CommonJS (`require` / `module.exports`);
  - interface: native ES modules (`<script type="module">`, `import` / `export`), without a bundler; three.js and its addons are imported directly from the vendor folder;
  - jQuery is loaded as a classic script and used through its global `$`.
- `'use strict';` at the top of every CommonJS file; ES modules are strict by default.
- 4-space indentation, single quotes, mandatory semicolons, opening brace on the same line.
- Naming: `camelCase` for variables and functions, `PascalCase` for constructors, `UPPER_SNAKE_CASE` for constants.
- Comments in Italian, documentation with JSDoc.

Status: Proposed.

### HTML and CSS

- 4-space indentation, double-quoted attributes.
- Tailwind classes as the main styling; custom CSS only for skeuomorphic components that utilities cannot express.
- File and folder names in `kebab-case`.

Status: Proposed.

## Dependencies (proposed)

Principle: as few dependencies as possible.

| Dependency | Type | Reason |
| --- | --- | --- |
| `electron` | development | Application runtime |
| `tailwindcss` (CLI) | development | CSS compilation; the compiled CSS is committed |
| `astro` | development, `/landing` only | Static site generator for the landing site |
| `electron-builder` | development | Packaging for the three platforms |
| jQuery 3.x | vendor | DOM manipulation in the interface |
| Lucide | vendor | Line icon library (ISC license), bundled as an SVG sprite (confirmed) |
| three.js | vendor | 3D stage modeling and fixture emulation (MIT license), including its `OBJLoader` (confirmed by the human on 2026-11-22, see Phase 13) |

Features built with native APIs, without extra dependencies:

- Art-Net: UDP through Node.js `dgram`.
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

- Initial interface language: Italian.
- Interface strings are kept separate from the code in dedicated files (e.g. `src/renderer/i18n/it.json`) to allow other languages in the future.

Status: Proposed.

## Distribution

- Packaging with `electron-builder`, publishing on GitHub Releases.
- Windows: NSIS installer and portable version. macOS: universal `.dmg` and `.zip`, signed and notarized. Linux: AppImage and `.deb`.
- **Do not use GitHub Actions**: builds run locally through npm scripts.
- Details in Phase 11 of `ROADMAP.md`.

Status: Confirmed.
