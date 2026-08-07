export interface AnnouncementLink {
  href: string;
  label: string;
}

export interface Announcement {
  id: string;
  type: "lecture" | "tool" | "resource" | "manual" | "music";
  title: string;
  body: string;
  publishedAt: string;
  href?: string;
  links?: AnnouncementLink[];
  archivedAt?: string;
}

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Dates are authored either as "YYYY-MM-DD" (midnight, +08:00) or as ISO
// strings carrying their own offset. Offset-less ISO strings are treated as
// +08:00 so builds in any CI timezone produce the same result.
export function normalizeMs(value: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Date.parse(`${value}T00:00:00+08:00`);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) return Date.parse(`${value}+08:00`);
  return Date.parse(value);
}

export function removalTime(record: Announcement): number {
  if (record.archivedAt) return normalizeMs(record.archivedAt);
  if (record.type === "manual") return Infinity;
  return normalizeMs(record.publishedAt) + SEVEN_DAYS_MS;
}

const byNewest = (a: Announcement, b: Announcement) =>
  normalizeMs(b.publishedAt) - normalizeMs(a.publishedAt) || a.id.localeCompare(b.id);

export function splitAnnouncements(
  records: Announcement[],
  nowMs: number,
): { active: Announcement[]; archived: Announcement[] } {
  const active: Announcement[] = [];
  const archived: Announcement[] = [];
  for (const record of records) {
    if (removalTime(record) <= nowMs) archived.push(record);
    else active.push(record);
  }
  const pinned = (record: Announcement) => (record.type === "manual" ? 1 : 0);
  active.sort((a, b) => pinned(b) - pinned(a) || byNewest(a, b));
  archived.sort((a, b) => removalTime(b) - removalTime(a) || byNewest(a, b));
  return { active, archived };
}
