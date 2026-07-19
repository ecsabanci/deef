# deef — Design Spec (Digital Broadsheet)
> Editorial newspaper feel that frames AI illustrations — quiet warm chrome, one accent, the art carries all the color.

**Theme:** light + dark, first-class inversion
**Status:** APPROVED v1 (2026-07-12) — binding for all mobile UI work (referenced from CLAUDE.md). Display serif: **Fraunces**.

A digital broadsheet. The app chrome behaves like good newsprint: warm
near-monochrome surfaces, hairline rules, generous whitespace, and a serif
display voice for headlines. It exists to FRAME the AI illustrations —
they are the only source of rich color on screen, the way photographs once
punctuated a broadsheet page. By day the app is ink on paper (dark warm
text on warm off-white); by night the same page inverts to paper on ink
(warm off-white text on warm near-black) — an inversion, not a redesign.
Depth comes from contrast and rules, never shadows. One warm accent
(vermilion) works like a hand-stamped seal: category marks, the AI
transparency label, small interactive highlights — never large fills.

All values are React Native dp (written as px here). Implementation rule:
every value below maps to a token in `apps/mobile/src/theme/tokens.ts` —
this spec EXTENDS the checkpoint-9 token system (same token names, updated
values, a few additions). Components never hardcode values.

## Tokens — Colors

Warm neutrals only: no pure white, no pure black, no cool grays.

### Light — "ink on paper"

| Name | Value | Token (tokens.ts) | Role |
|------|-------|-------------------|------|
| Paper | `#F6F1E8` | `colors.background` | Page background — warm off-white newsprint |
| Paper Shade | `#EDE6D9` | `colors.surface` | Sheet surface, skeleton base panels, chip fills |
| Ink | `#221D16` | `colors.textPrimary` | Headlines, body, icons — warm near-black ink |
| Faded Ink | `#71685B` | `colors.textSecondary` | Bylines, timestamps, secondary copy |
| Rule | `#D9D0C0` | `colors.border` | Hairline rules, dividers, inactive tab underline |
| Vermilion | `#BC4B26` | `colors.accent` | THE accent: category marks, AI label, active states |
| On Vermilion | `#F6F1E8` | `colors.onAccent` | Text/icons on accent fills |
| Skeleton | `#E6DECF` | `colors.skeleton` | Loading blocks |
| Alarm | `#A93226` | `colors.error` | Error text only — a darker cousin of the accent, never decorative |

### Dark — "paper on ink"

| Name | Value | Token (tokens.ts) | Role |
|------|-------|-------------------|------|
| Night Ink | `#181410` | `colors.background` | Page background — warm near-black |
| Ink Shade | `#221D16` | `colors.surface` | Sheet surface, chip fills (day's ink becomes night's surface) |
| Night Paper | `#EDE6D9` | `colors.textPrimary` | Headlines, body — the paper tone becomes the ink |
| Faded Paper | `#A79C8A` | `colors.textSecondary` | Bylines, timestamps |
| Night Rule | `#3A332A` | `colors.border` | Hairline rules |
| Ember | `#E06A3F` | `colors.accent` | Accent, brightened to hold contrast on dark ground |
| On Ember | `#181410` | `colors.onAccent` | Text/icons on accent fills |
| Night Skeleton | `#2A241C` | `colors.skeleton` | Loading blocks |
| Night Alarm | `#E37B6B` | `colors.error` | Error text |

## Tokens — Typography

### Serif display — headlines, masthead, sheet titles · `fonts.serif`
- **Candidates (free, loadable via expo-font / @expo-google-fonts), user picks one:**
  1. **Fraunces** (recommended — woodblock character, optical sizes, feels printed)
  2. **Playfair Display** (classic didone newspaper display, safest)
  3. **Source Serif 4** (restrained workhorse, most neutral)
- **Weights:** 600 (headlines), 700 (masthead)
- **Role:** Feed card titles, masthead "deef", sheet headline, empty/error
  headings. NEVER body or UI copy.
- **Tracking:** slightly negative at display sizes (−0.3 to −0.5); never positive.

### System sans — body, UI copy, labels · `fonts.sans`
- System default (SF Pro on iOS, Roboto on Android). Weights 400/600.
- **Role:** summaries, buttons, tabs, captions, metadata. The quiet workhorse.

### Type Scale (extends `typography` in tokens.ts)

| Role | Face | Size | Line height | Weight | Token |
|------|------|------|-------------|--------|-------|
| masthead | serif | 34 | 1.05 | 700 | `typography.masthead` (new) |
| headline | serif | 22 | 1.2 | 600 | `typography.headline` (new) |
| title | serif | 28 | 1.15 | 700 | `typography.title` (face changes to serif) |
| heading | sans | 20 | 1.25 | 600 | `typography.heading` |
| body | sans | 16 | 1.45 | 400 | `typography.body` |
| caption | sans | 13 | 1.3 | 400 | `typography.caption` |
| label | sans | 12 | 1.2 | 600, uppercase, +0.5 tracking | `typography.label` (new) |

