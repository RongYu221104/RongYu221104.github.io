# RongYu's Notes Project Guidance

This file supplements `D:\Agents\workspaces\code\AGENTS.md`. It records
project-specific operational lessons from earlier work on this repository.
The recommendations below are guidance rather than inflexible requirements.
Use engineering judgment when the task, network conditions, upload size, or
user instructions justify a different approach.

## Previous Stall Patterns

Several earlier update sessions spent disproportionate time starting an Astro
development server after the requested code changes and production build were
already complete.

### Initial Site Acceptance

- The work spent about 42 minutes investigating case-duplicate `Path` and
  `PATH` variables, reconstructing child-process environments, and attempting
  to keep Astro alive in the background.
- The site code and production build were already usable.
- The user redirected the work toward a verifiable launch and requested that
  environment analysis stop.

### Three-Tool Release

- Two related turns were interrupted after about 29 minutes and 15 minutes.
- One all-in-one PowerShell launch script ran for more than 12 minutes before
  the user stopped it.
- Repeated work included enumerating and validating PATH entries,
  `ProcessStartInfo.EnvironmentVariables` injection, detached-process
  experiments, and port polling.
- A later continuation completed the release, but the overall publishing
  workflow became much longer than necessary.

### Music Progress And Take 2 Update

- One turn remained active for about 2 hours and 38 minutes before the user
  interrupted it.
- Type checking and the production build had already succeeded.
- The remaining delay came from repeated attempts involving `Start-Process`,
  `cmd.exe /c start /b`, Astro telemetry permissions, log handling, and local
  port detection.
- The effective recovery was to preserve the completed edits, stop localhost
  work, run only `pnpm build`, and continue to commit and publish.

An additional publishing turn lasted about 2 hours and 6 minutes, but it
included repository upload, pull-request work, deployment, and production
checks rather than one continuously stalled command. Treat it as a reminder to
keep publishing steps bounded and observable, not as a confirmed command hang.

## Likely Causes

Recurring contributing factors were:

- Treating optional localhost preview as a prerequisite after a successful
  production build.
- Attempting to repair the inherited Windows environment instead of containing
  the failure and moving on.
- Case-duplicate `Path` and `PATH` keys interacting poorly with Windows
  PowerShell 5.1, `Start-Process`, and .NET process environment collections.
- Astro attempting to write telemetry configuration under the user profile and
  receiving an `EPERM` error in a restricted environment.
- Background `cmd`, pnpm, or Node processes retaining output handles, remaining
  attached to the runner, or surviving an interrupted command.
- Port checks and retries lacking a clear overall deadline.
- Trying several wrappers around the same failing launch mechanism without
  materially changing the failure conditions.

## Recommended Validation Order

For most updates, a useful order is:

1. Inspect `git status` and `git diff`, preserving existing user work.
2. Process delivered assets and reconcile the structured site data.
3. Run `pnpm check` when relevant.
4. Run `pnpm build`, preferably with Astro telemetry disabled only for that
   process when the environment requires it.
5. Check generated routes, links, asset paths, filenames, and metadata.
6. Start a local development server only when browser or visual QA adds
   meaningful confidence for the current change.

A successful production build can be sufficient technical validation when the
change is data-only, localhost is unavailable, or the user requests build-only
verification. Mention any skipped browser check in the final report.

## Suggested Local Preview Approach

When local preview is useful:

- Prefer a simple, observable launch over reconstructing the complete process
  environment.
- Avoid modifying system-level or user-level environment variables.
- Avoid enumerating and running `Test-Path` against every PATH entry unless
  diagnosing PATH contents is itself the task.
- Be cautious with `Start-Process` and
  `ProcessStartInfo.EnvironmentVariables` on this machine because duplicate
  case-insensitive environment keys have previously caused failures.
- Consider launching `pnpm.cmd` through `cmd.exe`, disabling Astro telemetry
  only in the child process, and redirecting stdout and stderr to separate
  project-local logs.
- Keep a persistent development server outside the foreground command that
  Codex is waiting on.
- Poll ports `4321` and `4322` at short intervals with a finite deadline; 30
  seconds is usually enough for this project.
- If the port does not listen, inspect roughly the final 100 log lines and use
  the actual error to decide whether one materially different fallback is
  worthwhile.
- If the failure is again caused by duplicate environment keys, telemetry
  permissions, or process detachment, build-only validation is usually a
  better fallback than further launch-wrapper experiments.

These timings are practical defaults, not fixed limits. Large installs,
uploads, or Git pushes may reasonably need longer, but they should still use a
finite timeout and provide observable progress.

## Retry And Recovery Guidance

- State the command and expected timeout before a potentially long operation.
- Prefer one normal attempt followed by at most one materially different
  fallback before reassessing the value of that operation.
- Do not treat changes in quoting or nested shell wrappers as a new strategy
  when the underlying failure is unchanged.
- If the user interrupts a stalled operation, first inspect `git diff` and
  confirm which edits and generated assets are already complete.
- Do not automatically retry the interrupted command.
- Check for residual processes only when there is evidence that they belong to
  this project, and terminate only confidently identified development
  processes.
- Remove temporary logs or caches only after confirming their resolved paths
  are inside this repository.
- Continue from the latest valid artifact instead of repeating completed asset
  processing, code edits, or builds.
- Give the user's latest restriction priority. For example, after a request for
  build-only validation, do not resume localhost or browser work in that task.

## GitHub Publishing Flexibility

Local preview failure does not by itself need to block a normal GitHub update
when the requested changes are present, the production build succeeds, and
asset paths and generated output have been checked.

