# AGENTS.md - Instructions for AI agents

This file defines the rules every AI agent must follow when working on the **Backshade** project.

## 1. Rules about this file

- The AI agent **must not modify this file** without the human's authorization or explicit consent.
- If the agent thinks a change would help, it proposes it to the human and waits for confirmation before applying it.

## 2. Reference files

| File | Content | Updated by |
| --- | --- | --- |
| `AGENTS.md` | Rules for AI agents | Only with the human's consent |
| `ROADMAP.md` | Project roadmap: phases, sub-phases and progress | The agent, at the end of each phase or sub-phase |
| `MEMORY.md` | Technical choices, conventions and decisions | The agent, whenever a decision is made |
| `CHANGELOG.md` | History of released versions | The agent, on each approved version |

- The roadmap is described and tracked **only** in `ROADMAP.md`: completed items are checked (`- [x]`).
- Every choice or convention (libraries, structure, formats, names) is recorded in `MEMORY.md` before or right after it is applied.
- Before starting any work, the agent reads `ROADMAP.md` and `MEMORY.md`.

## 3. Language

- Conversations with humans are **in Italian**.
- `.md` files are **in English**.
- Source code and naming (variables, functions, classes, files, folders, JSON keys, technical commit messages) are **in English**, **code comments included** (changed from Italian on 2026-11-23).
- User interface text follows the localization system defined in `MEMORY.md`.

## 3.1 Allowed characters

- Source code, `.md` files and the application interface must contain **only readable, interpretable alphanumeric characters**: letters, digits, standard ASCII punctuation and whitespace.
- Accented letters (e.g. `à`, `è`, `é`, `ì`, `ò`, `ù`) are allowed.
- **Forbidden:** special characters, glyphs, symbols and emoji, such as long dashes, typographic quotes, arrows, the degree sign, the multiplication sign, bullets, box-drawing characters, check marks.
- Use ASCII equivalents instead: `-` for dashes, `"` and `'` for quotes, `->` for arrows, `deg` for degrees, `x` for dimensions.
- Icons in the interface come only from the icon library defined in `MEMORY.md`, never from characters.

## 4. Code style

- Each language follows its reference standard style (indentation, spacing, blank lines, new lines, punctuation, brace placement, semicolons).
- Comments follow the language conventions (e.g. JSDoc/TSDoc for TypeScript) and are written in English, like the rest of the source code, including log and error messages.
- Single responsibility: each file is a component with one specific task; different contexts or roles are never mixed in the same file (see `MEMORY.md`).
- Every file ends with a new line; no trailing whitespace.
- Shared formatting rules are defined in `.editorconfig`.
- Specific conventions (e.g. the TypeScript configuration, the module rules and the internal frameworks) are detailed in `MEMORY.md`.

## 5. Doubts and questions

- When the agent has doubts it must **ask the human through interactive polls** (multiple-choice questions), in Italian.
- The agent does not proceed on ambiguous, irreversible or architecture-impacting choices without asking.

## 6. Git and versioning

- Work **only on the `main` branch**. Do not create other branches.
- The agent does not commit or push without the human's consent.
- Versioning follows [Semantic Versioning](https://semver.org/).
- Version **1.0.0** is the **first release**: it is published when all the planned features are implemented and the software is ready for distribution and testing.
- **Before 1.0.0** (development stage, even when the software already runs): no version numbers are assigned; at the end of each phase or sub-phase the agent only asks whether to commit and push.
- **From 1.0.0 onwards**: at the end of each phase or sub-phase the agent:
  1. presents the changelog list;
  2. proposes the new version number (patch, minor or major, explaining the choice);
  3. asks whether to commit and push.
- After approval the agent updates `CHANGELOG.md`, the version in `package.json` and `ROADMAP.md`.

## 7. Dependencies

- Use **as few dependencies as possible**. Prefer native Node.js, Electron and browser APIs.
- Every new dependency is proposed to the human with a poll, justified and recorded in `MEMORY.md`.
- UI libraries are bundled locally (vendor), never loaded from a CDN: the software must work offline.

## 8. Project

**Backshade** is a programming console for live shows, cross-platform (Windows, Linux, macOS), built on Electron with a web interface.

- **Technologies:** HTML, **TypeScript**, **SCSS**, with an internal TypeScript framework and an internal SCSS framework that live only in `app/src/framework/ts` and `app/src/framework/scss`.
- **Repository layout:** the Electron application lives in `/app`; the static bilingual website (English and Italian) lives in `/landing` and is built with Astro, TypeScript and Tailwind CSS.
- **License:** GPL-3.0.
- **Guiding principle:** the software must be simple.

Features to support:

- Multi-universe DMX and Art-Net fixtures.
- LED matrices.
- External video and audio devices.
- Virtual console on a customizable grid for each show.
- Simple console, a hybrid of live operation and programming, with saved scenes and chasers.
- Pre-programmable shows through a track-based interface (like a DAW editor).
- Video direction and audio playback with optional overlay images.
- Integration between lights, audio and video.
- Integration with external audio mixers.
- Saving and cloning shows as projects in dedicated folders, portable from one device to another.
- Web interface usable from desktop or mobile, reachable through a web server on the local network.

## 9. Design guidelines

- **Visual model:** hardware skeuomorphism (the interface recalls the surfaces, faders, buttons and displays of a physical console). See `MEMORY.md` for the reference adopted.
- **Spacing:** multiples of 8 only, always the same values from the scale defined in `MEMORY.md`.
- **Theme and colors:** dark theme only, neutral palette; panels and cards are flat; gradients and shadows are allowed only on realistic controls (faders, knobs, keys, displays); **no glow**.
- **Icons:** never emoji or emoticons. Line icons only, all from the same library (see `MEMORY.md`).
- **Typography:** at most two weights per font; **do not use UPPERCASE text**.
- **Decorations:** keep decorations and badges on text and numbers to a minimum.
- **Charts:** thin lines and soft colors; axes and data take visual priority.
