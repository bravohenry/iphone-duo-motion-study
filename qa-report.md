# QA report — 2026-09-11

## Checks

- `node --check main.js`: passed.
- `esbuild main.js --bundle --format=iife --target=es2020 --alias:three=./assets/three.module.min.js?v=165 --outfile=bundle.js`: passed; all imports resolve to the same local Three.js module.
- Local server preview at `http://localhost:4173/foldable-v2.html`: loaded the delivered glTF and EXR.
- Landing state: displayed the interactive model at the source-derived partially folded start pose with non-black source-screen media.
- Portrait state: selected through the accessible UI; after its 620 ms transition the canvas still displayed the WebGL model, not a pose image.
- Slider endpoint: the `Slider` action uses `LoopOnce` with `clampWhenFinished`, so sampling the exact 2-second endpoint remains fully open instead of wrapping to frame zero.
- Seated, Standing, and Durability: each uses a dedicated orbit target instead of inheriting the landing camera; the baselines were captured from the live source viewer at the same desktop viewport.
- DOM/runtime boundary: the `<img id="pose">` element and all `pose-visible` styles and code paths were removed.

## Teaching views

- Mockup, Product Demo and WebGL Pipeline switch through one segmented control and reuse one model/renderer instance.
- WebGL stages Sky, Stars, Hills, Dunes, UI, Frame, Blur and Wipe were selected in the live browser. The first seven show their corresponding render targets; Wipe returns to the live folding mesh with the local blur/shadow projection.
- Browser error/warning logs were empty after switching among all three views.

## Acceptance

The requested no-image handoff condition is met: all seven named states render through the one canvas model. The retained static pose images have no runtime display path.

## Mockup workspace

- Local PNG, JPG, WebP and AVIF files were imported through the picker and rendered on both model screens without console errors.
- Cover/Contain, zoom and two-axis image positioning update the offscreen canvas input before Frame, blur and Wipe passes.
- Both, Inner and Outer target modes keep separate image and crop state; Clear only resets the selected target.
- Mockup keeps the fold slider and all seven pose presets visible. Pointer orbit was verified beyond the source viewer's original polar limits; wheel zoom and right-drag pan remain enabled.

## Full-window controls — current UI check

- Verified in the existing in-app browser using its Playwright/AX interface at 1447×998 and 390×844. Canvas bounds equal the viewport; there is no page overflow.
- Removed research heading, state descriptions, usage instructions, technical footer and runtime-ready messages. Visible text is limited to pose labels and the active fold percentage.
- Standing selection hides the unavailable fold slider; returning to Foldable restores it. The accessible range reaches 100% and keeps the model open.
- Narrow viewports reduce camera zoom so the model remains fully visible, while the pose dock wraps within the window. The viewport override was reset after checking.
- Page identity, rendered model, screenshots and interaction state passed; current browser error/warning logs were empty.
- This check validates layout and controls, not exact Apple screen-content or material parity. Existing screen-content orientation still needs separate calibration.

## Screenshot texture removal

- Removed the two screenshot-derived screen textures and their source image from the deliverable; a recoverable copy is kept in the workspace's `work/removed-screen-crops-20260910/` folder.
- Source, generated bundle and manifest contain no references to those images. Screen binding now accepts only dynamic render targets and stays unlit while they load.
- Refreshed the local preview: the dynamic screen still renders, Standing remains selectable, and current error/warning logs are empty. JavaScript syntax and manifest parsing passed.

## Fold controls

- Removed the one-shot `Intro` playback path and its play button. The delivered `Slider` clip is now sampled only by the manual range control and pose transitions, eliminating competing animation timelines.
- Removed Device Anatomy and its exploded-mesh render hooks. The current UI exposes only Mockup, Product Demo and WebGL Pipeline.
- Auto center is opt-in. While Foldable is scrubbed, it refreshes each SkinnedMesh's deformed bounds, derives the current whole-device world-space center, and moves the camera and OrbitControls target without changing the user's radius or viewing angles.
- Live browser checks at 0%, 50% and 100% kept the current device silhouette centered; the 0% check specifically guards against accidentally reusing the fully-open static geometry bounds.

## Foldable to Landscape motion

- Foldable → Landscape uses a dedicated 1 s profile instead of the global 620 ms transition. Its `2t³ − t⁶` curve keeps the first half below one-quarter progress, accelerates through the main unfolding travel, and keeps only a short landing tail.
- Other pose changes retain the existing 620 ms ease-out curve, so this adjustment does not make the whole viewer feel slower.
- Live frame checks at 200 ms, 500 ms, 800 ms and 1050 ms confirmed a restrained opening, a fast second-half unfold, and a stable final Landscape pose without timeline wraparound.

## Wipe projection and blur — current UI check

- Corrected framebuffer-to-glTF orientation with a Y-only transform; lock-screen text is no longer mirrored or upside down, and outer-screen status/action icons occupy their intended vertical positions.
- Matched source inner/outer Wipe positions and blur bounds. Inner blur follows hinge progress from the right-side seam and covers the left screen panel; outer blur keeps the source midpoint bell curve.
- Injected the screen-local projection and camera-relative edge calculation into the actual device MeshPhysicalMaterial. Free-camera sampling stays UV-anchored with bounded planar parallax, so the wallpaper does not slide outside the mesh.
- Clamped the second remap before bicubic mip lookup. This prevents out-of-range LOD reads from returning black on the current GPU and preserves visible blurred content across the left panel.
- Checked 33%, 78%, 90%, and 100% fold states in the live in-app browser. The current shader compile/error log is empty.

