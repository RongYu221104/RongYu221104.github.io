# RongYu's Notes Design System

Version 1.0.0 · Source baseline: `RongYu221104.github.io` on 2026-08-28

This document abstracts the stable visual language already present in the
Astro site. It is a design contract for future website pages, not a command to
refactor every existing literal into tokens. Current rendered behavior and
current source code take precedence when the site has intentionally evolved.

## 1. Identity thesis

RongYu's Notes should feel like a cool-toned academic press catalog sharing a
desk with a carefully handled jazz record collection. Its personality comes
from the tension between two worlds:

- mathematical and editorial order: ledgers, folios, rules, indices, course
  codes, restrained serif typography, exact metadata;
- tactile listening culture: Side A/B, sleeves, vinyl, brass details, slow
  playback, and one atmospheric image used with restraint.

The site is quiet, precise, personal, and slightly archival. It is not a SaaS
dashboard, a luxury beige portfolio, a neon music app, a glassmorphism demo, or
a generic newspaper template.

A new page should inherit at least these three anchors:

1. a correct typography role hierarchy;
2. line-led editorial structure with meaningful metadata or numbering;
3. the porcelain/ink/wine palette with brass used as a scarce accent.

Give each page one subject-specific signature. Do not force the vinyl motif
onto books, projects, or academic topics when another real-world artifact is a
better fit.

## 2. Canonical source anchors

Check these files before a design change:

- `src/styles/global.css`: canonical palette, global type, components,
  breakpoints, focus, and reduced motion;
- `src/layouts/BaseLayout.astro`: loaded font families, page shell, metadata,
  header/footer contract, and Astro transitions;
- `src/components/Header.astro`: wordmark, centered navigation, action cluster,
  and persistent music entry;
- `src/components/MusicPlayer.astro` and `src/scripts/music-player.ts`: record,
  catalog, context panel, playback state, and 380ms audio/platter synchronization;
- `src/pages/index.astro`: immersive hero, bulletin, Side A/B/C index, and author
  composition;
- `src/pages/latex.astro`, `src/components/LectureArchive.astro`, and
  `src/components/LectureRow.astro`: archive grid, filtering, spines, folders,
  rows, tags, and action clusters;
- `src/pages/tools/index.astro`: utility catalog and preview-window pattern;
- `src/pages/colophon.astro`: ledger pattern and production-note voice;
- `src/scripts/disclosure-motion.ts`: shared disclosure timing and easing.

Do not infer design rules from `dist/` when editable source exists.

## 3. Color system

### Core tokens

| Token | Value | Role |
| --- | --- | --- |
| `--porcelain` | `#f5f8f7` | primary canvas, header veil, cool paper atmosphere |
| `--paper` | `#fbfdfc` | raised sheet, panel, readable content surface |
| `--ink` | `#1e2b2a` | primary text, decisive rules, dark controls |
| `--ink-soft` | `#4d5d59` | secondary prose, metadata, inactive navigation |
| `--mist` | `#93afa5` | quiet status, inactive marks, pale structural accents |
| `--sky` | `#bfd7e0` | cool highlight, especially on dark/footer surfaces |
| `--wine` | `#7d3345` | primary action, selection, focus, active state |
| `--brass` | `#b89a57` | scarce secondary accent, record hardware, side/index cue |
| `--line` | `rgba(30, 43, 42, 0.18)` | ordinary hairline division |
| `--line-strong` | `rgba(30, 43, 42, 0.32)` | major boundaries and control outlines |

### Semantic rules

- Wine is the action color: active navigation, selected filters, primary play,
  text commands, focus outlines, and important links.
- Brass is not a second CTA color. Use it for tiny index labels, hardware,
  progress, selected-row inset rules, and occasional editorial emphasis.
- Mist and ink-soft carry inactive or secondary information. Do not make
  important actions depend on their low contrast.
- Paper may rise above porcelain through a one-pixel border and modest shadow.
  Do not introduce a second warm paper palette.
