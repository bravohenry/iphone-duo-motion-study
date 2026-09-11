# Target-bound source facts

- `SOURCE` Canonical target: `https://www.apple.com/iphone-duo/`, expanded **Take a closer look / Foldable design** viewer, observed at 1280 x 720 CSS pixels with DPR 2 on 2026-09-10.
- `SOURCE` The target surface is the canvas appended under `.product-viewer-enhanced-container.product-viewer-canvas`; the observed canvas attributes were `2560 x 1520`, matching DPR 2.
- `SOURCE` The public scene points at `static/scenes/iPhoneDuo_US_L_avif.lsd`, which declares the delivered model, EXR environments, product-state variants, `Hinge`, `FadeThroughBlack`, `WallpaperRenderer`, and the two screen mesh names.
- `SOURCE` The public `InteractiveCamera` definition declares radius `35`, FOV `50`, zoom `1.5`, start orbit `phi=PI/2`, `theta=PI`, pitch limit `[1.1519173063, 2.0943951024]`, and damping `[0.22, 0.25]`.
- `SOURCE` The public state variants declare the primary/pose/accent hierarchy values used by `main.js`; its rotations use the `YXZ -> ZYX -> YXZ` Euler order chain.
- `SOURCE` The scene routes the fold control through a spring/magnet `Hinge` and routes screen changes through `FadeThroughBlack`; the bare `Slider` glTF clip is therefore an incomplete representation of the source viewer.
- `SOURCE` The scene assigns `ADsFgCxkeKZYiww.exr` to material layer 4 with rotation `[1, 0.6, 0]`, and `SfFEyQuyjAgUwjH.exr` to layer 5 with rotation `[0, 2.09, 0]`; local hashes confirm these are the retained `apple-environment-alt.exr` and `apple-environment.exr` files respectively.
- `SOURCE` Material chunks override the bare glTF after load. In particular, `iVzCHFKAaRqjQhl` restores the Apple Logo layer from transparent to visible, while the rear-camera stack receives separate transparency values and reflection layers.
- `SOURCE` The same chunks replace the glTF AO references: `FoAbzXGuCEeVRQW` uses `chXcmJILZBdVbSF` (`aZqkEeTujOoBroI.avif`), while the finish carrier group uses `rmbtiCKMcdkeWlF` (`ENOOHgwiucFCbVu.avif`). Both images already exist in the delivered model package, so the local adapter reuses the decoded textures rather than adding new copies.

## Source locations

- Page markup: `https://www.apple.com/iphone-duo/`
- Scene: `https://www.apple.com/v/iphone-duo/a/static/scenes/iPhoneDuo_US_L_avif.lsd`
- Page runtime: `https://www.apple.com/v/iphone-duo/a/built/scripts/overview/main.built.js`
- Scene runtime chunk: `https://www.apple.com/v/iphone-duo/a/built/scripts/vendors~lotus-lib.built.js`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
