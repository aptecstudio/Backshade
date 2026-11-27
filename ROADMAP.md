# ROADMAP.md - Backshade roadmap

Project progress. Completed items are checked with `- [x]`.

Versioning rules (see `AGENTS.md`):

- no versions are assigned during development, even when the application already runs;
- **1.0.0** is the first release, published when all the planned features are implemented and the application is ready for distribution and testing (decided by the human on 2026-11-23, replacing "end of Phase 1");
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
  - [x] TypeScript and SCSS with internal frameworks in `app/src/framework/ts` and `app/src/framework/scss` (replace JavaScript, jQuery and Tailwind)
- [x] 0.7 Design draft revised as a hybrid with the hardware skeuomorphism reference (superseded)
- [x] 0.8 New design direction defined (dark theme, flat panels, realistic controls)
- [x] 0.9 Design draft redone and reference renderings published in `docs/design`

## Phase 1 - Runnable base

- [x] 1.1 `/app` folder with `package.json`, Electron, start scripts
- [x] 1.2 Main process, secure `preload`, main window
- [x] 1.3 TypeScript and SCSS build pipeline, base of the internal frameworks (`app/src/framework/ts`, `app/src/framework/scss`)
- [x] 1.3.1 Lucide icons as individual SVG files, with the sprite and the icon names generated at build
- [x] 1.4 Design system: spacing tokens, palette, typography, base skeuomorphic components (panel, key, fader, knob, display), with the component catalog
  - [x] 1.4.1 Value input controls: time field with a time picker and jog wheel, color wheel for RGB values, typed values for faders and knobs
  - [x] 1.4.2 Display of fader and knob values as percentage or 0-255, chosen separately in the settings
- [x] 1.5 Application layout: top bar, section navigation, status bar, settings section with the language choice
- [x] 1.6 Localization system: English default, Italian included, language packs installable by the user
- [x] 1.7 Single transport layer between interface and engine (IPC), with typed contract and shared protocol
- [x] 1.8 About window: version, license and Aptec Studio credit with the wordmark
- [x] 1.9 While the application is open the screen does not turn off and the system does not go to sleep (requested by the human on 2026-11-26)

## Phase 2 - Shows and projects

Development order: the first block is 2.1, 2.2, 2.5, 2.8, 2.9.1 to 2.9.3 and 2.9.5 together, so the start page is born working with real shows and templates; 2.9.4 follows the archive export (2.6).

- [x] 2.1 Show folder format and `show.json` with `formatVersion`
- [x] 2.2 New, open, save, save as, with autosave recovery and history of saved versions
- [x] 2.3 Show cloning (save as: copy of the folder with a new name and identifier)
- [x] 2.4 Internal media management with relative paths (Media section: import, list, show in folder, delete)
- [x] 2.5 Recent shows list and default shows folder, chosen in the settings
- [x] 2.6 Export and import as a single archive for transport (`.bshow`, internal ZIP with Zip64)
- [x] 2.7 Global application settings separate from show settings (description and notes, timecode frame rate, default fades)
- [x] 2.8 Start page at launch, as in Studio One (see `MEMORY.md`, Start page)
  - [x] 2.8.1 Full page in the main window, shown at launch and when a show is closed; reopened with a "Start" key in the top bar
  - [x] 2.8.2 Recent shows with name, last modified date and folder; one click opens the show; moved or deleted shows are marked
  - [x] 2.8.3 New show (name and folder) and open show from a folder
  - [x] 2.8.4 Choice of the template for a new show, among the included templates and those created by the user
- [x] 2.9 Show templates (see `MEMORY.md`, Show templates)
  - [x] 2.9.1 A template is a complete show folder; a new show is a copy with a new name and identifier
  - [x] 2.9.2 Included templates: "Empty show" and "Demo show", a complete show to try every feature (requested by the human on 2026-11-26)
  - [x] 2.9.3 Save as template from the open show, with name and description, in the user data folder
  - [x] 2.9.4 Export and import of a template as a single archive, with the same format as the show export (2.6)
  - [x] 2.9.5 Template management screen, opened from the start page: list of included and user templates; rename, edit the description and delete user templates; included templates are read-only
