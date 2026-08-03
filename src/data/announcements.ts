import automaticRecords from "./generated-announcements.json";
import manualRecords from "./manual-announcements.json";

export interface Announcement {
  id: string;
  type: "lecture" | "tool" | "manual";
  title: string;
  body: string;
  publishedAt: string;
  href?: string;
}

export const announcements = [
  ...(manualRecords as Announcement[]),
  ...(automaticRecords as Announcement[]),
].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
