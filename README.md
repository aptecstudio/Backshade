<p align="center">
  <img src="docs/logo/png/icon-256.png" alt="Backshade" width="96">
</p>

<h1 align="center">Backshade</h1>

<p align="center">
  Programming console for live shows: lights, audio and video in one simple application.
</p>

<p align="center">
  A product by <a href="https://www.aptecstudio.com">Aptec Studio</a>.
</p>

---

Backshade is a cross-platform desktop application (Windows, Linux, macOS) built on Electron, with a web interface that can also be used from other devices on the local network.

## Screenshots

The simple console: a two-preset desk with Preset A and B rows of faders on DMX channels, named after the patched fixtures, and the masters with the A/B crossfade.

![Console](docs/screenshots/console.png)

Scenes recorded from the desk in two banks of 12, and chasers that play them at their own speed, with tap tempo.

![Memories](docs/screenshots/console-memories.png)

Live cues: Go, Back and Pause, with the current and next cue, the fade progress and an optional follow.

![Cues](docs/screenshots/console-cues.png)

The attributes panel: selected fixtures get their channels on faders, pan and tilt on two 16-bit jog wheels, RGB on the color wheel.

![Attributes](docs/screenshots/console-attributes.png)

The patch, on several universes, with a library of fixture definitions and a custom fixture editor.

![Patch](docs/screenshots/patch.png)

Output over Art-Net and USB DMX interfaces, with a live DMX monitor.

![DMX monitor](docs/screenshots/dmx-monitor.png)

The start page opens at launch, with the recent shows and the actions on the open show.

![Start page](docs/screenshots/start-page.png)

New shows start from a template: the included "Empty show" or one saved by the user.

![New show](docs/screenshots/new-show.png)

Every show keeps its audio, video and image files in its own folder.

![Media](docs/screenshots/media.png)

Times are set with a time picker and a jog wheel, which works with mouse, pen and touch.

![Time picker](docs/screenshots/time-picker.png)

Application settings: language, display of fader and knob values, default shows folder.

![Settings](docs/screenshots/settings.png)

Console controls from the component catalog: channel displays, knobs, square keys, long faders and typed values.

![Console controls](docs/screenshots/catalog-controls.png)

## Features

Available now:

- Start page with recent shows, as the entry point of the application
- Shows saved as portable folders: new, open, save, save as, rename, close
- Autosave with recovery after an unexpected exit, and history of the saved versions
- Show templates: included and created by the user, with a management screen
- Export and import of shows (`.bshow`) and templates (`.btemplate`) as single archives
- Show media: audio, video and image files copied into the show folder
- Show settings: description and notes, timecode frame rate, default fades
- Fixture library with common models and a custom fixture editor, with import and export
- Multi-universe patch with address conflict checks, as a list or as a DMX map
- DMX output over Art-Net (broadcast or unicast, node search) and USB DMX interfaces (Enttec DMX USB Pro, Open DMX), with grand master, blackout and a DMX monitor
- Simple console: two-preset desk (A/B crossfade or single 24 channels), attributes panel with jog wheels and color wheel, scenes, chasers with tap tempo, and live cues with Go, Back, Pause and follow
- Multilingual interface (English and Italian), extensible with language packs installed by the user
- Skeuomorphic console controls: keys, displays, knobs, faders, jog wheels, time picker, color wheel

Planned (see [ROADMAP.md](ROADMAP.md)):

- LED matrices
- Virtual console on a customizable grid for each show
- Video direction, audio playback, overlay images and text gobos
- Pre-programmed shows with a DAW-style track editor
- Integration between lights, audio, video and external audio mixers
- Remote control from desktop or mobile through the built-in web server
- 3D stage, videomapping, several synchronized machines
- Touch screens and external MIDI controllers

## Requirements

- [Node.js](https://nodejs.org) 22.18 or later (the build scripts are TypeScript files run directly by Node) and npm
- Git
- Windows, macOS or Linux; on Linux the usual libraries needed by Electron (GTK 3, NSS, ALSA)

## Dependencies

Backshade uses as few dependencies as possible: everything the application needs at runtime is built on Electron, Node.js and browser APIs, or is part of the project, with one exception.

Runtime dependency (in `app/package.json`):

| Package | Version | Purpose |
| --- | --- | --- |
| `@serialport/bindings-cpp` | 13.0.1 | Native access to the serial ports, for USB DMX interfaces (Enttec DMX USB Pro, Open DMX); prebuilt N-API binaries, no rebuild for Electron |

Development dependencies (in `app/package.json`, installed with `npm ci`):

| Package | Version | Purpose |
| --- | --- | --- |
| `electron` | 45.4.1 | Application runtime |
| `typescript` | 7.0.2 | TypeScript compiler (`tsc`) for the application, the internal framework and the build scripts |
| `sass` | 1.108.2 | SCSS compiler (Dart Sass) for the styles |

Bundled in the repository:

- [Lucide](https://lucide.dev) icons 1.78.0 (ISC license), one SVG file per icon in `app/assets/icons/lucide`, turned into a sprite at build time.

Built inside the project, without external libraries:

- the internal TypeScript and SCSS frameworks in `app/src/framework`, used instead of UI libraries;
- the ZIP reader and writer used by the `.bshow` and `.btemplate` archives, on Node.js `zlib`.

## Build and run

All commands run in the `app` folder.

```sh
git clone https://github.com/aptecstudio/Backshade.git
cd Backshade/app
npm ci
npm start
```

`npm start` builds the application and launches it. The compiled files go to `app/dist`, which is not committed.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Builds everything into `app/dist`: icons, language packs, main process, interface, styles and static files |
| `npm start` | Builds and launches the application |
| `npm run catalog` | Builds and opens the component catalog instead of the main page (development only) |
| `npm run check:scripts` | Type-checks the build scripts in `app/scripts` |

Partial builds, useful during development: `npm run build:icons`, `npm run build:locales`, `npm run build:node`, `npm run build:web`, `npm run build:styles`, `npm run build:static`.

If Electron starts as a plain Node.js process (for example in some editor terminals that set `ELECTRON_RUN_AS_NODE=1`), unset the variable before launching:

```sh
env -u ELECTRON_RUN_AS_NODE npm start
```

Installers for Windows, macOS and Linux are planned in Phase 11 of the roadmap.

## Where Backshade keeps its data

- Shows: `Documents/Backshade/Shows` by default, changeable in the settings.
- Application data (settings, recent shows, user templates and language packs): the Electron user data folder, for example `~/.config/Backshade` on Linux, `%APPDATA%\Backshade` on Windows and `~/Library/Application Support/Backshade` on macOS.

## Status

Phases 1 to 4 of the [roadmap](ROADMAP.md) are complete: application base, design system, localization, transport layer between interface and engine, shows, templates, media and archives, fixtures, patch, DMX output over Art-Net and USB, and the simple console with scenes, chasers and live cues. The next phase is LED matrices. Version 1.0.0 will be the first release, when all the planned features are ready for distribution and testing.

## Development documentation

- [AGENTS.md](AGENTS.md): rules for AI agents
- [ROADMAP.md](ROADMAP.md): phases and progress
- [MEMORY.md](MEMORY.md): choices and conventions
- [docs/design](docs/design/README.md): design reference
- [docs/brand](docs/brand/README.md): brand assets
- [docs/localization](docs/localization/README.md): languages and language packs

## License

Copyright (C) 2026 Aptec Studio.

Released under the [GNU General Public License v3.0](LICENSE).