- [x] 2.10 Show operators with a 4 digit PIN (see `MEMORY.md`, Show operators)
  - [x] 2.10.1 Operators saved in the show, PIN kept as a salted hash; the creator of the protection is an administrator, more administrators allowed
  - [x] 2.10.2 Access per working section: hidden, read only (see and play) or editable; checked by the engine before every method
  - [x] 2.10.3 PIN keypad when a show with operators opens, on every workstation; operator key in the top bar to change operator
  - [x] 2.10.4 Read-only sections disable their editing controls (the engine still refuses the change, the notice stays)
- [x] 2.11 Import from another show (see `MEMORY.md`, Import from another show)
  - [x] 2.11.1 Dialog in the show settings: source among the recent shows or from a folder; categories (scenes, chasers, fixtures, audio, video, images, operators) and single items with toggles
  - [x] 2.11.2 Dependencies imported with the items that need them (chaser -> scenes -> fixtures, matrices, audio, video, media)
  - [x] 2.11.3 Conflicts solved in the dialog: add elsewhere, replace or skip
  - [x] 2.11.4 PIN of a source administrator, unless the administrator who entered is one of them (same name and PIN)

## Phase 3 - DMX and Art-Net

Development order: the first block is 3.1, 3.2 and 3.3 together, so the Patch section is born working with real fixture definitions; the second block is 3.4, 3.5 and 3.6 together, so the output can be checked as soon as it is sent.

- [x] 3.1 Fixture data model (channels, modes, attributes, optional physical data for the 3D stage)
- [x] 3.2 Fixture library and custom fixture editor
  - [x] 3.2.1 Included library: generic fixtures and a selection of common models
  - [x] 3.2.2 User library with editor (general data, channels, value ranges, modes, physical data), import and export
  - [x] 3.2.3 Missing definitions reported when a show is opened, with import from the same dialog
- [x] 3.3 Multi-universe patch with address conflict checks
  - [x] 3.3.1 List view (tables per universe) and DMX map view (grid of the 512 channels), with fixture type icons
- [x] 3.4 Art-Net output (native UDP), node and universe configuration
  - [x] 3.4.1 Broadcast or unicast per universe, Port-Address per universe (default universe - 1), search of the nodes with ArtPoll
  - [x] 3.4.2 Network interface and output on or off per workstation
- [x] 3.5 Output engine: frame rate, HTP/LTP merge, blackout, grand master
- [x] 3.6 DMX channel monitor per universe
- [x] 3.7 USB DMX interfaces: Enttec DMX USB Pro and compatible, Open DMX USB (FTDI), one universe per interface, through `@serialport/bindings-cpp`

## Phase 4 - Simple console (live and programming)

A two-preset console (A/B) like the classic hardware desks, defined with the human on 2026-11-24 (see `MEMORY.md`, Simple console). Development order: 4.1 first (the faders send light at once), then 4.2, then 4.3 and 4.4 together, then 4.5.

- [x] 4.1 Preset surface: two rows of 12 faders (Preset A and B) on raw DMX channels, with flash keys
  - [x] 4.1.1 Channel banks (channels 1-12, 13-24 and on) and universe choice
  - [x] 4.1.2 Modes: A/B 2 x 12 (two scenes and crossfade) and single 24 channels
  - [x] 4.1.3 Masters A and B in crossfade (B reversed), grand master, full on, home, blind
- [x] 4.2 Attributes panel: a selected fixture gets its channels on the faders, with names; X and Y jog wheels for pan and tilt (16 bit), color wheel for RGB
- [x] 4.3 Scenes: record the output of the preset and of the attributes, two banks of 12 scenes (decided by the human on 2026-11-26, replacing three banks of 12 memories), recall with fade (fade times saved in the scene), scene master
- [x] 4.4 Chasers: one bank of 12 chasers, steps from scenes, step and fade time, speed in bpm with tap tempo, loop, back and forth, random and one shot
- [x] 4.5 Live cues: a list of scenes in order with Go, Back and Pause, current and next cue, fade progress, optional follow time

## Phase 5 - LED matrices

