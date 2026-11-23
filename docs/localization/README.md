# Backshade localization

Backshade is multilingual. English is the default and reference language; Italian is included. New languages can be added as **language packs**, also on an installed copy of the application, without rebuilding it.

## Language pack format

A language pack is a single JSON file named after the language code, for example `de.json` or `pt-BR.json`:

```json
{
  "meta": {
    "code": "de",
    "name": "Deutsch",
    "formatVersion": 1
  },
  "messages": {
    "common": {
      "save": "Speichern"
    }
  }
}
```

- `meta.code`: language code, equal to the file name: two or three lowercase letters, with an optional uppercase region (`de`, `pt-BR`).
- `meta.name`: name of the language written in the language itself, shown in the language selector.
- `meta.formatVersion`: version of the pack format, currently `1`.
- `messages`: the texts, with the same keys and groups as the English pack (`app/src/locales/en.json`). Placeholders in braces, such as `{value}`, must be kept unchanged.

Texts missing from a pack are shown in English, so a partial translation works and can be completed over time.

## Creating a new language

1. Copy `app/src/locales/en.json` and rename it with the new language code.
2. Change the `meta` data and translate the texts in `messages`.
3. Follow the text rules of the interface: no uppercase-only text, no emoji or special symbols; use plain punctuation (`-` for dashes, `deg` for degrees).

## Installing a language on an installed application

Copy the pack into the `locales` folder inside the user data folder of Backshade:

| Platform | Folder |
| --- | --- |
| Windows | `%APPDATA%\Backshade\locales` |
| macOS | `~/Library/Application Support/Backshade/locales` |
| Linux | `~/.config/Backshade/locales` |

The folder is created at the first launch. The new language appears in the language selector when the interface is reloaded. A pack in this folder with the same code as an included language replaces it, so a translation can be corrected without updating the application. Invalid packs are ignored.

## Including a language in the application

Add the pack to `app/src/locales/`. The build (`npm run build`) checks every included pack: valid `meta` data, only texts with allowed characters, and exactly the same keys as `en.json`.
