# TESTING.md - Final live tests

Checklist of the tests to run live, with real hardware, before the first release (1.0.0). It lists what has been built so far and is updated at the end of every phase or sub-phase. Automated checks run during development do not replace these tests: here the point is the real devices, the real network and a real show.

How to use it:

- check an item (`- [x]`) when it works as described;
- when something fails, leave it unchecked and add a short note under it (what happened, on which system and device);
- "Proposed" choices recorded in `MEMORY.md` (tuning, colors, defaults) are reviewed during the same session.

## Setup for the tests

- At least two computers, ideally with different systems (Windows, macOS, Linux).
- One or more Art-Net nodes, a USB DMX interface (Enttec DMX USB Pro or compatible, and an Open DMX USB if available).
- Real fixtures: dimmers or pars (RGB), at least one moving head (pan and tilt 16 bit), an LED pixel matrix or a pixel controller.
- A second display or a projector, a webcam or a capture card, an external audio interface.
- A touch screen (or a tablet connected as a monitor) for the grid and the drag and drop.

## 1. Installation and launch

- [ ] The application starts on Windows, macOS and Linux with no errors.
- [ ] It works offline (network cable removed, no Wi-Fi): no missing icons, fonts or styles.
- [ ] Interface in English and Italian; switching language updates every section.
- [ ] A language pack installed by the user appears in the settings and is applied.
- [ ] The About window shows version, license and the Aptec Studio credit.
- [ ] The fullscreen key of the top bar enters and leaves fullscreen; the icon follows the system shortcut too.
- [ ] With the application open and no input for longer than the screen and sleep timeouts of the system, the screen stays on and the computer does not sleep, on Windows, macOS and Linux (also on battery); after quitting, the timeouts work again.

## 2. Shows, templates and media

- [ ] Start page: recent shows with name, date and folder; a moved or deleted show is marked.
- [ ] New show from the "Empty show" template and from a user template; open, save, save as, rename, close.
- [ ] New show from the "Demo show" template: everything opens (fixtures, LED wall, scenes, chasers, cues, grid, audio, video, timeline) with no missing fixtures; with the video output enabled, the timeline plays lights, audio and video together.
- [ ] Unsaved changes: closing the show or the window asks to save; every answer behaves as expected.
- [ ] Autosave: kill the application during work (task manager) and reopen the show: the recovery is offered and restores the changes.
- [ ] History: after several saves the older versions are kept in `history/` (at most 10).
- [ ] Save as template, rename and delete user templates; included templates are read only.
- [ ] Export a show as `.bshow` and import it on the other computer: patch, scenes, media and settings are intact.
- [ ] Export and import a template as `.btemplate`.
- [ ] Media: import audio, video and image files (also large videos), show in the folder, delete.
- [ ] A show copied to another computer (USB stick, other system) opens with all its media: paths are portable.
- [ ] Show settings: description, notes, timecode frame rate, default fades are saved with the show.
- [ ] Default shows folder changed in the settings: new shows are created there.

## 3. Fixtures and patch

- [ ] The included library has the common models; search and categories work.
- [ ] Custom fixture editor: create a fixture with channels, ranges, modes and physical data; export and import it.
- [ ] A show with a definition missing on this computer reports it at opening and lets you import it.
- [ ] Patch on several universes; overlapping addresses are refused with a clear message.
- [ ] List view and DMX map view agree; fixture type icons are right.
- [ ] Fixture groups: create, change, delete; they work on the console and on the grid.
- [ ] LED matrix patched on several universes (for example 32 x 16 RGB): the segments match the real controller.

## 4. DMX output