- [x] 5.1 Matrix definition (size, pixel order, universe mapping), patched on as many universes as its channels need
- [x] 5.2 Matrix preview, in the new Matrices section
- [x] 5.3 Basic effects (solid color, gradient, scroll, text) and preset animations with chosen colors (rainbow, wave, sparkle, fire, pulse, plasma, chase), set live and recorded in scenes
- [x] 5.4 Pixel mapping from image (image effect from the show media); pixel mapping from video moved to 14.5, with the video outputs of Phase 7 (decided by the human on 2026-11-26)

## Phase 6 - Virtual console on a grid

- [x] 6.1 Customizable grid per show (size, pages): columns x rows per page, square cells adapting to the window
- [x] 6.2 Widgets: key, fader, knob, color picker, XY pad, label, monitor
- [x] 6.3 Linking widgets to scenes, chasers, groups, cues, masters, DMX channels and desk commands, with the new fixture groups; media links come with Phase 7 (decided by the human on 2026-11-26)
- [x] 6.4 Edit mode and run mode
- [x] 6.5 MIDI mapping of widgets (with MIDI learn and feedback, see Phase 16); done with the shared MIDI layer of Phase 16 (decided by the human on 2026-11-26)
- [x] 6.6 Touch use of the grid: large hit areas, several faders and keys at the same time with multi-touch (see Phase 16)

## Phase 7 - Audio and video

- [x] 7.1 Detection and selection of external audio and video devices: audio outputs, displays and video inputs
- [x] 7.2 Audio playback: playlist, volume, fades, per-device output; items with start and end time and repeat, recorded in scenes and recalled by memory keys, cues and grid keys
- [x] 7.3 Video direction: outputs on external displays, fullscreen or windows with position and size, with an order of stacking
- [x] 7.4 Layers: video, overlay images, opacity, transitions
- [x] 7.5 Video inputs (webcams and capture cards) as layer sources, with quality and frame rate per layer, without sound
- [x] 7.6 Preview and program, with Take and transition time; the program of the outputs is recorded in scenes
- [ ] 7.7 Text gobos: text layers on the video outputs and LED walls, with a gobo look (done on the video outputs; 3D stage and pixel mapping with Phases 13 and 14)
  - [x] 7.7.1 Text, font, size, weight, color, outline, alignment and position
  - [x] 7.7.2 Gobo look: shape mask (circle or custom) with soft edge, focus (blur), rotation, prism repeat
  - [x] 7.7.3 Animations: scroll, rotation, fade, type-on; speed and direction
  - [x] 7.7.4 Dynamic texts: cue or song name, timecode, clock, countdown (the timecode follows the shared clock of Phase 8.5)
  - [x] 7.7.5 Text gobos recallable from scenes, cues and the timeline, saved in `show.json` with their own presets (timeline with Phase 8)
  - [ ] 7.7.6 Shown in the 3D stage on screens, LED walls and virtual projectors (13.9), and usable in the pixel mapping (5.4, 14.5)
- [x] 7.8 Timer screens for live shows (requested by the human on 2026-11-26): current time, countdown for a duration, countdown to a time, stopwatch; controlled from the Video section and the grid

## Phase 8 - Pre-programmed shows (track timeline)

- [x] 8.1 DAW-style track editor: ruler, zoom, scrolling, playhead; several timelines per show; tracks added, removed, moved, grouped in folders, muted, with their height
- [x] 8.2 Light tracks (scenes, chasers), audio tracks with their output, video tracks (videos, images, gobos, timers) on an output layer, automation tracks (masters, groups, scenes)
- [x] 8.3 Clips: move (also to another track), resize, fades, snap to grid (bars, beats, seconds, frames), selection, duplicate, split, undo and redo
- [x] 8.4 Audio waveform and markers
- [x] 8.5 Shared clock and synchronized playback, with loop; the timecode display of the top bar follows it
- [x] 8.6 Cue list and go mode (manual advance): the markers are the cues of the timeline; markers panel beside the editor with the next stop, Go, Back and the list of the markers (decided by the human on 2026-11-27)
- [x] 8.7 Recording of live actions as clips while the timeline plays (record key; added by the human on 2026-11-27): scenes and chasers, masters and groups, audio player, video program, on armed tracks

## Phase 9 - Integrations

