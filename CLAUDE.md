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

## Announcement Icons

Keep announcement icons consistent anywhere announcements are rendered,
including both the first three homepage entries and the collapsed remaining
entries.

- Use icons from `lucide-astro` with `size={17}` and `strokeWidth={1.6}`.
- Treat announcement icons as decorative and apply `aria-hidden="true"` to
  their wrapper or the icon itself.
- Map `manual` to `Bell`. In the current data model, `manual` means a manually
  maintained, pinned announcement; it is not a general synonym for every site
  feature update.
- Map `lecture` to `BookOpen` for lecture releases and updates.
- Map `tool` to `Wrench` for tool releases and updates.
- Map `resource` to `PackageOpen` for colophon templates, source packages, and
  other downloadable resources.
- Map `music` to `Disc3` for music releases, track updates, and music-player
  announcements.
- When adding an announcement type, first extend the `Announcement.type` union
  in `src/data/announcements.ts`, then add one semantically appropriate Lucide
  icon to the shared rendering logic and verify every announcement list uses
  it.
- Prefer one shared icon mapping or renderer when modifying the announcement
  UI. If the markup remains duplicated, update and verify every copy in the
  same change; never hard-code a fallback icon for the collapsed list.
- Choose icons that communicate the category without requiring a visible text
  legend. Keep category meaning stable across desktop and mobile layouts.