- Dark charcoal gradients are reserved for physically motivated surfaces such
  as vinyl, a turntable, or a tool preview screen. Decorative gradients are not
  part of the general surface language.
- Avoid terracotta, bright cyan, neon, rainbow accents, glassy colored blobs,
  and arbitrary per-page palettes. A subject illustration may bring its own
  controlled colors while the UI chrome stays canonical.
- Selection uses paper text on wine. Text selection itself follows the same
  rule: `color: var(--paper); background: var(--wine)`.

## 4. Typography system

Typography is the primary carrier of identity. Keep font synthesis disabled and
do not replace the established roles with one universal family.

| Role | Family | Typical use |
| --- | --- | --- |
| English display | `Cormorant Garamond`, fallback `Times New Roman`, serif | wordmark, English hero, record titles, large Latin titles, Side/spine display |
| Chinese artistic display | `FZ QingKe BenYueSong`, fallback `Noto Serif SC`, serif | expressive Chinese page titles and selected editorial headings |
| Chinese structural serif | `Noto Serif SC`, serif | section headings, archive titles, card titles, legible Chinese hierarchy |
| Body | `Latin Modern Roman`, `Fandol Song`, serif | ordinary English/Chinese prose and interface copy |
| Utility/index | `IBM Plex Mono`, monospace | kickers, dates, folios, indices, tags, codes, counts, file metadata |
| Compact support | `Noto Sans SC`, sans-serif | dense support text where serif display would reduce clarity; use sparingly |

### Existing scale anchors

- Home English hero: 104px desktop, 64px at `<=760px`, 55px at `<=420px`,
  weight 400, very tight line-height around `0.78–0.84`.
- Interior page title: 54px desktop and 42px mobile, weight 400,
  line-height around 1.2.
- Section heading: 32px desktop and 28px mobile.
- Card/row Chinese title: generally 15–21px depending on density.
- Kicker, index, date, code, and tag: typically 8–12px in IBM Plex Mono.
- Body copy: typically 13–17px, with a relaxed line-height around 1.6–1.8 for
  sustained Chinese prose.

These values are anchors, not permission to invent a new scale for every route.
Use `clamp()` only when it preserves these relationships and has clear minimum
and maximum bounds.

### Typography behavior

- Kicker text is short, wine-colored, monospaced, often uppercase, and names a
  real catalog or editorial context.
- Chinese and English titles may be paired, but each line must have a clear
  primary/secondary relationship rather than equal visual weight.
- Metadata uses tabular or monospaced numerals where alignment matters.
- Keep letter spacing neutral by default. Do not add wide tracking to Chinese
  body text. Small uppercase Latin metadata may use restrained tracking.
- Avoid bold-heavy hierarchy. The system depends on family, size, alignment,
  rules, and whitespace; most major headings remain weight 400 or 500.

## 5. Paper, borders, radius, and depth

### Paper model

- The default canvas is porcelain, with paper used for panels and quiet section
  contrast.
- Surfaces behave like sheets, sleeves, ledgers, or instrument panels. They
  should feel placed and edged, not like floating app tiles.
- Full-width sections may change from porcelain to paper with a top hairline.

### Rule hierarchy

- `1px solid var(--line)`: internal rows and low-priority separation.
- `1px solid var(--line-strong)`: card perimeter, toolbar, filter, and major
  section boundary.
- `2px solid var(--ink)`: decisive catalog header or archive division.
- Double rules may appear where the publishing metaphor is explicit, such as a
  template release ledger. Use them rarely.
- Use inset wine/brass rules for selected states instead of colored halos.

### Radius and shadow

- Global radius is 6px. Rectangular buttons often use 3–4px.
- Circles and `999px` radii are reserved for genuinely circular controls,
  records, avatars, progress rails, and compact pills.
- Do not introduce 16–32px generic card radii, soft blob containers, or a fully
  pill-shaped button system.
- Shadows are modest and functional: floating panels, preview windows, mobile
  drawers, and the record mechanism may use them. Ordinary archive rows and
  ledger cells rely on rules rather than shadow.