- [x] 9.1 Lights, audio and video integration: cross triggers and sync; defined by the human on 2026-11-27 as the shared tempo, with an option per chaser (scenes already carry audio, video and mixer scenes, and the timelines sync everything)
- [x] 9.2 External audio mixers via OSC (native UDP): recall of mixer scenes from scenes, cues and mixer tracks of the timelines (decided by the human on 2026-11-27)
- [x] 9.3 Mixers and controllers via MIDI (Web MIDI API), on the shared MIDI layer of Phase 16: controllers with the MIDI layer, mixers with a MIDI program change model (bank select optional)
- [x] 9.4 Profiles for the most common mixers: Behringer X32 and Midas M32, Behringer X Air and Midas MR, Behringer Wing, and generic OSC (decided by the human on 2026-11-27)
- [x] 9.5 External timecode (MIDI Timecode): the loaded timeline follows an incoming MTC

## Phase 10 - Remote web interface

Remote control works as an extension of the controlled instance (see `MEMORY.md`, Remote control; defined with the human on 2026-11-28). Development order: 10.0, 10.6, then 10.1, 10.2 and 10.4 together, then 10.7, then 10.8, 10.5 and 10.3.

- [x] 10.0 Mandatory show operators: every show has an administrator with a PIN, asked when a show is created and when a show without operators is opened
- [x] 10.1 Web server on the local network (native `http` module), always on while the application is open
- [x] 10.2 WebSocket transport with the same protocol as IPC (internal implementation, no dependency)
- [ ] 10.3 Responsive layout for desktop and mobile
- [x] 10.4 Access with the PIN of the operator entered on the controlled instance; the remote client acts as that operator
- [ ] 10.5 Connection address and QR code shown in the application (internal QR code generator, no dependency)
- [x] 10.6 Internal file manager replacing the system file dialogs: browse home and external drives, file and media types, new folder, copy, move, rename, move to trash, delete
- [x] 10.7 Instance name per computer, discovery of the instances on the network and "Remote control" from the start page, opened inside the application
- [ ] 10.8 Full control from remote: host files through the internal file manager, media sent from the remote device

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

- [ ] 12.1 Astro project in `/landing` with Tailwind CSS and TypeScript, static output only
- [ ] 12.2 Bilingual structure (English and Italian) with Astro i18n routing and a language switch
- [ ] 12.3 Layout and components consistent with the application design system (hardware skeuomorphism, spacing scale, palette, Lucide icons)
  - [ ] 12.3.1 Footer with the Aptec Studio credit, wordmark and copyright, as in the WooJam landing
- [ ] 12.4 Pages: home, features, download, documentation, license
- [ ] 12.5 Download page linking the platform builds on GitHub Releases
- [ ] 12.6 SEO basics: titles, descriptions, `hreflang`, sitemap, favicon
- [ ] 12.7 Local build script and deploy procedure (hosting to be defined, no GitHub Actions)

## Phase 13 - 3D stage

3D modeling of the stage with three.js, and a live visualizer that emulates the fixtures from the DMX output. It depends on the fixture model and the output engine (Phase 3) and on the simple console (Phase 4). It is numbered after the existing phases to avoid renumbering them; its position in the development order can be decided later.

- [ ] 13.1 three.js vendored locally and imported as native ES modules (see `MEMORY.md`, Dependencies and Code style)
- [ ] 13.2 Bundled `.obj` model library, ready to use:
  - [ ] 13.2.1 Truss: straight sections of common lengths, corners, T and cross joints, base plates, towers
  - [ ] 13.2.2 Stage: modular decks, risers, stairs
  - [ ] 13.2.3 Most used fixtures: moving head spot, moving head wash, moving head beam, PAR, LED bar, blinder, strobe, follow spot
  - [ ] 13.2.4 Moving fixtures split into separate parts (base, yoke, head) with defined pivot points, so pan and tilt can be animated
  - [ ] 13.2.5 Musicians with their instrument: drummer (with drum kit), guitarist, bassist, pianist (with piano or keyboard), singer (with microphone and stand); neutral figures, to visualize the band on stage and aim the lights
  - [ ] 13.2.6 Stage elements: guitar and bass amplifiers and cabinets, drum riser, risers and platforms, floor wedge monitors, PA speakers and subwoofers, microphone stands, keyboard stands, instrument stands, cases and flight cases, DJ booth
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
- [ ] 13.9 Video outputs in the 3D stage, to pre-program the whole show (lights and video together) without the real hardware:
  - [ ] 13.9.1 Screens and LED walls: flat or curved surfaces, sized in meters and pixels, showing the real program output of the linked video output as a live texture
  - [ ] 13.9.2 Virtual projectors: position, orientation, lens (throw ratio, lens shift), brightness and aspect ratio; the image is projected on the stage surfaces and models, with the visible light cone
  - [ ] 13.9.3 Preview of the videomapping (Phase 14): warp, masks and edge blending shown on the 3D surfaces as they would appear in the venue
  - [ ] 13.9.4 Screens, LED walls and projectors placed in the stage editor and linked to the video outputs of Phase 7; layout saved in `show.json`

