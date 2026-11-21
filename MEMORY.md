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
| Interface | HTML, vanilla JavaScript ES5, jQuery, Tailwind CSS | Confirmed |
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
- A Backshade logo does not exist yet: the human will provide it. Until then the interface uses a temporary line mark.

Status: Confirmed (2026-11-21).

## Repository structure

The repository contains two separate projects, each with its own `package.json`:

| Folder | Content | Technologies | Status |
| --- | --- | --- | --- |
| `/app` | Electron application | HTML, vanilla JavaScript ES5, jQuery, Tailwind CSS | Confirmed |
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

- ES5 in both the interface and the main process, for consistency: `var`, `function`, no arrow functions, no template literals, no ES6 classes, no `let`/`const`.
- Modules: CommonJS (`require` / `module.exports`) in the main process; in the interface, the module pattern (IIFE) with a single global namespace `Backshade`.
- `'use strict';` at the top of every file or IIFE.
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

Neutral palette (warm greys like metal and dark plastic, cream panels), a single soft accent color for the active state and desaturated status colors (green, amber, red) only for functional indicators. No glow, gradients kept to a minimum.

Status: Proposed.

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

Hardware skeuomorphism, as a hybrid with the reference provided by the human (a modular hardware panel): cream and anthracite panels with corner screws, recessed LCD and segment displays, knobs with dotted scales, physical keycaps with LED strips, faders with LED meters, analog VU meters, toggle switches. Adapted to the project rules: no uppercase labels, no glow, neutral palette with a single soft accent.

The approved screens, tokens and component descriptions are in `docs/design/README.md`.

Status: Confirmed.

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
