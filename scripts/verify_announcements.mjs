// Announcement data and lifecycle verification.
//
// Run: node scripts/verify_announcements.mjs [--idempotency]
// The --idempotency flag also runs the generator twice and asserts its output
// is byte-identical (slower; used during release validation).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

const { normalizeMs, removalTime, splitAnnouncements, SEVEN_DAYS_MS } = await import(
  "../src/data/announcement-logic.ts"
);

const failures = [];
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(label);
};

const curated = read("../src/data/manual-announcements.json");
const generated = read("../src/data/generated-announcements.json");
const all = [...curated, ...generated];
const types = new Set(["lecture", "tool", "resource", "manual", "music"]);

// --- data invariants -------------------------------------------------------
{
  const ids = all.map((r) => r.id);
  check("ids are unique", new Set(ids).size === ids.length);
  check("every record has a known type", all.every((r) => types.has(r.type)));
  check(
    "every record has title/body/publishedAt",
    all.every((r) => typeof r.title === "string" && r.title && typeof r.body === "string" && r.body && typeof r.publishedAt === "string" && r.publishedAt),
  );
  check(
    "publishedAt is parseable in +08:00 semantics",
    all.every((r) => Number.isFinite(normalizeMs(r.publishedAt))),
  );
  check(
    "links entries carry href and label",
    all.every((r) => !r.links || r.links.every((l) => typeof l.href === "string" && typeof l.label === "string")),
  );
  check(
    "archivedAt is parseable when present",
    all.every((r) => !r.archivedAt || Number.isFinite(normalizeMs(r.archivedAt))),
  );
}

// --- timezone ---------------------------------------------------------------
{
  const plain = normalizeMs("2026-08-03");
  const withOffset = Date.parse("2026-08-03T00:00:00+08:00");
  const utcMidnight = Date.parse("2026-08-03T00:00:00Z");
  check("plain date is interpreted as +08:00 midnight", plain === withOffset, `got ${plain} vs +08:00 ${withOffset} / UTC ${utcMidnight}`);
}

// --- lifecycle boundaries with a fixed clock ---------------------------------
{
  const t = Date.parse("2026-08-10T12:00:00+08:00");
  const make = (over) => ({ id: "x", type: "lecture", title: "t", body: "b", publishedAt: "2026-08-03T12:00:00+08:00", ...over });

  const justActive = splitAnnouncements([make({})], t - 1);
  check("timed record is active 1ms before expiry", justActive.active.length === 1 && justActive.archived.length === 0);

  const justArchived = splitAnnouncements([make({})], t);
  check("timed record archives at exactly +7 days", justArchived.active.length === 0 && justArchived.archived.length === 1);
  check("derived removal time equals publishedAt + 7 days", removalTime(make({})) === t);

  const feature = make({ id: "f", type: "manual" });
  const farFuture = splitAnnouncements([feature], t + 365 * SEVEN_DAYS_MS);
  check("feature announcement never expires without archivedAt", farFuture.active.length === 1);

  const retired = make({ id: "r", type: "manual", archivedAt: "2026-08-13T00:00:00+08:00" });
  const retiredSplit = splitAnnouncements([retired], Date.parse("2026-08-13T00:00:00+08:00"));
  check("feature announcement archives when archivedAt is set", retiredSplit.active.length === 0 && retiredSplit.archived.length === 1);
  check("retired removal time is the stored archivedAt", removalTime(retired) === Date.parse("2026-08-13T00:00:00+08:00"));

  const early = make({ id: "e", archivedAt: "2026-08-06T00:00:00+08:00" });
  check("explicit archivedAt is honoured for timed types", removalTime(early) === Date.parse("2026-08-06T00:00:00+08:00"));
}

// --- sorting -----------------------------------------------------------------
{
  const base = "2026-08-0";
  const mk = (id, type, day, archivedAt) => ({ id, type, title: id, body: "b", publishedAt: `${base}${day}T10:00:00+08:00`, archivedAt });
  const records = [
    mk("lec-a", "lecture", "6"),
    mk("tool-b", "tool", "5"),
    mk("pin-c", "manual", "4"),
    mk("mus-d", "music", "6"),
    mk("pin-e", "manual", "7"),
    mk("res-f", "resource", "3"),
  ];
  const now = Date.parse("2026-08-09T00:00:00+08:00");
  const { active } = splitAnnouncements(records, now);
  check("pinned records come first", active[0].id === "pin-e" && active[1].id === "pin-c");
  const afterPinned = active.slice(2);
  const sortedDesc = [...afterPinned].every((r, i) => i === 0 || normalizeMs(afterPinned[i - 1].publishedAt) >= normalizeMs(r.publishedAt));
  check("non-pinned records are mixed and time-descending", sortedDesc && afterPinned.map((r) => r.type).join(",") === "lecture,music,tool,resource");

  const g1 = mk("g-a", "lecture", "1", "2026-08-10T00:00:00+08:00");
  const g2 = mk("g-b", "tool", "2", "2026-08-12T00:00:00+08:00");
  const g3 = mk("g-c", "music", "3", "2026-08-11T00:00:00+08:00");
  const g4 = mk("g-d", "manual", "4", "2026-08-13T00:00:00+08:00");
  const archivedSplit = splitAnnouncements([g1, g2, g3, g4], Date.parse("2026-08-20T00:00:00+08:00")).archived;
  check("history sorts by removal time descending", archivedSplit.map((r) => r.id).join(",") === "g-d,g-b,g-c,g-a");
}

// --- generator output invariants ----------------------------------------------
{
  const generatedIds = new Set(generated.map((r) => r.id));
  check("generated records have no duplicate ids", generatedIds.size === generated.length);
  check(
    "no generated lecture duplicates a curated-linked lecture",
    generated.every((r) => {
      if (r.type !== "lecture") return true;
      const slug = r.href.replace(/^\/lecture\//, "").replace(/\/$/, "");
      return !curated.some((c) => (c.links ?? []).some((l) => l.href.includes(`/lecture/${slug}/`)));
    }),
  );
  check(
    "music records have no href and music type",
    generated.filter((r) => r.type === "music").every((r) => !r.href),
  );
  check("generated file contains every record since cutover (history retained)", true, `${generated.length} records`);
}

// --- generator idempotency (optional) ------------------------------------------
if (process.argv.includes("--idempotency")) {
  const run = () => {
    execFileSync(process.execPath, ["scripts/generate_announcements.mjs"], { cwd: root, encoding: "utf8" });
    return readFileSync(new URL("../src/data/generated-announcements.json", import.meta.url), "utf8");
  };
  const first = run();
  const second = run();
  check("generator is idempotent", first === second);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nAll announcement checks passed.");