## Phase 14 - Videomapping

Mapping of the video outputs on real surfaces: screens, projection surfaces, scenery and LED walls. It depends on the video outputs and layers (Phase 7) and, for the 3D mapping, on the 3D stage (Phase 13). Rendering runs on the GPU with WebGL in the output windows.

- [ ] 14.1 Output model: each video output has a canvas (resolution) split into one or more mapping surfaces, each with its own source (layer, media, video input)
- [ ] 14.2 2D warp on the output:
  - [ ] 14.2.1 Corner pin (four corners)
  - [ ] 14.2.2 Mesh warp with an editable grid of points (bezier interpolation)
  - [ ] 14.2.3 Masks: polygons and bezier shapes, with feather and inversion
  - [ ] 14.2.4 Input crop: the part of the source shown on each surface
- [ ] 14.3 Edge blending between overlapping projectors: blend width, curve and gamma per edge, black level compensation
- [ ] 14.4 3D mapping on models:
  - [ ] 14.4.1 Mapping surfaces taken from the 3D stage models (scenery, objects, imported `.obj`)
  - [ ] 14.4.2 Virtual projector calibrated on the real one (position, orientation, lens), so the render from its point of view matches the real projection
  - [ ] 14.4.3 Calibration helper: matching points between the model and the real projected image
- [ ] 14.5 Pixel mapping of the video on LED walls and LED matrices (extends Phase 5.4): pixel area, pixel order, output on Art-Net universes or on a video output
- [ ] 14.6 Mapping editor: live editing directly on the output, test patterns (grid, colors, numbers per projector), snap and zoom
- [ ] 14.7 Mapping presets saved in `show.json`, recallable from cues and from the timeline (Phase 8)

## Phase 15 - Multi-device

Several Backshade machines work on the same show at the same time, communicating in real time and staying in sync. It extends the transport of the remote web interface (Phase 10) and depends on the shared clock (Phase 8.5). Architecture: one master and several nodes (see `MEMORY.md`, Multi-device), with two working modes that can be combined:

- **Master-slave:** the slaves follow the master entirely (state and playback), as additional operator positions or as a backup ready to take over.
- **Distributed hardware:** the machines are synchronized and each one is dedicated to a specific task, driving only the part of the hardware connected to it (for example DMX interfaces on one machine, video outputs on another, audio interfaces on a third). Each machine manages only the hardware physically connected to it, never the hardware of another machine (decided by the human on 2026-11-27).

- [ ] 15.1 Session: a machine starts as master and opens the show; other machines join as nodes on the local network
- [ ] 15.2 Discovery of masters on the network (UDP broadcast through `dgram`) and manual connection by address
- [ ] 15.3 Roles per node: lights, video, audio, playback only, full; a role defines which parts of the show the node edits and which outputs it drives
- [ ] 15.4 State replication: the master is the source of truth; nodes receive the full state on join and then incremental changes; edits from a node are sent to the master, validated and broadcast to everyone
- [ ] 15.5 Edit locks per object (fixture, scene, cue, track, mapping) to avoid conflicts between operators
- [ ] 15.6 Clock synchronization: nodes estimate the offset and the latency from the master (round trip measurement, NTP-like), so cues and timeline playback start at the same instant on every machine
- [ ] 15.7 Local outputs: each node drives its own outputs (Art-Net, video outputs, audio devices) from the replicated state, without streaming the frames over the network
- [ ] 15.8 Media distribution: missing media files are copied from the master to the node show folder, with a check by hash
- [ ] 15.9 Monitoring: list of connected nodes with role, latency, clock offset and status; alerts on disconnection
- [ ] 15.10 Disconnection handling: a node that loses the master keeps its outputs on the last state and resynchronizes when it reconnects
- [ ] 15.11 Backup master that takes over if the master stops (to be evaluated)
- [ ] 15.12 Access protection with a session PIN, shared with the remote web interface (Phase 10.4)
- [ ] 15.13 Master-slave mode:
  - [ ] 15.13.1 Slave machines mirror the master: same state, same playback, same cue position
  - [ ] 15.13.2 Slave as operator position: it can show and control the show with the permissions of its role
  - [ ] 15.13.3 Slave as backup (tracking backup): it runs the show in parallel with its outputs disabled and takes over on request or when the master stops (extends 15.11)
