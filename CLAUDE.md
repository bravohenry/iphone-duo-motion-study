# iPhone Duo Motion Study - local interaction research rig

Static HTML + modular local Three.js runtime + publicly delivered reference media. `foldable-v2.html` owns the full-viewport canvas and contextual controls; `main.js` is the composition root; `app/` separates motion, render quality, screen materials, mockup input and shared configuration; `wallpaper-renderer.js` owns the inspectable offscreen screen-pixel pipeline and custom-image composition. Research explanations stay in README rather than the viewer.

<directory>
app/ - browser application modules for configuration, render runtime, device motion, screen materials and mockup input
assets/ - local runtime and original reference resources (model, EXR, pose references and wallpaper layers); screenshot-derived screen crops are excluded
shaders/ - source-derived wallpaper, bicubic blur and device-local Wipe projection passes
math/ - wallpaper motion matrix helpers
libs/ - local texture decoder dependencies
utils/ - local loader dependencies
evidence/ - target-bound runtime and source findings used to distinguish source replay from a local behavior rebuild
</directory>

<config>
README.md - provenance, run instructions, and interaction findings
main.js - composition root for the three views, GLTF/wallpaper lifecycles and the single render loop
wallpaper-renderer.js - all-stage RGBA16F screen pipeline, user-image canvas composition, FramePass, two-pass blur, final-output dithering, debug targets and screen-local Wipe projection
foldable-v2.html - current full-viewport ES-module entrypoint; Mockup with transparent PNG export, Product Demo and WebGL Pipeline segments with contextual controls
index.html - original research page retained as an earlier reference
foldable.html - earlier viewer retained for comparison
bundle.js - generated browser bundle of main.js and the local Three.js dependencies
scout-card.json - locked product-viewer surface and primary source-trace route
replay-manifest.json - replay tier, source facts, rendering gaps, and fallback boundary
known-gaps.md - source-versus-local fidelity differences and explicit substitutions
qa-report.md - current build and live-canvas acceptance evidence
extraction-report.md - source-runtime boundary and local replay rationale
vercel.json - serves foldable-v2.html at the deployment root with clean URLs
.vercelignore - excludes research evidence, old entries and unused JPG references from deployment
.gitignore - excludes local Vercel linkage and macOS metadata from Git history
</config>

法则: 本地研究·资源可追溯·交互状态显式

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
