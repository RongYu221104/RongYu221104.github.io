import automaticRecords from "./generated-announcements.json";
import manualRecords from "./manual-announcements.json";

export interface Announcement {
  id: string;
  type: "lecture" | "tool" | "resource" | "manual";
  title: string;
  body: string;
  publishedAt: string;
  href?: string;
}

const byNewest = (a: Announcement, b: Announcement) => b.publishedAt.localeCompare(a.publishedAt);

export const announcements = [
  ...(manualRecords as Announcement[]).sort(byNewest),
  ...(automaticRecords as Announcement[]).sort(byNewest),
];
