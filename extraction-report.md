# Foldable design source-to-local report

The Apple page publicly delivers a Lotus scene definition, a product glTF, animation clips, two direct EXR material environments, and viewer state metadata. This study uses those delivered artifacts to establish the local model, fold timeline, starting camera, pose transforms, material overrides, and screen-media treatment.

The public scene also establishes an important boundary: its visual result is not produced by the glTF alone. The source names custom `Hinge`, `FadeThroughBlack`, `WallpaperRenderer`, `VariantWeights`, and `InteractiveCamera` components. Their complete Lotus execution environment is not included in this local delivery. The local viewer is consequently a transparent pipeline replay: it uses a local Three.js interaction layer, preserves the delivered geometry and clips, and documents substitutions rather than pretending to be a source-runtime copy.

The final runtime never uses static source pose images as a rendering fallback. Every named state retains the live model, which can be orbited, zoomed, panned, reset, and retargeted during a transition.

The glTF is not a self-contained final material result: its Apple Logo highlight layer starts with zero Alpha, its inner-carrier and finish materials point at pre-override AO maps, and several camera-glass layers depend on Lotus scene-level transparency plus material-specific environment layers. The local adapter rebinds the AO maps named by the LSD, restores the Logo layer, preserves the optical stack, assigns the supplied Optics and Finish EXRs with their authored rotations, and replaces the earlier high-intensity three-light rig with restrained diffuse compensation.

The source Wipe implementation was traced from the page bundle and scene definition. Inner-screen parameters are `wipePosition=1`, `blurBounds=[0.45,1]`, `scale=1.9816`, `zoom=7.95`; the outer screen uses `wipePosition=0`, `blurBounds=[0,0.9]`, `scale=0.9894`, `zoom=7.68`, and `offset=0.24`. The local device material now receives the source local-plane basis, camera-relative direction, hinge-dependent Wipe value, bicubic two-pass blur, and angle-sensitive edge shading. A bounded UV anchor is retained for free-camera stability.

See [source facts](evidence/source/scene-facts.md), [replay manifest](replay-manifest.json), [known gaps](known-gaps.md), and [QA report](qa-report.md).

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
