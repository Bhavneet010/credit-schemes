# Design QA — Approved mobile visual direction

- Source visual truth: `C:\Users\bhavn\.codex\generated_images\01a02f1d-3c50-7dc2-9ab2-63d971f34bda\exec-596427dc-13bd-4e67-a4cd-56eb8ce7b4d3.png`
- Browser-rendered implementation: `C:\Users\bhavn\Credit Schemes\app\design-reference\home-mobile-v7.png`
- Normalized source: `C:\Users\bhavn\Credit Schemes\app\design-reference\home-mobile-v7-source-normalized.png`
- Side-by-side comparison: `C:\Users\bhavn\Credit Schemes\app\design-reference\home-mobile-v7-comparison.png`
- CSS viewport: 390 × 844 px, light theme, home route, empty search state
- Source pixels: 852 × 1846; top 852 × 1844 crop downsampled to 390 × 844
- Implementation pixels: 390 × 844; captured in the in-app browser from a 390 × 844 iframe. The browser reported device scale 1.25, so the QA wrapper applied a matching 1.25 visual transform before the 390 × 844 capture.

## Full-view comparison evidence

The side-by-side comparison places the normalized approved mock on the left and the browser-rendered implementation on the right. Both show the two-line brand lockup, compact centered alpine crest, single-line hero heading, counts, elevated pastel search field, “Start here” routes, white cards, and the same yellow/blue/mint page washes. No app-owned content clips or overflows at 390 × 844.

## Focused region comparison evidence

A separate crop was not needed because the 800 × 844 side-by-side comparison keeps the header, crest, typography, search control, icons, card copy, borders, shadows, and background treatment readable at their intended phone scale.

## Findings

No actionable P0, P1, or P2 differences remain.

- Fonts and typography: both source and implementation use a rounded system sans hierarchy, a two-line mobile brand lockup, and a single-line hero headline. The implementation is marginally denser in card copy, which preserves the user's approved smaller mobile type scale without changing hierarchy or wrapping.
- Spacing and layout rhythm: the crest is centered above the headline, the search field remains the dominant action, and both route cards fit above the fold with comfortable tap targets. The implementation is slightly more compact vertically than the mock; this is an intentional response to the earlier oversized mobile layout.
- Colors and visual tokens: the canvas carries low-opacity sunlight yellow, royal blue, and mint washes. Cards stay white. The search field uses a more visible cream-to-blue-to-mint gradient, a royal-blue edge, a pale halo, and restrained elevation.
- Image quality and asset fidelity: the old edge-wave SVGs are removed. The selected alpine crest is a dedicated transparent 1774 × 887 generated asset displayed at 112 px wide, so its rounded colored lines remain sharp with no crop, white box, or transparency halo.
- Copy and content: logo text, headline, counts, placeholder, route names, route counts, and supporting descriptions match the approved visual and existing product data.
- Interaction and console: the settings menu opened, “apple orchard” returned two result rows, the clear control restored both start routes, and the in-app browser reported no warnings or errors.

## Comparison history

- Initial P1: the existing phone layout still showed two side wave flourishes rather than the selected alpine sunrise crest. Fix: generated the approved transparent crest asset, placed it once above the headline, and disabled the old edge decorations.
- Initial P2: the page was plain white, so the requested SVG palette did not carry through the remaining background. Fix: added diffuse yellow, blue, and mint canvas washes while keeping route cards white.
- Initial P2: the search field's pale border and single shadow let it blend into the newly tinted page. Fix: strengthened the royal-blue border and added a light gradient, outer halo, and soft elevation shadow.
- First visual comparison P2: the hero heading wrapped to two lines while the brand stayed on one, opposite the approved mobile mock. Fix: tuned the responsive type width so the headline stays on one line and the brand locks up on two.
- Cache verification P2: the local installed client briefly retained the pre-fix v6 stylesheet. Fix: moved the approved overrides to `visual-v7.css`, bumped the shell to `hpsf-v7`, and precached both the stylesheet and crest asset.
- Post-fix evidence: `home-mobile-v7-comparison.png` shows the approved hierarchy and palette with no remaining P0/P1/P2 mismatch.

## Implementation checklist

- [x] Selected alpine crest replaces old side flourishes
- [x] Soft yellow, blue, and mint page background
- [x] Search field clearly separated from the canvas
- [x] Compact mobile typography and cards
- [x] 320 px and 390 px responsive behavior protected by browser tests
- [x] Search, clear, and settings interactions verified
- [x] Versioned service-worker cache refresh
- [x] Browser console checked

final result: passed