Minimum text size 12. Nothing above 40.

## Tokens — Spacing & Shapes

**Base unit:** 4px — everything sits on the 4px grid.

### Spacing (extends `spacing` in tokens.ts)

| Name | Value | Token |
|------|-------|-------|
| xs | 4 | `spacing.xs` |
| sm | 8 | `spacing.sm` |
| smd | 12 | `spacing.smd` (new) |
| md | 16 | `spacing.md` |
| lg | 24 | `spacing.lg` |
| xl | 32 | `spacing.xl` |
| xxl | 40 | `spacing.xxl` (new) |

### Border radius — radius discipline

| Element | Value | Token |
|---------|-------|-------|
| Illustrations / covers | 0 | `radii.none` (new) |
| Chips, buttons, small tags | 4 | `radii.xs` (new) |
| Skeleton blocks | 4 | `radii.xs` |
| Bottom sheet top corners | 12 | `radii.md` |
| Anything else | ≤ 12 | — |

`radii.full` (999) survives in tokens for the future but is BANNED in the
broadsheet chrome — no pills.

### Rules & depth

- Hairline rules: `StyleSheet.hairlineWidth`, color `colors.border`.
- **No shadows anywhere.** The only "elevation" is the bottom-sheet
  backdrop dim (`rgba(24,20,16,0.55)`).
- Touch targets ≥ 44×44 even when the glyph is smaller (use hitSlop/padding).
- All screens honor safe-area insets (`react-native-safe-area-context`).

## Components

### Masthead
**Role:** App header, sets the newspaper voice
Safe-area-aware paper strip. "deef" in serif masthead 34/700 flush-left;
right side holds the Turkish date line in caption/secondary
("12 Temmuz, Cumartesi") plus a single theme-toggle icon (see below).
Hairline rule below. No elevation.
**Theme toggle (the ONE permitted masthead icon):** a minimal line glyph
(Feather `sun` in light mode, `moon` in dark), `textPrimary` color, ≥44
touch target via hitSlop. Tapping sets an explicit light/dark override
(system remains the untouched default until first tap; returning to
system is a future settings-screen affordance). This is the sole
exception to the otherwise icon-free chrome.

### Category Tab Bar
**Role:** Feed filter, sits under the masthead
Horizontally scrollable text-only tabs: label 12 uppercase sans. Active
tab: `textPrimary` + 2px underline in `accent`, sitting ON the hairline
rule that closes the bar. Inactive: `textSecondary`, no underline. No pill
backgrounds, no fills. First tab "Tümü", then categories by sort_order.
Row height ≥ 44.

### Feed Card
**Role:** One event on the front page
Full-width block on the page background — NO surface fill, NO border, NO
shadow. Anatomy, top to bottom:
1. Cover illustration 3:4, full-bleed to card width, radius 0.
2. `spacing.smd` gap.
3. Meta row: category name as label 12 uppercase in `textSecondary` +
   " · " + relative time in caption/secondary. (Neutral on purpose: the
   tab bar's accent underline is visible in this region — see the accent
   exclusivity rule. In the bottom sheet the category label MAY use
   accent.)
4. Title in headline 22 serif, `textPrimary`, flush-left, max 3 lines.
5. AI transparency row: label 12 in `textSecondary` — "Görsel yapay zekâ
   ile üretildi" (see Do's).
Cards separated by `spacing.xl` vertical whitespace + centered hairline
rule (like column rules between stories). Pressed state: opacity 0.85.

### Skeleton Card
**Role:** Loading placeholder mirroring the Feed Card
Same anatomy in `colors.skeleton` blocks (radius 4): 3:4 block, then a
70%-width 22px line, a 40%-width 12px line. Pulse via opacity 0.5↔1.
Show 3 skeleton cards on cold start.

### Source Web Sheet
**Role:** In-app browser for "read at source"
A second bottom sheet at ~95% holding a WebView, opened from the detail
sheet's "Kaynakta oku" link. Small header row: source domain (caption
secondary) + a close (×) icon. Content panning disabled so the page
scrolls without fighting the sheet; dismiss via close or backdrop.

### Bottom Sheet Detail
**Role:** The story page
`colors.surface` sheet, top radius 12, grabber handle (32×4, `border`
color, radius 4). Content: full-bleed 3:4 cover (radius 0, bleeds to
sheet edges), then `spacing.md` padding block: meta row (as feed card),
headline 22–28 serif, hairline rule, summary in body 16/1.45, AI label
row at the bottom in caption/secondary. Backdrop dims with the standard
dim color; swipe or backdrop-tap dismisses.