## 6. Numbering and editorial metadata

Numbers and labels encode structure:

- `Side A` / `Side B`: the two real archive faces, mathematics and physics.
- `A` / `B` / `C`: the homepage's actual three entry points.
- `Stu`, `Lec`, `Rev`, `Aux`: lecture kinds and spines.
- course codes, dates, page counts, file types, track numbers, version numbers,
  and folios: real catalog metadata.

Use IBM Plex Mono for machine-like metadata and Cormorant for record-like Side
or spine display when the existing pattern calls for it. Keep labels compact
and visually subordinate to the content title.

Never add `01`, `02`, `03` merely to make a grid look editorial. A number must
answer one of these questions: order, side, edition, count, version, date,
course, file, or location in a real collection.

## 7. Layout and page composition

### Shared shell

- Canonical maximum content width: `1320px`.
- Desktop shell: `width: min(calc(100% - 64px), var(--max-width))`.
- Mobile shell at `<=760px`: `width: min(calc(100% - 36px), var(--max-width))`.
- Header height: 72px desktop, 64px mobile.
- Maintain a 320px minimum document width and prevent horizontal overflow.

### Header and navigation

- Desktop header is fixed, three-part, and balanced: wordmark, centered
  navigation, right actions.
- It uses a hairline and cool translucent porcelain rather than a heavy bar.
- At `<=1050px`, hide secondary wordmark/action information before compressing
  primary functions.
- At `<=760px`, navigation becomes a fixed four-column bottom bar; the top bar
  keeps the wordmark and essential actions.
- New routes must fit the existing information architecture. Do not add a fifth
  mobile item casually; reconsider grouping or the whole navigation contract.

### Composition families

1. **Immersive home hero** — one atmospheric, full-bleed image; large Cormorant
   thesis; quiet veil; one underlined text command; folio/download details at
   the edges. Do not repeat this hero on every route.
2. **Interior introduction** — compact kicker, Chinese page title, short
   explanatory paragraph, and a strong bottom rule. This is the default opening
   for `/books/`, `/projects/`, `/music/`, and topic indexes.
3. **Archive/catalog** — columns or ledgers divided by spines, rules, folders,
   rows, counts, and compact action clusters. Best for books and collections.
4. **Project dossier** — adapt the ledger/tool pattern: index, project title,
   status/date/discipline metadata, one preview or evidence image, and concise
   actions. Use a real project taxonomy instead of invented sequence numbers.
5. **Academic topic** — use a paper-like article opening plus a structured map
   of sections, references, figures, or related lectures. Equations or diagrams
   can be the page-specific signature, but do not turn the whole page into a
   dashboard.
6. **Music catalog** — retain record/side language, track numbering, album art,
   and the compact player. The music route may expand the catalog, but the fixed
   header player remains the persistent playback controller.
7. **Reader/utility** — denser controls are allowed when the task requires
   them. Keep toolbar chrome compact and preserve the global type/color roles.

### Grid behavior

- Prefer asymmetry with one clear alignment spine over an arbitrary mosaic.
- Desktop archive grids may use two equal columns; collapse to one column at
  `<=1050px` and cap reading width where appropriate.
- At `<=760px`, grids usually become one column, peripheral copy disappears,
  and action areas wrap or move below primary content.
- Preserve generous section rhythm: desktop sections commonly use 64–116px
  vertical padding; mobile uses roughly 44–92px depending on hierarchy.

## 8. Component grammar

### Cards and rows

- The default "card" is a ruled row or ledger cell, not a detached rounded
  rectangle.
- A row contains one dominant object/title, one compact metadata group, and one
  action cluster. Keep all three aligned to the same baseline or grid.
- Hover may add a pale tint. Selection may add a 3px brass inset rule. Do not
  scale the whole card or lift every card with a large shadow.
- Lecture and book covers retain their aspect ratio and stay visually secondary
  to the catalog structure at row scale.

### Buttons and links

- Primary text action: wine text, no filled container, thin underline, icon
  shifts about 4px on hover.