## Dark-gradient banding

- Root cause: only the wallpaper target was half-float; UI, Frame, both Blur passes and final screen targets defaulted to RGBA8. Repeated dark-gradient writes made the outer-screen Wipe shading visibly quantized.
- A second amplifier was an unbounded outer-screen blur remap: at the default fold it could request nearly LOD 10 despite the shader's declared `maxBlur` of 8, pulling coarse colored mip averages into dark UI regions.
- All screen intermediates now allocate as half-float render targets, blur LOD is capped at 8, and the final inner/outer MeshPhysical materials enable output dithering. This preserves precision through blur, prevents extreme mip color bleed and decorrelates the remaining 8-bit display quantization.

## Geometry edge quality

- The previous canvas used the device pixel ratio as-is, so a 1x display received no supersampling even though the polished metal silhouette contains several high-contrast subpixel curves.
- WebGL quality now lives in `app/render-runtime.js`: native MSAA is retained, the canvas resolves directly against its known white background, and device DPR receives 25% oversampling inside an adaptive 1.5–2.5x range bounded to 8.5 million output pixels. This improves edge continuity while preventing 4K viewports from multiplying fill cost without limit.

## Modular runtime regression

- `main.js` is now a 173-line composition root. Product configuration, source-material fidelity, mockup input, device motion, screen material injection, render quality and WebGL runtime live in seven focused modules under `app/`; no module exceeds 250 lines.
- Rechecked the live module entry in the in-app browser: the model and wallpaper loaded, Foldable → Landscape completed, Standing → Foldable interruption returned to 33%, Mockup target controls responded, and both the flat pipeline targets and `08 Wipe` device projection remained visible.
- On the 809 × 998 CSS-pixel QA viewport, the quality policy produced a 2022 × 2495 drawing buffer (2.5x) without surfacing a runtime error status.

## Transparent PNG export

- Triggered `Download transparent PNG` from the live Mockup view after the device and dynamic screens loaded. The control returned from its busy state without exposing an error status.
- The downloaded `iphone-duo-mockup.png` is 2022 × 2495 PNG with an alpha channel. Pixel inspection reports the top-left background as `srgba(0,0,0,0)` and an interior device pixel as opaque, confirming that neither the white stage nor DOM controls entered the export.
- The export uses its own four-sample RGBA render target and restores the live renderer target/clear state afterward; the visible canvas remains on the white-background quality path.

## Transparent edge supersampling

- The first export reused the live drawing-buffer dimensions directly. Unlike the visible canvas, the saved PNG therefore received no final downsample, leaving one-pixel stair steps on diagonal metallic highlights when inspected over black.
- Export now combines the four-sample render target with up to 1.5x spatial supersampling under a 14-megapixel ceiling, then downsamples through a high-quality 2D canvas before PNG encoding. Output dimensions remain stable while silhouette and specular edges receive real subpixel coverage.
- Re-exported the same 2022 × 2495 Foldable view through the live browser. The old PNG contained only five distinct alpha coverage levels; the SSAA export contains 236, while the corner remains fully transparent. This directly verifies that diagonal transparent edges are no longer limited to the coarse four-sample coverage staircase.

## Alpha-bounds crop

- Transparent export now scans the final downsampled Alpha channel, ignores only values at or below 2/255, and crops to the resulting model bounds with a small 8–32 px safety margin.
- The crop is computed after SSAA downsampling so soft edge coverage participates in the bounds; it removes viewport-sized empty space without cutting the antialiased silhouette.
- Re-exporting the same Foldable view reduced the saved canvas from 2022 × 2495 to 873 × 1394. Pixel inspection still reports 236 distinct Alpha levels and fully transparent corner pixels, confirming that the crop removes empty surround without flattening or clipping the antialiased boundary.

## Source material fidelity

- Compared the retained EXRs byte-for-byte with the current public scene assets: `apple-environment.exr` matches layer-5 `SfFEyQuyjAgUwjH.exr`, and `apple-environment-alt.exr` matches layer-4 `ADsFgCxkeKZYiww.exr`. Their source rotations are now applied to Finish and Optics materials instead of treating one EXR as a global unrotated light.
- Restored the source scene's post-glTF material semantics. The Apple Logo overlay is visible again, and rear-camera glass keeps its layered transparency while using the colored Optics reflection map.
- Reduced direct-light intensity from 8.9 aggregate units to 1.78, leaving the source EXR reflections to shape polished metal. Live Foldable and Durability checks now keep the inner screen surround near black while preserving the exterior silver frame.
- Rotated the live model to its rear in the in-app browser. Both camera lenses retained dark internal elements and colored highlights, the Apple Logo was visible against the white back, and the dynamic screen remained attached to the model.
- Re-exported the adjusted Foldable view as a PNG. The result is tightly cropped to 944 × 1465, preserves all 256 Alpha levels, and both opposite corner pixels remain fully transparent.

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