Choose the publishing route according to current conditions:

- Prefer normal non-force Git operations when terminal connectivity works.
- Use bounded retries for fetch, push, Actions queries, and browser operations.
- Account for the expected upload size when choosing a network timeout.
- Use the authenticated GitHub browser or connector as a fallback when it is
  appropriate and does not create a more complicated or risky workflow.
- Preserve a valid local commit and report the concrete blocker if publishing
  cannot be completed reliably.
- Report whether validation came from a local build, local browser, GitHub
  Actions, or the production site, and clearly identify checks that were
  skipped.

The goal is reliable completion with visible evidence. These notes should help
Codex recognize a recurring infrastructure problem early, choose a proportionate
fallback, and avoid allowing an optional development server to dominate an
otherwise completed GitHub update.

## Lecture Cover Generation

When adding or updating a lecture cover, first read the lecture metadata,
including its Chinese and English titles, subject, kind, page count, and
filename. Inspect the PDF table of contents or abstract when the title alone
does not provide enough context for a reliable design.

1. Give every lecture a dedicated central motif derived from a core object,
   structure, or process in its subject, such as a group action, manifold grid,
   phase portrait, light cone, energy-level transition, field line,
   wavefunction, or particle-exchange path.
2. Do not reuse a primary motif by merely recoloring, rotating, scaling, or
   slightly changing its lines. Every cover must have a recognizably different
   silhouette, visual center, and main geometric relationship.
3. Preserve the established record-sleeve series layout while varying the
   motif: output a `720 x 960` PNG; retain the site name, subject and kind, page
   count, Chinese and English titles, and filename; keep the existing
   subject-specific palettes for mathematics and physics.
4. Keep the central motif simple, flat, and reproducible, using a limited set
   of lines, nodes, curves, and color fields. Avoid photographic rendering, 3D
   effects, decorative gradients, unrelated patterns, and crowded equations.
5. Keep the motif clear of titles, page counts, and other text. Its subject
   silhouette must remain legible at the small shelf-thumbnail size used by
   the site.
6. Use a formula only when it is an essential subject identifier and can be
   typeset accurately. When uncertain, use a reliable conceptual diagram
   instead of inventing mathematical or physical content.
7. Maintain an explicit filename-to-motif mapping in the cover generator and
   keep generation deterministic. Repeated generation from the same inputs
   must produce the same result.
8. Make the generator fail when a lecture lacks a dedicated motif. Never fall
   back to a generic random template.
9. After generation, verify that cover count and filenames match the lecture
   data, every image is `720 x 960`, and no two covers have the same content
   hash. Run `pnpm verify:lectures` for the automated checks.
10. Build a contact sheet for manual visual QA. Confirm topic relevance,
    uniqueness, unobstructed text, thumbnail legibility, and consistency with
    the full cover series.
11. In the completion report, briefly identify the subject metaphor used by
    each new motif and report generator, data reconciliation, and visual QA
    results. Do not treat random generation alone as completion evidence.

## Published Asset Replacements And Repository Size

When a delivered PDF, audio file, image, font, or downloadable tool replaces an
existing published asset:

1. Identify the replacement and the obsolete published asset before editing.
   Confirm the new asset has been processed, has the intended metadata, and is
   referenced by the structured site data.
2. In the same update, remove obsolete files from the current repository
   version (`HEAD`), including superseded covers, stale data entries, and
   unused generated assets. Do not leave duplicate published versions merely
   because they share a friendly filename.
3. Preserve the user's intended download filename for a replacement lecture
   unless the user requests a filename change. Update the lecture metadata,
   page count, date, and category when they have changed.
4. Check `git status`, the staged diff, and generated asset paths before
   committing. Run the appropriate production validation, normally
   `pnpm check` and/or `pnpm build`, after the cleanup.
5. Remember that removing a file from `HEAD` does not remove its earlier binary
   versions from Git history. Report this when large replaced assets materially
   increase repository size.
6. History rewriting, `git filter-repo`, force pushes, or any other removal of
   already-published Git history require the user's explicit approval for the
   named assets and branch. Before doing so, inventory the exact target paths,
   preserve a local recovery reference, rewrite only those paths, use
   `--force-with-lease` when pushing, and verify that the replacement asset
   remains present and the removed asset no longer appears in reachable
   history.
7. For recurring large media replacements, raise the repository-size impact
   early. GitHub Pages counts all deployed assets together, and Git LFS cannot
   serve GitHub Pages assets.

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
- When adding an announcement type, first extend the `Announcement.type` union
  in `src/data/announcements.ts`, then add one semantically appropriate Lucide
  icon to the shared rendering logic and verify every announcement list uses
  it.
- Prefer one shared icon mapping or renderer when modifying the announcement
  UI. If the markup remains duplicated, update and verify every copy in the
  same change; never hard-code a fallback icon for the collapsed list.
- Choose icons that communicate the category without requiring a visible text
  legend. Keep category meaning stable across desktop and mobile layouts.

## Input Directory Stays Local

Never commit anything under `input/`. It holds user-provided references,
source materials, and working documents (plans, drafts, sample data) that stay
local to the workspace.

- Do not stage or commit any file under `input/`; the repository `.gitignore`
  already ignores it, and that exclusion must not be overridden with
  `git add -f` or similar.
- Before every commit, check `git status` and the staged diff to confirm no
  `input/` paths are included.
- Only processed, prepared public assets belong in the repository; anything
  the user delivered as raw material stays in `input/`.
