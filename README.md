# Duo Mock

[Live demo](https://iphone-duo-motion-study.vercel.app) · [GitHub](https://github.com/bravohenry/iphone-duo-motion-study)

A React mockup studio around one freely rotatable, folding 3D device.

## Run

```bash
npm ci
npm run dev
```

Open [localhost:4173](http://localhost:4173/). The existing /foldable-v2.html URL runs the same React app. Current sources require Vite, not a Python static server.

```bash
npm run build
npm run preview
npm test
```

Vercel builds dist/ with npm. Root and /foldable-v2 are supported; the cleanUrls rewrite intentionally targets the extensionless route.

## Workspace

- Duo Mock: fullscreen dark/light workspace, TikTok Display wordmark, real shadcn Radix Nova controls and the prior Phosphor pose icons.
- Six icon-only segments: Closed (default), Foldable, Landscape, Portrait, Seated and Standing. Durability is removed.
- Add your design contains local PNG/JPEG/WebP/AVIF import, inner/outer/both targeting, Cover/Contain, scale, horizontal/vertical crop, reset, fold progress and camera reset.
- Only Foldable allows manual 0–180° hinge adjustment; named poses use their configured fold angle.
- Folding and pose transitions automatically target deformed whole-device bounds. Free rotation, zoom and pan remain available at rest. There is no centering toggle.
- Camera movement is manual. Cinematic and its automatic orbit are removed.
- Transparent PNG uses the current model, materials and camera, supersamples offscreen, then crops to visible Alpha bounds with a small safety margin. Theme background and DOM controls are excluded.
- No screenshot handoff, fold play button, permanent gesture instructions or footer captions.
- The information dialog keeps interaction help and the Product Demo/WebGL Pipeline study views off the main canvas.
- Imported images stay in the browser; they are never uploaded.

## Architecture

React 19.3 + Vite 6.4 + Tailwind 4.3 + shadcn Radix Nova. React manages panels and application state; Three.js r165 retains a single independent render loop. Viewer subscriptions are field-specific, so folding does not repeatedly render the whole UI. Migrating to React improves component boundaries; it is not a claim of faster WebGL rendering.

ui/ owns React components. main.js exposes createViewer(canvas), subscribe/getSnapshot and semantic commands. app/ owns pose motion, input, rendering, material fidelity and PNG export. wallpaper-renderer.js retains the RGBA16F screen pipeline. vite.config.js aliases local Three.js to one module and copies original assets, shaders and texture decoders without re-encoding them.

The old generated bundle.js is retired. research.html preserves the early standalone study; foldable.html redirects to the current workspace.

## Rendering and motion retained

The source-delivered Slider clip runs from 0–2 seconds with 61 keyframes. LoopOnce clamps the exact 100% endpoint instead of wrapping to closed. Six transitions are interruptible; Foldable → Landscape retains its slower 1-second ease-in/fast-out profile.

The source rig Euler orders remain YXZ → ZYX → YXZ. Whole-device centering updates SkinnedMesh binding matrices before measuring deformed bounds. The studio uses source-based spherical framing with a 1.8 camera zoom for its available canvas. Mockup allows free orbit; Product Demo preserves source pitch limits.

Original Finish/Optics EXRs, AO rebinding, Logo visibility, camera-glass transparency and source reflection layers remain shared between screen and export. Custom artwork enters the screen pipeline before Frame, hinge-driven bicubic blur and device-local Wipe/shadow. Intermediates remain RGBA16F; final output dithering and multisample/supersample rendering preserve the earlier quality work.

## Provenance

This is a PIPELINE_REPLAY, not a byte-for-byte reproduction of Apple's runtime. Device geometry, textures, environments and reference media came from the publicly delivered [iPhone Duo page](https://www.apple.com/iphone-duo/) on 2026-09-10. Source-derived effects are reconstructed locally; arbitrary free-camera projection is a local adaptation.

Apple assets retain their original rights; this independent study does not grant redistribution or commercial-use rights. Phosphor's MIT license is in assets/icons/LICENSE. TikTok Display font provenance is in assets/fonts/CLAUDE.md; its original rights remain unchanged. Research boundaries and historical evidence remain in the repository; see design-qa.md for the current UI acceptance record.
