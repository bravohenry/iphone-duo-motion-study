# Duo Mock — React migration acceptance

## Scope and source of truth

Reference: user-provided duo studio screenshot, codex-clipboard-e4b2b8d4-9882-4cbb-9f1a-3614558f1def.png.
Later explicit user instructions override its details: six poses, Closed first/default, previous Phosphor icons, a single icon-only segmented bar, fold slider inside Add your design, no Cinematic/footer/gesture captions, TikTok Display brand title.

The user explicitly stated “已经验收完毕 push” on 2026-09-11. No further visual changes were made after acceptance.

## Evidence observed by this agent

- Vite production build passed. React/Tailwind/shadcn are bundled, and original GLTF/EXR/shader/decoder resources are copied into dist.
- Real browser at http://localhost:4174/ loaded the production output and rendered a single WebGL canvas.
- Initial DOM: Closed checked, six radios in the requested order, empty visible text in every segment. Main visible text reduced to Duo Mock, Add your design and Export.
- Initial screenshot at 1084×998 showed the closed model centered, TikTok Display wordmark, inset selected segment and no footer/Cinematic.
- Computed heading font-family was TikTok Display, Geist Variable, sans-serif. Both font files were valid WOFF binaries and appeared in the production build.
- All six poses were selected and inspected. Captures made during transitions were distinguished from settled Portrait and Standing captures.
- Fold angle is inside the design popover. End key set aria-valuenow=1; the model remained fully unfolded in the following screenshot, with no image handoff.
- The image picker accepted a local JPG and entered the image-decoding state. Follow-up crop/export inspection was interrupted by the browser authorization boundary; this is not recorded as a completed upload/export assertion.
- Node test: 6/6 passed. Covers Closed/six-state contract, independent screen crop options, late renderer binding, import race, clear-while-loading and invalid/oversized/undecodable input. Image.decode is a controlled test double, not a browser decoding proof.
- git diff --check passed.

## Acceptance boundary

The new React wiring for PNG export and the final narrow-screen layout were not fully re-tested by this agent after the browser blocked the additional preview access. The user then confirmed acceptance and requested push, ending further browser verification.

No final side-by-side normalized image comparison was completed. This report does not claim pixel parity with the original reference, mobile device coverage, a React-driven WebGL speedup, or new anti-aliasing/material improvements.

The pre-existing shared scene/materials and alpha-cropped PNG exporter are retained. Automatic centering's first-frame binding-matrix fix was verified in the rendered default view. Browser console errors from the first cached development navigation were resolved before the successful production load.

## Remaining technical notes

- Vite warns about the roughly 1.12 MB minified JS chunk (about 328 KB gzip), chiefly the local Three.js runtime plus UI. This is a bundle-size warning, not a build failure or measured frame-rate regression.
- At manually enlarged or transient diagonal views, a device may approach the canvas boundary; the user retains zoom and reset controls.
- Model/media/font rights are unchanged by this independent study.
- The independent untracked prototypes/ directory was not part of this delivery and is not staged.
