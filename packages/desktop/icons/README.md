# Rainny icons

`rainny-master.png` is the source artwork for the Rainny desktop icon. The icon combines a rain drop, an `R`, and code brackets. It
is intentionally free of text so it remains legible at small sizes.

The current `dev`, `beta`, and `prod` icon sets are generated from the same master. Use macOS `sips` for the PNG size matrix,
`iconutil` for `icon.icns`, and `sips -s format ico` for the Windows icon. Keep these files synchronized:

- `icon.png`: 512 x 512
- `dock.png` and `128x128@2x.png`: 256 x 256
- `icon.icns`: 16 through 1024 pixel representations
- `icon.ico`: 256 x 256 Windows icon
- Linux, Windows Store, and iOS compatibility PNGs at their filename dimensions

For unpackaged Electron on macOS, `app.dock.setIcon()` uses `dock.png`. Verify the icon visually in both development and packaged
builds before release.
