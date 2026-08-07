import curatedRecords from "./manual-announcements.json";
import automaticRecords from "./generated-announcements.json";
import { splitAnnouncements, type Announcement } from "./announcement-logic";

export type { Announcement, AnnouncementLink } from "./announcement-logic";

const allRecords = [...(curatedRecords as Announcement[]), ...(automaticRecords as Announcement[])];

const split = splitAnnouncements(allRecords, Date.now());

export const announcements = split.active;
export const archivedAnnouncements = split.archived;