- [ ] Art-Net broadcast: a real node receives every universe in use; the lights follow without flicker.
- [ ] Art-Net unicast to one or more addresses per universe; Port-Address per universe.
- [ ] ArtPoll finds the nodes on the network.
- [ ] Choice of the network interface; with the cable unplugged nothing is sent on a wrong network, and sending resumes when the cable is back.
- [ ] Output on or off per workstation.
- [ ] Frame rate of the show changed: the output follows (check with a node or a DMX tester).
- [ ] USB DMX: Enttec DMX USB Pro, Open DMX USB; one universe per interface; unplug and plug back during output.
- [ ] HTP on intensity and LTP on the other channels when several sources (desk, scenes, grid, timeline) control the same fixture.
- [ ] Grand master, blackout and full on from the top bar and from the grid.
- [ ] DMX monitor shows the real values sent, per universe.
- [ ] 16 bit channels (pan and tilt): smooth movement on a real moving head.

## 5. Simple console

- [ ] Preset A and B rows: faders move the right channels, named after the patched fixtures.
- [ ] Banks of channels and universe choice; A/B mode and single 24 channel mode.
- [ ] Flash keys; masters A and B in crossfade; grand master; home; blind (the output does not change while editing).
- [ ] Attributes panel: select one or more fixtures, their channels on the faders; pan and tilt on the jog wheels; RGB on the color wheel on a real RGB fixture.
- [ ] Scenes: record from the desk and the attributes, two banks of 12, recall with the saved fade times; non-intensity channels follow the fade.
- [ ] Several scenes on together; scene master.
- [ ] Chasers: steps from scenes, step and fade time, bpm and tap tempo, loop, back and forth, random, one shot.
- [ ] Live cues: Go, Back, Pause, current and next cue, fade progress, follow time; reordering by drag and drop renumbers as expected.
- [ ] Values shown as percentage or 0-255, chosen separately for faders and knobs.

## 6. LED matrices

- [ ] Matrix preview in the Matrices section matches the real wall (pixel order, start corner, snake).
- [ ] Basic effects (solid, gradient, scroll, text) and preset animations (rainbow, wave, sparkle, fire, pulse, plasma, chase) with chosen colors, live on the real wall.
- [ ] Image effect from the show media (fit, fill, stretch).
- [ ] Effects recorded in scenes and recalled with the scene.
- [ ] Frame rate and smoothness of the effects on a large matrix spread over several universes.

## 7. Virtual console grid

- [ ] Pages with their columns and rows; cells adapt to the window and to a small screen.
- [ ] Widgets: key, fader, knob, color picker, XY pad, label, monitor; edit mode and run mode.
- [ ] Links: scenes, chasers, groups, cues, masters, DMX channels, desk commands, audio player, timers.
- [ ] Touch screen: several faders and keys at the same time with multi-touch, no wrong presses.
- [ ] Widgets moved and resized in edit mode, also by touch.

## 8. Audio

- [ ] Audio devices listed; output on an external audio interface.
- [ ] Playlist: play, pause, stop, next, previous, auto advance, volume.
- [ ] Items with start and end time, fade in and fade out, loop.
- [ ] A scene with an audio item starts it with the fades of the scene; cues and grid keys start audio.
- [ ] Audio stays in sync with lights and video over a long show (no drift).

## 9. Video

- [ ] Displays listed; output fullscreen on a second display or a projector; window output with position and size.
- [ ] Stacking order of several outputs on the same display.
- [ ] Layers: video, image, opacity, fit; transitions; preview and program with Take and transition time.
- [ ] Video inputs: webcam and capture card as layer sources, quality and frame rate per layer; latency acceptable for a live show.
- [ ] Program recorded in scenes and recalled with the scene.
- [ ] Text gobos: text, font, size, outline, mask (circle and image), soft edge, focus, rotation, prism, animations, dynamic texts (song, timecode, clock, countdown).
- [ ] Timer screens: clock, countdown, countdown to a time, stopwatch; behavior at zero; control from the Video section and grid keys.
- [ ] Long videos play smoothly in fullscreen (no dropped frames, no tearing) on every system.

## 10. Timelines

