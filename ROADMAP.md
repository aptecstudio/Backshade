# ROADMAP.md - Backshade roadmap

Project progress. Completed items are checked with `- [x]`.

Versioning rules (see `AGENTS.md`):

- no versions are assigned until the first runnable version;
- **1.0.0** is the first runnable version (end of Phase 1);
- from then on, at the end of each phase or sub-phase a new version is proposed with a changelog.

---

## Phase 0 - Project initialization

- [x] 0.1 `AGENTS.md` with the rules for AI agents
- [x] 0.2 `ROADMAP.md` and `MEMORY.md`
- [x] 0.3 GPL-3.0 license, `README.md`, `.gitignore`, `.editorconfig`
- [x] 0.4 Distribution proposal
- [x] 0.5 Interface design draft (artifact)
- [ ] 0.6 Confirmation of the choices proposed in `MEMORY.md` (architecture, dependencies, show format, design system)
  - [x] Distribution
  - [x] Icon library (Lucide)
  - [x] `.md` files in English
  - [x] Only alphanumeric characters, ASCII punctuation and accented letters (no glyphs or emoji)
  - [x] Brand: Backshade is a product of Aptec Studio
  - [x] Official Backshade logo and derived icons in `docs/logo`
  - [x] 3D stage with three.js (see Phase 13)
- [x] 0.7 Design draft revised as a hybrid with the hardware skeuomorphism reference (superseded)
- [x] 0.8 New design direction defined (dark theme, flat panels, realistic controls)
- [x] 0.9 Design draft redone and reference renderings published in `docs/design`

## Phase 1 - Runnable base (target 1.0.0)

- [ ] 1.1 `/app` folder with `package.json`, Electron, start scripts
- [ ] 1.2 Main process, secure `preload`, main window
- [ ] 1.3 Tailwind CSS pipeline and vendored jQuery and Lucide
- [ ] 1.4 Design system: spacing tokens, palette, typography, base skeuomorphic components (panel, key, fader, knob, display)
- [ ] 1.5 Application layout: top bar, section navigation, status bar
- [ ] 1.6 Localization system (Italian)
- [ ] 1.7 Single transport layer between interface and engine (IPC)
- [ ] 1.8 About window: version, license and Aptec Studio credit with the wordmark

## Phase 2 - Shows and projects

- [ ] 2.1 Show folder format and `show.json` with `formatVersion`
- [ ] 2.2 New, open, save, save as
- [ ] 2.3 Show cloning
- [ ] 2.4 Internal media management with relative paths
- [ ] 2.5 Recent shows list and default shows folder
- [ ] 2.6 Export and import as a single archive for transport
- [ ] 2.7 Global application settings separate from show settings

## Phase 3 - DMX and Art-Net

- [ ] 3.1 Fixture data model (channels, modes, attributes)
- [ ] 3.2 Fixture library and custom fixture editor
- [ ] 3.3 Multi-universe patch with address conflict checks
- [ ] 3.4 Art-Net output (native UDP), node and universe configuration
- [ ] 3.5 Output engine: frame rate, HTP/LTP merge, blackout, grand master
- [ ] 3.6 DMX channel monitor per universe
- [ ] 3.7 USB DMX interfaces (to be evaluated, requires a native dependency)

## Phase 4 - Simple console (live and programming)

- [ ] 4.1 Fixture and group selection
- [ ] 4.2 Attribute control: intensity, color, position, beam
- [ ] 4.3 Programmer: live editing and value capture
- [ ] 4.4 Scenes: save, recall, fade in/out
- [ ] 4.5 Chasers: steps, timing, BPM, tap tempo, playback modes
- [ ] 4.6 Playback with faders and execution keys

## Phase 5 - LED matrices

- [ ] 5.1 Matrix definition (size, pixel order, universe mapping)
- [ ] 5.2 Matrix preview
- [ ] 5.3 Basic effects (solid color, gradient, scroll, text)
- [ ] 5.4 Pixel mapping from image and video

## Phase 6 - Virtual console on a grid

- [ ] 6.1 Customizable grid per show (size, pages)
- [ ] 6.2 Widgets: key, fader, knob, color picker, XY pad, label, monitor
- [ ] 6.3 Linking widgets to scenes, chasers, groups, media and cues
- [ ] 6.4 Edit mode and run mode
- [ ] 6.5 MIDI mapping of widgets

## Phase 7 - Audio and video

- [ ] 7.1 Detection and selection of external audio and video devices
- [ ] 7.2 Audio playback: playlist, volume, fades, per-device output
- [ ] 7.3 Video direction: fullscreen outputs on external displays
- [ ] 7.4 Layers: video, overlay images, opacity, transitions
- [ ] 7.5 Video inputs (webcams and capture cards)
- [ ] 7.6 Preview and program

## Phase 8 - Pre-programmed shows (track timeline)

- [ ] 8.1 DAW-style track editor: ruler, zoom, scrolling, playhead
- [ ] 8.2 Light tracks (scenes, chasers, values), audio tracks, video and image tracks
- [ ] 8.3 Clips: move, resize, fades, snap to grid
- [ ] 8.4 Audio waveform and markers
- [ ] 8.5 Shared clock and synchronized playback
- [ ] 8.6 Cue list and go mode (manual advance)

## Phase 9 - Integrations

