# QA report — 2026-09-10

## Checks

- `node --check main.js`: passed.
- `esbuild main.js --bundle --format=iife --target=es2020 --alias:three=./assets/three.module.min.js?v=165 --outfile=bundle.js`: passed; all imports resolve to the same local Three.js module.
- Local server preview at `http://localhost:4173/foldable-v2.html`: loaded the delivered glTF and EXR.
- Landing state: displayed the interactive model at the source-derived partially folded start pose with non-black source-screen media.
- Portrait state: selected through the accessible UI; after its 620 ms transition the canvas still displayed the WebGL model, not a pose image.
- Slider endpoint: the `Slider` action uses `LoopOnce` with `clampWhenFinished`, so sampling the exact 2-second endpoint remains fully open instead of wrapping to frame zero.
- Seated, Standing, and Durability: each uses a dedicated orbit target instead of inheriting the landing camera; the baselines were captured from the live source viewer at the same desktop viewport.
- DOM/runtime boundary: the `<img id="pose">` element and all `pose-visible` styles and code paths were removed.

## Acceptance

The requested no-image handoff condition is met: all seven named states render through the one canvas model. The retained static pose images have no runtime display path.

## Full-window controls — current UI check

- Verified in the existing in-app browser using its Playwright/AX interface at 1447×998 and 390×844. Canvas bounds equal the viewport; there is no page overflow.
- Removed research heading, state descriptions, usage instructions, technical footer and runtime-ready messages. Visible text is limited to pose labels and the active fold percentage.
- Standing selection hides the unavailable fold/replay controls; returning to Foldable restores them. The accessible range reaches 100% and keeps the model open.
- Narrow viewports reduce camera zoom so the model remains fully visible, while the pose dock wraps within the window. The viewport override was reset after checking.
- Page identity, rendered model, screenshots and interaction state passed; current browser error/warning logs were empty.
- This check validates layout and controls, not exact Apple screen-content or material parity. Existing screen-content orientation still needs separate calibration.

## Screenshot texture removal

- Removed the two screenshot-derived screen textures and their source image from the deliverable; a recoverable copy is kept in the workspace's `work/removed-screen-crops-20260910/` folder.
- Source, generated bundle and manifest contain no references to those images. Screen binding now accepts only dynamic render targets and stays unlit while they load.
- Refreshed the local preview: the dynamic screen still renders, Standing remains selectable, and current error/warning logs are empty. JavaScript syntax and manifest parsing passed.

## Replay timeline

- Root cause: `Intro` and `Slider` each target the same 27 model nodes through 81 channels. The previous replay activated both actions and called `setFold()` on every frame, re-enabling Slider while Intro was running and blending incompatible hardware transforms.
- Replay now gives Intro exclusive mixer ownership, updates the fold readout without sampling Slider, blocks repeated playback, then restores the paused Slider timeline at 33%.
- Live verification captured intact early and unfolding frames, followed by a stable interactive 33% end state. Replay was disabled during the two-second run and re-enabled afterward; browser error/warning logs were empty.

## Intro playback isolation

- `Intro` and `Slider` each contain 81 tracks targeting the same 27 model nodes. Playback now stops every active mixer action before starting `Intro`, updates only its clock during the two-second replay, and restores the paused `Slider` timeline at the default fold value afterward.
- Replay and slider controls are disabled while `Intro` owns the skeleton, preventing concurrent replay loops and scrub input.

## Wipe projection and blur — current UI check

- Corrected framebuffer-to-glTF orientation with a Y-only transform; lock-screen text is no longer mirrored or upside down, and outer-screen status/action icons occupy their intended vertical positions.
- Matched source inner/outer Wipe positions and blur bounds. Inner blur follows hinge progress from the right-side seam and covers the left screen panel; outer blur keeps the source midpoint bell curve.
- Injected the screen-local projection and camera-relative edge calculation into the actual device MeshPhysicalMaterial. Free-camera sampling stays UV-anchored with bounded planar parallax, so the wallpaper does not slide outside the mesh.
- Clamped the second remap before bicubic mip lookup. This prevents out-of-range LOD reads from returning black on the current GPU and preserves visible blurred content across the left panel.
- Checked 33%, 78%, 90%, and 100% fold states in the live in-app browser. The current shader compile/error log is empty.

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
