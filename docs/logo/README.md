# Backshade logo

Official Backshade logo, provided by the human on 2026-11-22.

![Backshade logo](png/icon-128.png)

- Background `#33343a`, mark `#ebe8e0`.
- The name is written "Backshade", with a capital initial.

## Masters

| File | Content |
| --- | --- |
| `icon-512.psd` | Master of the standard icon |
| `icon-512.png` | Standard icon, 512 x 512 px, full-bleed square |
| `icon-maskable-512.psd` | Master of the maskable icon |
| `icon-maskable-512.png` | Maskable icon, 512 x 512 px, mark inside the safe zone |

The `.psd` files are the masters. All other files are derived from the PNG exports and must be regenerated, not edited by hand, when the logo changes.

## Derived icons

| File | Use |
| --- | --- |
| `png/icon-16.png` to `png/icon-512.png` | Sizes 16, 24, 32, 48, 64, 128, 256 and 512 px, for the interface, the window and Linux packages |
| `icon.ico` | Windows icon, sizes 16 to 256 px (`electron-builder`, `win.icon`) |
| `icon.icns` | macOS icon, sizes 16 to 1024 px (`electron-builder`, `mac.icon`) |
| `icon-macos-512.png` | macOS artwork: rounded tile with a transparent margin, following the macOS icon grid; source of `icon.icns` |
| `web/favicon.ico` | Favicon, sizes 16, 32 and 48 px |
| `web/favicon-32.png` | PNG favicon |
| `web/apple-touch-icon.png` | Apple touch icon, 180 x 180 px |
| `web/icon-192.png`, `web/icon-512.png` | Web app manifest icons (`purpose: any`) |
| `web/icon-maskable-192.png`, `web/icon-maskable-512.png` | Web app manifest icons (`purpose: maskable`) |

Notes:

- The 1024 px size in `icon.icns` is upscaled from the 512 px export. A 1024 px export from the `.psd` would make it sharper.
- When `/app` and `/landing` are created, the needed files are copied into `app/build/` (packaging resources) and `landing/public/` (favicon and manifest icons). The remote web interface (Phase 10) uses the `web/` set.