- [ ] Several timelines per show; tracks added, removed, moved, put in folders, muted, resized; zoom and scrolling.
- [ ] Light, audio, video and automation tracks play what they should, on the right outputs.
- [ ] Clips: move (also to another track), resize, fades, snap (bars, beats, seconds, frames), selection, duplicate, split, undo and redo.
- [ ] Playback with loop; the timecode display of the top bar follows the playhead.
- [ ] Lights, audio and video stay in sync during a whole song and over a long run.
- [ ] Audio clips show the waveform of the part of the file they play, also after trimming the start; long files (10 minutes and more) load without freezing the window.
- [ ] Markers: added with the Marker key, the M key and a double click on the ruler; moved by dragging with snap; a press moves the playhead to them; renamed, moved and deleted from their dialog; undo and redo.
- [ ] In go mode playback pauses exactly on a stop marker and Play continues from there.
- [ ] Recording: with tracks armed and the record key on, play and use memory keys, cues, master and group faders, the audio player and Take on the video outputs; every action becomes a clip or a curve on the right armed track, with the right times and fades, and plays back the same; Undo removes the whole pass.
- [ ] Recording over a loop adds a pass for every turn; recording with real controllers (MIDI faders, when available) gives smooth curves.
- [ ] Markers panel: Go continues to the next stop, a second Go while playing does nothing; Back goes to the previous marker, playing or paused; a row moves the playhead; the next stop and the current marker follow the playhead during a whole show.

## 11. Drag and drop

- [ ] Every reorderable list (tracks, folders, cues, playlist, video layers and the others) moves by mouse and by touch, with the preview of the drop place and the animation of the neighbors.
- [ ] Dropping a track into a folder works; long press starts the drag on touch without blocking scrolling.

## 12. Operators

- [ ] A new show always asks for the administrator and their PIN; it asks for the PIN at every opening, on every computer.
- [ ] A show without operators (older show, archive) asks for the administrator before anything works, also from the grid and MIDI controllers; saved, it asks for the PIN at the next opening.
- [ ] Operators with sections hidden, read only and editable: tabs and sections follow the profile.
- [ ] Read only: the section can be seen and played (scenes, cues, video take, timeline) but changes are refused.
- [ ] Change operator from the top bar key; the last section opens again after the PIN.
- [ ] Wrong PIN: message; after 5 wrong PINs the keypad is locked for 30 seconds.
- [ ] Several administrators; the last administrator cannot lose the role; the operator who entered cannot be deleted.
- [ ] Show settings available only to administrators.
- [ ] A protected show moved to another computer keeps its operators; templates never carry operators, new shows have only their administrator.

- [ ] An operator with read-only sections sees their editing controls dimmed and cannot use them (mouse, touch and keyboard), while faders, memory keys, cues, transport, Go and Take still work; the timeline cannot be recorded.

## 12a. Shared tempo

- [ ] A chaser with the shared tempo changes step exactly on the beats of the timeline playing (watch it against the audio of a song with a click), and goes back to its own bpm when the timeline stops; the top bar shows the right tempo.

## 12b. External mixers

- [ ] X32 or M32: a recall from the mixer dialog, from a scene, from a cue and from a mixer track loads the right scene of the show loaded on the mixer (check that the number shown on the mixer matches).
- [ ] X Air or MR (XR12, XR16, XR18, MR18): snapshots 1 to 64 are recalled.
- [ ] Wing: with a show loaded on the mixer, the right item of the show list is recalled.
- [ ] Generic OSC with another device or software (for example QLab or Reaper): the address with the number arrives as expected.
- [ ] A mixer that is off or unreachable never blocks the show; the test row reports the error.

- [ ] MIDI mixer (for example Allen & Heath SQ or Qu, Yamaha): scenes recalled by program change, with bank select above 128; check that the scene numbers match.

## 13. Import from another show

- [ ] Import dialog: source among the recent shows and from a folder; categories and single items with toggles.
- [ ] A protected source asks for the PIN of its administrator; no PIN when the same administrator (same name and PIN) entered the open show.
- [ ] Dependencies: choosing a chaser brings its scenes, and the scenes bring their fixtures, matrices, audio, video and media.
- [ ] Conflicts: add, replace and skip for occupied slots, overlapping addresses, different files with the same name, operator names; imported scenes drive the moved fixtures on the real rig.
- [ ] Two operators with the same PIN after an import: the keypad offers their names.