- Primary compact action: paper on wine, restrained 3–6px radius or a circle
  when the control is icon-only.
- Secondary outlined action: one-pixel strong line, ink-soft label, tiny mono
  metadata when appropriate.
- Icon-only action: transparent 38–44px circle, wine/pale tint on hover.
- Selected filter: paper text on wine; inactive filters remain outlined.
- Do not use multiple competing filled CTAs in one local surface.
- Use Lucide icons with thin strokes around 1.5–1.7, and hide decorative icons
  from assistive technology.

### Catalog folders and disclosures

- A disclosure summary must expose a real group title, count, and state icon.
- Use the existing disclosure motion rather than a separate animation library.
- Expanded content continues the parent rules and indentation; it should not
  become a nested floating card.

### Images

- Preserve natural aspect ratios for contextual art and music background images.
- Use `object-fit: cover` only when the component contract is explicitly a
  crop, such as the home hero or circular avatar.
- A page may have one dominant visual moment. Avoid decorative stock imagery in
  every section.
- Lecture covers retain the established 720×960 record-sleeve series contract.

## 9. Record and music elements

The record player is a signature interaction, not a general-purpose decoration.

### Visual anatomy

- Vinyl: 82px black-charcoal platter with fine radial grooves and restrained
  inset depth.
- Label/cover: 54px circle; neutral state uses a wine gradient, brass inset
  ring, and `RY` mono mark.
- Hardware: small brass pivot, dark tonearm, visible spindle, and an arm rest.
- Text: mono eyebrow/album metadata, Cormorant track title, wine artist name.
- Timeline: a passive two-pixel rail with brass progress. It is display-only;
  never add seeking or scrubbing.

### Behavioral contract

- Music is off after a full refresh and starts only after user action.
- Playback state persists across Astro transitions, not full refreshes.
- Platter acceleration/deceleration and audio fade share 380ms and begin
  together.
- Panel enter is about 220ms; ordinary surface enter about 180–190ms; exit is
  about 150–170ms.
- The record motif may appear on `/music/`, but do not scatter decorative vinyl
  across unrelated pages.

## 10. Motion rhythm

Motion should feel like a careful hand opening a sleeve or turning a page.

| Band | Duration | Use |
| --- | --- | --- |
| tactile | 140–160ms | icon, color, press, chevron, hover feedback |
| structural | 180–220ms | disclosure, panel, catalog/context entrance |
| mechanical/listening | 380ms | synchronized audio fade and platter ramp |
| illustrative | 500–780ms | restrained page/hero reveal |
| ambient | 2.4s | home hero image crossfade/scale only |

Preferred entrance easing is `cubic-bezier(0.22, 1, 0.36, 1)`; exits may use
`cubic-bezier(0.4, 0, 1, 1)` or an ease-in variant. Animate opacity and a small
4–8px translation. Avoid springy overshoot, large parallax, cursor followers,
continuous floating, and multiple simultaneous reveal systems.

Honor `prefers-reduced-motion` globally. The site collapses animation and
transition duration to effectively instant, disables smooth scrolling, and
pauses the WAAPI platter through its controller. New motion must degrade just
as cleanly.

## 11. Responsive rules

### Breakpoint roles

- `>1050px`: full desktop header and multi-column catalogs.
- `<=1050px`: remove secondary header details; collapse the lecture archive to
  one column; simplify supporting profile content.
- `<=760px`: primary mobile transformation—64px top header, fixed bottom nav,
  one-column page grids, 18px side gutters, reflowed row actions, mobile music
  panel, reader drawer/toolbar changes.
- `<=420px`: narrow-phone tightening—smaller hero, images, row titles, and
  secondary metadata removal.
- `<=380px`: music controls reduce from 42px to 38px except the 42px play
  control; turntable scales to preserve the record/copy relationship.
- `<=1180px`: reader-specific toolbar compression.

### Rules across all widths

- Never solve mobile by scaling the complete desktop composition down.
- Preserve the information order: title and primary action first, metadata and
  secondary action later or hidden.
