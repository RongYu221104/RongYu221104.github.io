# RongYu's Notes Claude Code Guidance

Read and follow `AGENTS.md` in this project before editing. It contains the
project's complete operational, validation, asset, cover-generation, and
publishing guidance. The rules below restate the announcement-specific
contract so Claude Code applies it consistently when working on the homepage.

## Music Progress Bar Is Display-Only

The player's progress bar is a passive indicator, not a control. Jazz is meant
to be savored slowly, so a track must unfold at its own pace.

- Do not allow seeking or scrubbing the progress bar in any form: no pointer or
  touch dragging, no range-input value changes, and no keyboard seek (arrow
  keys, Home/End, PageUp/PageDown).
- Keep the progress bar as a read-only visual element (`div` with
  `data-player-progress` filling a brass line through the `--progress` custom
  property). Do not convert it back to an interactive `<input type="range">`.
- Keep the `seeking` playback phase and all seek helpers out of
  `src/scripts/music-player.ts` (`beginSeek`, `handleSeekInput`, `commitSeek`,
  `handleSeeked`, and the `seeked` audio listener).
- The time labels may keep showing elapsed and total time; switching tracks
  (previous/next/catalog) and natural track completion remain the only ways to
  move through a track.

## Announcement Board Rules

The homepage announcement board has one curated source and one derived
source, merged in `src/data/announcements.ts`:

- `src/data/manual-announcements.json` is authored by hand. It holds the
  website-feature announcements (`type: "manual"`, the only manual category,
  permanently pinned and visually emphasized) plus special records the
  generator cannot produce (multi-version lecture announcements, music-player
  updates). Non-`manual` curated records still follow the same seven-day
  lifecycle as generated ones.
- `src/data/generated-announcements.json` is derived by
  `scripts/generate_announcements.mjs` (run in `prebuild`/`precheck`) from
  Git history for lectures, tools, the rynotes_v2 template, and audio tracks.
  Every record since the 2026-08-03 cutover is kept permanently, so expired
  records can be archived instead of deleted. Lectures already linked from a
  curated announcement are skipped.

Lifecycle (pure logic in `src/data/announcement-logic.ts`, evaluated at build
time; no database or background jobs):

- `manual` records never expire on their own; only an explicit `archivedAt`
  retires them.
- Every other record expires `publishedAt + 7 days` (+08:00 semantics) and
  moves into the "历史公告" section, which sorts by removal time and shows no
  pinned badge or emphasis.
- Publishing is user-driven: standard new uploads announce automatically,
  while major updates, multi-version merges, and player updates are hand
  written when the user says "发公告".
- After editing either data file, run `pnpm verify:announcements`
  (`scripts/verify_announcements.mjs`) and `pnpm check`.

## Announcement Icons

Keep announcement icons consistent anywhere announcements are rendered,
including the first three homepage entries, the collapsed remaining entries,
and the history section. The single shared renderer is
`src/components/AnnouncementItem.astro`; do not inline announcement markup
elsewhere.

- Use icons from `lucide-astro` with `size={17}` and `strokeWidth={1.6}`.
- Treat announcement icons as decorative and apply `aria-hidden="true"` to
  their wrapper or the icon itself.
- Map `manual` to `Bell`. `manual` is the website-feature-update category:
  the only manually authored, permanently pinned announcement type.
- Map `lecture` to `BookOpen` for lecture releases and updates.
- Map `tool` to `Wrench` for tool releases and updates.
- Map `resource` to `PackageOpen` for colophon templates, source packages, and
  other downloadable resources.
- Map `music` to `Disc3` for music releases, track updates, and music-player
  announcements.
- When adding an announcement type, first extend the `Announcement.type` union
  in `src/data/announcement-logic.ts`, then add one semantically appropriate
  Lucide icon to `AnnouncementItem.astro` and verify every announcement list
  uses it.
- Never hard-code a fallback icon in a specific list; the mapping lives only
  in `AnnouncementItem.astro`.
- Choose icons that communicate the category without requiring a visible text
  legend. Keep category meaning stable across desktop and mobile layouts.