## 14. Stability

- [ ] A whole show run (several hours) with lights, audio, video and timeline: no slowdowns, memory and CPU stay stable.
- [ ] Quit and restart during a show: everything comes back as saved.
- [ ] Two instances on the same network do not disturb each other's Art-Net output when configured on different universes.

## 15. MIDI controllers

- [ ] Plugging and unplugging a USB MIDI controller updates the list in the MIDI panel of the show settings, while the application runs.
- [ ] The MIDI key turns learn on only after a long press (the ring fills); a short press does nothing, and a short press turns learn off.
- [ ] MIDI learn with a real controller: faders on masters and Preset A channels, buttons on memory keys, cues, blackout, audio and timeline transport, grid widgets; the mappings work after saving and reopening the show.
- [ ] Pickup: a fader without motor does not move its target until it reaches the current level.
- [ ] The same show on two workstations with different controllers keeps the mappings of both.
- [ ] Feedback: LEDs of pads follow scenes, chasers, blackout and transport; motorized faders follow masters moved from the interface and do not fight the hand; LED rings of encoders follow their level.
- [ ] Endless encoders in both relative encodings move their level in small steps in the right direction.
- [ ] MIDI Show Control from a show controller (for example QLab): Go with and without a cue number, Stop, Resume, Reset; other device IDs are ignored.
- [ ] The monitor shows what the controller sends and what Backshade sends back.
- [ ] Guided profiles with each real controller (APC mini and mk2, Launchpad, Launch Control XL, nanoKONTROL2, X-Touch Mini): every asked control is learned, LEDs light in the documented colors.
- [ ] Mackie Control profile with a real surface (X-Touch, X-Touch One, iCON): faders, motorized feedback, V-Pots, Select, Mute, Solo and transport do what the MIDI panel says.
- [ ] MIDI timecode from a DAW or a timecode generator at 25 and 30 fps: the timeline starts, follows, locates after a jump of the DAW and pauses when it stops; the start timecode works with 01:00:00:00.

## 16. Touch screens

- [ ] On a touch screen the automatic touch mode turns on; keys, fields and rows are easy to hit; it can be forced on or off per device.
- [ ] Several faders and keys moved and pressed together with several fingers (console, grid).
- [ ] Long press in the timeline: opens a clip, adds a clip, opens or adds a marker, removes an automation point; the system menu never appears.
- [ ] Pinch zoom in the timeline follows the fingers and lands on the right point; scrolling with one or two fingers works; the page never zooms.
- [ ] Small square keys and knobs can be hit with a finger also slightly outside their drawing.

## 17. File manager

- [ ] On Windows, macOS and Linux the home folder and external drives (USB sticks, other disks) are listed; a drive plugged in appears when the manager is opened again.
- [ ] Opening, importing and exporting shows and templates, fixtures and media; overwrite asks first.
- [ ] New folder, rename, copy and move large videos also between drives, move to the trash (check the system trash) and delete.
- [ ] The open show and its folders cannot be removed; a link cannot lead outside the places.

## 18. Remote control from a browser

- [ ] From phones, tablets and another computer on the same network (Wi-Fi and cable): the address of the Application settings opens the login; the PIN of the operator entered works, others and nobody entered are refused.
- [ ] Changes made on the browser and on the computer reach each other; media and video previews play on the browser.
- [ ] Changing or leaving the operator on the computer disconnects the browser, which asks again.
- [ ] Turning off the Wi-Fi of a phone while holding a flash key releases it within about 10 seconds; reconnecting brings the page back.
- [ ] Firewall of Windows and macOS: the first start asks to allow the network; the browser connects after allowing it.
- [ ] Safari on iPhone and iPad, Chrome on Android, Firefox: every section works.