- [ ] 9.1 Lights, audio and video integration: cross triggers and sync
- [ ] 9.2 External audio mixers via OSC (native UDP)
- [ ] 9.3 Mixers and controllers via MIDI (Web MIDI API)
- [ ] 9.4 Profiles for the most common mixers (to be defined)
- [ ] 9.5 External timecode (MIDI Timecode, to be evaluated)

## Phase 10 - Remote web interface

- [ ] 10.1 Web server on the local network (native `http` module)
- [ ] 10.2 WebSocket transport with the same protocol as IPC
- [ ] 10.3 Responsive layout for desktop and mobile
- [ ] 10.4 PIN-protected access and role permissions (run only or edit)
- [ ] 10.5 Connection address and QR code shown in the application

## Phase 11 - Distribution

- [ ] 11.1 Packaging configuration
- [ ] 11.2 Windows build
- [ ] 11.3 macOS build
- [ ] 11.4 Linux build
- [ ] 11.5 Local build scripts and manual publishing on GitHub Releases
- [ ] 11.6 Update available notification

### Distribution plan

Packaging tool: **electron-builder** (a single development dependency for all three platforms). Publishing on the repository's **GitHub Releases**.

| Platform | Formats | Architectures | Notes |
| --- | --- | --- | --- |
| Windows | NSIS installer (`.exe`) and portable version (`.exe`) | x64, arm64 | Code signing (Authenticode certificate) is optional but avoids SmartScreen warnings. Later: publishing on winget. |
| macOS | Disk image (`.dmg`) and archive (`.zip`) | Universal (Apple Silicon and Intel) | Developer ID signing and Apple notarization are required to avoid Gatekeeper blocking; they require the Apple Developer Program. Unsigned, the app opens only through a manual procedure. |
| Linux | AppImage (universal) and `.deb` package (Debian, Ubuntu, Mint) | x64, arm64 | AppImage runs without installation. Optional later: `.rpm` and Flatpak. arm64 allows using a Raspberry Pi 4/5 as a dedicated station. |

- **Builds:** local, through npm scripts, **without GitHub Actions**. The macOS build must run on a Mac (also required for signing and notarization); Windows and Linux builds can be produced on their respective machines.
- **Updates:** check for the latest version through the GitHub Releases API and notify the user, without automatic updates, to avoid extra dependencies. Automatic updates (`electron-updater`) remain an option.
- **Show portability:** show folders are independent of the installation, so they work with any distribution format.

Status: Confirmed (no use of GitHub Actions).

## Phase 12 - Landing site

Static website presenting Backshade, in English and Italian. It lives in `/landing`, separate from the Electron application in `/app`.

- [ ] 12.1 Astro project in `/landing` with Tailwind CSS and vanilla JavaScript, static output only
- [ ] 12.2 Bilingual structure (English and Italian) with Astro i18n routing and a language switch
- [ ] 12.3 Layout and components consistent with the application design system (hardware skeuomorphism, spacing scale, palette, Lucide icons)
  - [ ] 12.3.1 Footer with the Aptec Studio credit, wordmark and copyright, as in the WooJam landing
- [ ] 12.4 Pages: home, features, download, documentation, license
- [ ] 12.5 Download page linking the platform builds on GitHub Releases
- [ ] 12.6 SEO basics: titles, descriptions, `hreflang`, sitemap, favicon
- [ ] 12.7 Local build script and deploy procedure (hosting to be defined, no GitHub Actions)

## Phase 13 - 3D stage

3D modeling of the stage with three.js, and a live visualizer that emulates the fixtures from the DMX output. It depends on the fixture model and the output engine (Phase 3) and on the simple console (Phase 4). It is numbered after the existing phases to avoid renumbering them; its position in the development order can be decided later.

- [ ] 13.1 three.js vendored locally and integrated in the ES5 interface (see `MEMORY.md`, Dependencies)
- [ ] 13.2 Bundled `.obj` model library, ready to use:
  - [ ] 13.2.1 Truss: straight sections of common lengths, corners, T and cross joints, base plates, towers
  - [ ] 13.2.2 Stage: modular decks, risers, stairs
  - [ ] 13.2.3 Most used fixtures: moving head spot, moving head wash, moving head beam, PAR, LED bar, blinder, strobe, follow spot
  - [ ] 13.2.4 Moving fixtures split into separate parts (base, yoke, head) with defined pivot points, so pan and tilt can be animated
- [ ] 13.3 Link between fixture definitions and 3D models: model, beam angle and zoom range, pan and tilt range, light output
- [ ] 13.4 Stage editor: place, move, rotate and snap truss, decks and fixtures; hang fixtures on truss; camera views (front, top, side, free)
- [ ] 13.5 Placed fixtures linked to the patch; stage layout saved in `show.json`
- [ ] 13.6 Live emulation from the DMX output:
  - [ ] 13.6.1 Brightness: intensity, dimmer curve, strobe
  - [ ] 13.6.2 Colors: RGB/RGBW mixing, CMY, color wheel, color temperature
  - [ ] 13.6.3 Movements: pan and tilt with realistic speed, zoom
  - [ ] 13.6.4 Visible beams (volumetric cones) and light on the stage surfaces, with an optional haze level
- [ ] 13.7 Performance: frame rate limit, quality levels, beam on/off switch
- [ ] 13.8 Import of custom `.obj` models into the show folder
