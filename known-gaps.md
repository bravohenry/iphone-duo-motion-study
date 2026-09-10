# Known fidelity gaps

This artifact is a local `PIPELINE_REPLAY` using public page-delivered assets. It is not a redistribution of the Apple Lotus viewer runtime.

| Area | Source behavior | Local behavior | Impact |
| --- | --- | --- | --- |
| Hinge | A Lotus `Hinge` component applies magnetic/spring settling. | Slider time is mapped directly to the delivered `Slider` clip. | The trajectory is continuous, but its final easing and hinge physics are approximate. |
| Screen render | `WallpaperRenderer`, `Wipe`, and `FadeThroughBlack` drive screen presentation under a fixed authored camera. | Original wallpaper layers and UI resources feed two-pass bicubic blur; screen materials add local-planar parallax and a hinge-centered radial shadow. | Free orbit uses a UV anchor to keep content covering the device at camera angles the source scene never authored. |
| Material passes | Lotus owns final material/pass wiring. | Three.js uses the delivered geometry, EXR, tone mapping, and direct lights. | Metal, glass, and screen reflection can differ under some view angles. |
| Named state camera | Source state changes use Lotus camera composition. | The local camera starts with source constraints and remains freely controllable. | The state pose is research-aligned rather than pixel-matched. |

The source pose images remain in `assets/` only as analysis references. They are deliberately absent from the runtime DOM and cannot replace the interactive model.

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