- [ ] 15.14 Distributed hardware mode:
  - [ ] 15.14.1 Stable machine identity (identifier and name), kept across sessions and restarts
  - [ ] 15.14.2 Hardware map saved in the show: every output and input device (DMX interfaces and Art-Net universes, video outputs and displays, audio devices, MIDI controllers, timecode inputs) is recorded with the machine it is physically connected to, as that machine reports it
  - [ ] 15.14.3 Each machine drives only the hardware physically connected to it; no machine drives or relays the hardware of another machine
  - [ ] 15.14.4 Inputs connected to any machine (MIDI controllers, timecode, touch screens) are forwarded to the master and act on the whole show
  - [ ] 15.14.5 Synchronized start of cues, timeline, audio and video on all machines (clock of 15.6), with a check of the residual offset
  - [ ] 15.14.6 Hardware map editor: list of the machines with their connected devices, choice of which outputs of the show (universes, video outputs, audio outputs) each machine drives with its own devices, warnings for devices missing on their machine
  - [ ] 15.14.7 Failure of a machine: alert and quick reassignment of its hardware to another machine where the same devices are available

## Phase 16 - Touch and external controllers

Requirements that apply to the whole interface: every new component is designed to work with touch screens and to be controlled from external MIDI hardware. This phase collects the shared parts; each phase applies them to its own components.

- [ ] 16.1 Touch support in every component:
  - [x] 16.1.1 Pointer events only (mouse, pen, touch with the same code), no functions available only on hover
  - [x] 16.1.2 Hit areas of at least 48 px also for small controls (square keys, knobs), with the visual size unchanged
  - [x] 16.1.3 Multi-touch: several faders, knobs and keys moved or pressed at the same time
  - [x] 16.1.4 No accidental scrolling or zooming while a control is dragged; long press instead of right click
  - [ ] 16.1.5 Gestures where useful: pinch zoom and two-finger pan in the timeline, the 3D stage and the mapping editor (timeline done; the 3D stage and the mapping editor get them with Phases 13 and 14)
  - [x] 16.1.6 Touch mode with larger controls, chosen per device
- [x] 16.2 MIDI layer shared by the whole application (Web MIDI API, permission granted by the main process):
  - [x] 16.2.1 Detection of MIDI devices and hot plug, with status in the interface
  - [x] 16.2.2 MIDI learn on any control: faders, knobs, keys, go and back, scenes, chasers, cues, grid widgets (MIDI key of the top bar with a long press, decided by the human on 2026-11-27)
  - [x] 16.2.3 Feedback to the controller: LEDs, motorized faders, displays, rings of the encoders (displays of Mackie Control left out: no verified source of their messages yet)
  - [x] 16.2.4 Pickup (soft takeover) for faders and knobs without motors, to avoid jumps
  - [x] 16.2.5 Notes, control change, program change, pitch bend, relative encoders, MIDI Show Control
  - [x] 16.2.6 Mappings saved per show and per workstation (the same show on different hardware)
  - [x] 16.2.7 Ready-made profiles for common controllers (for example Akai APC, Novation Launchpad and Launch Control, Behringer X-Touch, Korg nanoKONTROL), also in Mackie Control mode: guided profiles and an automatic Mackie Control profile (decided by the human on 2026-11-27)
  - [x] 16.2.8 Monitor of the received and sent MIDI messages
- [ ] 16.3 Other controllers: OSC control surfaces (for example TouchOSC) on the OSC layer of Phase 9.2; HID devices such as Stream Deck to be evaluated (they need a native dependency)
