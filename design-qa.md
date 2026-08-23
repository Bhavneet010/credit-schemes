# Design QA — Mobile home refinement

- Source visual truth: `C:\Users\bhavn\Downloads\Screenshot 2026-08-23 212043.png`
- Implementation screenshot: `C:\Users\bhavn\AppData\Local\Temp\hp-scheme-finder-mobile-v4.png`
- Side-by-side comparison: `C:\Users\bhavn\AppData\Local\Temp\hp-scheme-finder-mobile-comparison-v4.png`
- Viewport: 390 × 844 CSS px, light theme, home route, empty search state
- Source dimensions: 1080 × 2376 physical px; browser chrome removed at y=289 and the 1080 × 2087 app crop normalized to 390 × 754 px
- Implementation dimensions: 390 × 844 px at device scale factor 1; top 390 × 754 px used for the normalized comparison

## Full-view comparison evidence

The normalized side-by-side comparison shows the supplied mobile capture on the left and the revised implementation on the right. The revised screen intentionally uses the approved smaller mobile type scale and tighter vertical rhythm. The heading remains two lines, the primary routes remain readable, the search field is clearly differentiated, and no app-owned content clips or overflows.

## Focused region comparison evidence

The complete above-the-fold home surface is readable in the normalized comparison, so a separate crop was not needed. The important focus region includes the header, hero typography, decorative SVG flourishes, search surface, “Start here” heading, and both route cards.

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: the mobile hero resolves to 37.088px, the summary to 15px, “Start here” to 23px, and route titles to 17px. This is the approved compact hierarchy and remains legible without wrapping route titles unexpectedly.
- Spacing and layout rhythm: the hero is 283.1px tall, the search is 60px tall, and route cards are 98px tall. The first route begins at y=388.93px, materially improving mobile density while preserving tap targets.
- Colors and visual tokens: the search uses a subtle sunlight-to-blue-to-mint gradient with the existing blue focus treatment. Existing brand, ink, line, mint, and sun tokens remain consistent.
- Image quality and asset fidelity: the existing brand mark and the original blue/mint decorative SVG artwork are reused at phone-safe sizes. Both flourishes render at 142 × 66px and 0.8 opacity, with enough artwork inside the viewport to remain clearly visible around the heading.
- Copy and content: all user-facing copy and route counts are unchanged.
- Interaction and console: search for “apple orchard” returned both matching activities; the settings menu opened; no browser warnings or errors were recorded.

## Comparison history

- Initial source finding (P1): mobile hero typography and surrounding spacing dominated the viewport. Fix: reduced the phone hero title from 44.85px to 37.088px and tightened supporting type, hero spacing, and route cards.
- Initial source finding (P2): the search field did not visually separate from white cards. Fix: added the approved light sunlight–blue–mint gradient and retained accessible focus styling.
- Initial source finding (P2): both decorative hero SVG flourishes were disabled by the mobile media query. Fix: restored the existing artwork at 142 × 66px, increased contrast to 0.8 opacity, and reduced edge clipping so it is clearly visible on a phone.
- Review finding (P2): the compact search state inherited an 18px/62px input and hid the flourishes. Fix: retained a 16px/58px input and smaller visible flourishes in the active-search state.
- Review finding (P2): the second route card exceeded 104px at 320px. Fix: tightened the narrow grid, icon, copy, and arrow sizes; all route cards now remain within the approved height with no horizontal overflow.
- Review finding (P2): a v3-controlled first launch could briefly retain old CSS. Fix: added a guarded one-time reload on `controllerchange` and restricted cache cleanup to this app's `hpsf-` namespace.
- Post-fix evidence: `C:\Users\bhavn\AppData\Local\Temp\hp-scheme-finder-mobile-comparison-v4.png` shows all three issues resolved with no new P0/P1/P2 mismatch.

## Implementation checklist

- [x] Compact mobile typography and spacing
- [x] Light gradient search surface
- [x] Visible mobile decorative SVG flourishes
- [x] Desktop layout preserved
- [x] Search and settings interactions verified
- [x] Console checked

final result: passed