### Error / Empty / Offline Block
**Role:** Full-area states with newspaper manners
Centered column, max-width ~28 chars: serif heading 22 ("Bağlantı yok" /
"Bu kategoride henüz haber yok" / "Bir şeyler ters gitti"), body/secondary
one-liner, ghost retry button ("Tekrar dene") — border hairline, radius 4,
label 16/600, ≥44 tall. No illustrations, no emojis in state blocks.

### Buttons (revision of checkpoint-9 Button)
Primary: `accent` fill, `onAccent` text, radius 4 (was pill — pills are
banned). Ghost: hairline border, `textPrimary` label, transparent fill.
Both ≥ 44 tall.

## Do's and Don'ts

### Do
- Let the illustrations be the ONLY rich color: chrome stays in the
  neutral ramps, accent stays small (labels, underlines, marks)
- Separate content with whitespace and hairline rules — a rule is the
  broadsheet's border
- Keep illustrations full-bleed within their frame: radius 0, no matte
  padding, no inner border
- Use the serif exclusively for headlines/masthead/state headings; body
  and UI copy stay system sans
- Keep both palettes warm: if a gray looks blue next to the paper tone,
  it's wrong
- Treat dark mode as the same page printed in negative — same layout,
  same rules, inverted inks
- Flush-left all multi-line text; center only single-line state headings
  and buttons' own labels
- All user-facing copy in Turkish

### Don't
- No gradients, glassmorphism, blur, or shadows — depth is contrast and
  rules, this is newsprint not frosted glass
- No radius above 12 anywhere; no pills (radius 999) in broadsheet chrome
- No second accent color — vermilion only works because everything else
  is quiet
- Never put the accent on more than ONE element type per screen region —
  if the active tab underline is visible, category marks in cards stay
  neutral. Guard the stamp effect
- No pure `#FFFFFF` / `#000000` and no cool grays in any surface or text
- No serif body text and no sans headlines — the two-voice split is the
  identity
- No surface fills or borders on feed cards — the page IS the card
- No emoji in chrome copy (states, labels, buttons); emoji belong to
  Phase 5 reactions only
- No letter-spacing above 0 on serif display text

## Surfaces

| Level | Light | Dark | Purpose |
|-------|-------|------|---------|
| 0 | Paper `#F6F1E8` | Night Ink `#181410` | Page + feed cards (no fill) |
| 1 | Paper Shade `#EDE6D9` | Ink Shade `#221D16` | Bottom sheet, chips, skeleton panels |
| — | backdrop `rgba(24,20,16,0.55)` | same | Sheet backdrop dim (only "elevation") |

## Imagery

The AI editorial illustrations are the product's color and personality:
3:4 portrait covers, always full-bleed within their frame, radius 0, no
borders or mattes. Chrome must never compete — no colored UI near images
except the small accent label. Category art styles (see
`docs/001_initial_schema.sql` style_prompts) already guarantee no text and
no real faces inside images; the UI adds the transparency label under
every illustration. Loading uses skeleton blocks, never spinners over
image areas; failed loads show a `surface` block with a caption
("Görsel yüklenemedi") — never a broken-image glyph.

## Layout

Single-column front page. Masthead → category tab bar → vertical feed
(FlashList), each story a full-width card separated by whitespace +
hairline rule. Screen gutters `spacing.md` (16). Infinite scroll appends
skeleton cards at the tail while loading. The bottom sheet is the only
overlay surface. Portrait-only (app.json already locks orientation).

## Agent Prompt Guide

**Quick reference (light / dark)**
- background: `#F6F1E8` / `#181410`
- surface (sheet, chips): `#EDE6D9` / `#221D16`
- text: `#221D16` / `#EDE6D9`
- secondary text: `#71685B` / `#A79C8A`
- rule/border: `#D9D0C0` / `#3A332A`
- accent (the only one): `#BC4B26` / `#E06A3F`
- headline face: chosen serif (Fraunces / Playfair Display / Source Serif 4), 600–700
- UI face: system sans
- radius: images 0 · chips/buttons 4 · sheet 12 · nothing higher
- depth: hairline rules + whitespace; zero shadows

**Example recipe — feed card:** page-background block, full-width 3:4
illustration (radius 0), 12px gap, "EKONOMİ · 2 saat önce" (12 uppercase
secondary + caption secondary — neutral, the accent is spent on the tab
underline), headline Fraunces 22/600 flush-left up to 3 lines, "Görsel
yapay zekâ ile üretildi" caption in secondary, 32px whitespace + hairline
rule before the next story.