- Touch targets should normally remain 38–44px. A visually thin text command
  still needs enough surrounding hit area.
- Use `100dvh` and safe-area insets for fixed mobile panels and toolbars.
- Test long Chinese titles, English titles, counts, dates, and empty states.
- Check horizontal overflow, clipped focus rings, fixed-header overlap, fixed
  bottom-nav overlap, and music-panel height.

### Required visual QA set

For visual changes, inspect:

- `360×800` — narrow mobile and bottom navigation;
- `768×1024` — tablet transition just above the primary breakpoint;
- `1440×900` — standard desktop composition;
- `2560×1440` — large desktop whitespace and max-width behavior;
- `3840×2160` — 4K scaling, image quality, and overextended rules.

Also exercise keyboard focus, touch-relevant controls, `prefers-reduced-motion`,
and the actual interaction changed. A build alone is not visual QA.

## 12. Accessibility and interaction invariants

- Keep the skip link and a unique `#main-content` target.
- Global keyboard focus is a 2px wine outline with 4px offset; component-local
  focus may use a tighter 2px offset when necessary.
- Do not hide a needed action on mobile without providing an equivalent route.
- Do not rely on color alone for selection or state; use labels, `aria-pressed`,
  `aria-current`, icons, counts, or position.
- Icon-only buttons require an `aria-label` and useful title where the existing
  interface follows that convention.
- Decorative icons use `aria-hidden="true"`.
- Progress indicators that are not controls must not gain keyboard or pointer
  behavior.
- Preserve readable contrast on translucent header, image hero, wine buttons,
  dark previews, and footer.

## 13. New-route decision guide

### `/books/`

Use the interior introduction plus an edition/shelf catalog. Suitable metadata
includes author, edition, language, subject, reading status, and related notes.
The signature can be a bookplate, spine, or edition mark. Do not clone the
lecture archive if the information model is different.

### `/projects/`

Use a dossier or field-note ledger. Suitable structure includes discipline,
status, date, collaborators, artifact links, and a concise project thesis. One
project may receive a preview or diagram; avoid a generic three-card product
grid with invented statistics.

### `/music/`

Use the existing player and catalog data as the behavioral source. Expand
album/artist/track browsing around record-side, session, and sequence metadata.
Do not duplicate audio state in a second player or turn the display-only
progress rail into a control.

### Academic topic page

Use a compact page introduction, paper-like prose, one subject diagram or
formula-led signature, and a ruled map of related lectures/references. The
subject determines the visual metaphor; the UI palette and type hierarchy stay
canonical.

## 14. Anti-patterns

Reject or revise a proposal when it depends on:

- a generic warm cream/terracotta portfolio palette;
- a second unrelated dark mode or neon music-app palette;
- large rounded cards, oversized pills, or shadows on every object;
- gradients without a physical or image-based reason;
- arbitrary `01/02/03` decorations;
- one font family for every role;
- bold sans-serif dashboard headings;
- equal visual emphasis for every action;
- vinyl used as decoration on non-music content;
- scroll animations on every section;
- desktop layout merely shrunk on mobile;
- placeholder copy, invented statistics, or fake academic metadata.

## 15. Implementation and validation checklist

Before coding:

- inspect the nearest existing page and shared components;
- identify the page job, composition family, and one subject-specific signature;
- map every proposed color, font, line, number, card, button, and motion to a
  documented role;
- decide what collapses, moves, or disappears at 1050/760/420px.

Before delivery:

- confirm new styles reuse the canonical custom properties;
- confirm new structural labels encode real information;
- confirm buttons and cards follow the established grammar;
- confirm reduced motion and keyboard focus;
- run relevant repository checks, normally `pnpm check` and `pnpm build`, plus
  data verification commands when the change touches their domains;
- inspect the required viewport set with the real rendered site;
- verify no horizontal overflow, clipped text, overlap, console error, failed
  request, or broken navigation;
- state exactly which checks were static, built, browser-tested, or production-
  verified.
