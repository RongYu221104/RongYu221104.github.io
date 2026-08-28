---
name: rongyu-notes-design-system
description: Preserve and extend the RongYu's Notes Astro website design system when adding or revising routes, components, layouts, typography, styling, or visual interactions in RongYu221104.github.io. Use only for this website repository; do not apply it to sibling asset repositories, the RongYu's Notes mini program, or unrelated frontend work.
---

# RongYu's Notes Design System

Version: 1.0.0

Use this project-local skill together with `$frontend-design` for visual work in
`RongYu221104.github.io`. The generic skill supplies design judgment; this skill
supplies the site's established identity and invariants. It does not authorize
publishing, asset deletion, or changes outside the website repository.

Before designing or implementing a visual change, read
[references/design-system-v1.0.0.md](references/design-system-v1.0.0.md) in full.

## Scope

Use this skill when a website update does any of the following:

- adds a route such as `/books/`, `/projects/`, `/music/`, or an academic topic page;
- creates or reshapes a component, card, catalog, hero, toolbar, button, filter,
  navigation surface, or responsive layout;
- changes typography, color, borders, numbering, motion, spacing, imagery, or
  other visible behavior;
- reviews whether a proposed UI still belongs to RongYu's Notes.

Do not invoke it for content-only metadata changes that cannot affect layout,
for the sibling music/PDF asset repositories, for the native mini program, or
for another website merely because it also concerns mathematics, physics, or
music.

## Working contract

1. Inspect `src/styles/global.css`, `src/layouts/BaseLayout.astro`, and the
   components or pages nearest to the requested surface. The current source is
   authoritative when it intentionally differs from the versioned reference.
2. State the page's audience and single job. Choose the closest existing
   composition family: immersive home hero, catalog/archive, ledger/index,
   utility preview, reader, or compact floating music surface.
3. Reuse the established type roles, semantic palette, line hierarchy,
   numbering grammar, restrained radii, and motion rhythm. Extend the system by
   relationship, not by copying an unrelated page wholesale.
4. Give a new route one content-specific signature while keeping the rest
   quiet. A books page might use shelf or edition logic; a projects page might
   use dossier or field-note logic. Do not turn every subject into a vinyl
   record, but retain the site's editorial cadence.
5. Prefer existing layout primitives and components. Add a CSS custom property
   only when it represents a reusable semantic decision; do not create a second
   palette or duplicate an existing component under a new name.
6. Keep structure semantic: Side A/B, indices, folios, course codes, dates, and
   sequence numbers must describe real information. Never add decorative
   `01/02/03` labels without an actual ordering or catalog role.
7. Preserve keyboard focus, touch targets, reduced-motion behavior, readable
   contrast, and the site's minimum 320px width. Motion must explain state or
   support the record/listening metaphor.
8. Validate the affected page in the repository's required viewport set and
   run the relevant `pnpm` checks. Do not claim visual validation from a source
   review or production build alone.

## System changes

Treat the reference as a maintained contract, not a frozen screenshot. When an
explicitly requested website redesign changes a shared token or invariant,
update this skill in the same website change:

- patch: clarification or corrected source anchor;
- minor: compatible new component or composition pattern;
- major: incompatible change to the site's core palette, typography, or visual
  grammar.

Add a new versioned reference for minor or major revisions and keep older
references for historical context. Do not silently rewrite the documented
system to justify an isolated exception.

## Delivery check

Before reporting completion, confirm that the result:

- reads as a RongYu's Notes surface without depending on the wordmark alone;
- uses the documented font roles and semantic colors;
- retains line-led editorial structure instead of generic floating cards;
- uses numbering only where it carries information;
- distinguishes wine actions from brass highlights;
- behaves coherently at mobile, tablet, desktop, and large-display widths;
- respects `prefers-reduced-motion`, keyboard focus, and touch use;
- passes relevant static/build checks and has an honest visual-QA boundary.
