# iPhone Duo Product Viewer — motion study

[Live demo](https://iphone-duo-motion-study.vercel.app) · [GitHub repository](https://github.com/bravohenry/iphone-duo-motion-study)

Run from this folder with:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173/foldable-v2.html](http://localhost:4173/foldable-v2.html). A local server is required because the glTF model loads its binary buffer and AVIF texture files by relative URL.

## What is included

- A default Mockup workspace that accepts local PNG, JPG, WebP and AVIF files by picker or drag-and-drop. Images can target both screens or each screen independently, with Cover/Contain, zoom and two-axis positioning controls. Files stay in the browser and are never uploaded to a server.
- Custom artwork enters the existing offscreen screen pipeline before the frame, hinge blur and local 3D wipe/shadow passes, so it remains attached to the actual model throughout folding, orbiting and pose changes.
- Two supporting study views: Product Demo preserves the pose interaction study, and WebGL Pipeline displays each real render stage before the result is mapped to the folding device.
- WebGL Pipeline reuses the production render targets rather than screenshots: Sky, Stars, Hills and Dunes progressively enable the five source layers; UI, Frame and Blur show their actual offscreen textures; Wipe returns the result to the live 3D screen material.
- A full-window 3D canvas with a floating pose dock. The manual fold slider appears only in Foldable; the top-right icon resets the view. Narrow windows automatically widen the camera framing to keep the model visible.
- Foldable includes an optional Auto center control. When enabled, each manual fold sample refreshes the deformed SkinnedMesh bounds and translates the camera target to the whole-device center without changing the user's orbit angle or zoom.
- The browser-delivered `Slider` glTF animation: 0–2 seconds, 61 keyframes, controlled continuously by the range input.
- The seven browser-delivered product-viewer pose images are retained as research references only; the running viewer never mounts or crossfades to them.
- The original product-viewer EXR environment and dynamic screens rendered from the original wallpaper layers and UI resources. The inner screen uses a two-channel bicubic mip blur driven by hinge progress; the screen material applies device-local Wipe projection and a hinge-centered radial shadow. Screenshot-derived screen crops and their fallback path have been removed.
- An interruptible seven-state machine: each named state has a target fold value, camera view, and transition. A new choice retargets from the current in-flight value instead of waiting for a previous transition to finish; it never replaces the model with a pose image.

## Research observations

| State | Source behaviour | This study |
| --- | --- | --- |
| Foldable design | Continuous folding gesture; original default is 1/3 | Range maps linearly to the original 2-second `Slider` clip |
| Landscape → Durability | Six named, discrete viewer states | Each has a target fold point and camera composition; the same 3D model remains available for inspection at rest |
| State transition | A change in view is interruptible | The rig and camera retarget from their current values without a fallback-image handoff; Foldable → Landscape uses a slower 1 s ease-in/fast-out profile |

The initial free-camera pose is taken from the delivered scene data, not inferred from the glTF bounds: spherical radius `35`, `phi π/2`, `theta π`, FOV `50`, zoom `1.5`; its pitch limits are `1.1519–2.0944` radians. The source pose hierarchy uses `YXZ → ZYX → YXZ` Euler orders; those orders are preserved locally so its composed reference angle does not flip to an unrelated side view. The viewer uses the same direct-delivery EXR environment map for material reflections. Orbit controls keep the source limits while offering standard mouse/touch gestures: left-drag orbit, wheel/pinch zoom, right-drag/two-finger pan, and Reset 3D view.

## Fidelity boundary

This local deliverable is a `PIPELINE_REPLAY`, not a byte-for-byte source-runtime replay. Apple’s public scene definition names custom `Hinge`, `FadeThroughBlack`, `WallpaperRenderer`, `Wipe`, `VariantWeights`, and `InteractiveCamera` components. The replay preserves the delivered geometry, clips, camera limits, EXR, five-layer wallpaper, screen UI, source Wipe parameters, and the two-pass blur structure. For the requested free camera, wallpaper sampling remains anchored to device UV with a small local-planar parallax contribution so arbitrary orbits cannot push the screen content outside its render target.

## Provenance and boundary

The `assets/apple-product-viewer/` files were fetched on 2026-09-10 from the publicly delivered resources of [Apple's iPhone Duo page](https://www.apple.com/iphone-duo/); `assets/three.module.min.js` and `assets/GLTFLoader.js` are the local Three.js renderer/loader. The bundle is for local design/engineering research only. Do not redistribute or deploy the Apple media/model without the relevant rights and approval.
