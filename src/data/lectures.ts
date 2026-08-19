import lectureRecords from "./lectures.json";
import { LECTURE_ASSET_BASE } from "../config/assets";

export type LectureSubject = "maths" | "physics";
export type LectureKind = "Stu" | "Lec" | "Rev" | "Aux";

export interface Lecture {
  subject: LectureSubject;
  kind: LectureKind;
  fileName: string;
  titleZh: string;
  titleEn: string;
  pages: number;
  publishedAt?: string | null;
  updatedAt: string;
  retired?: boolean;
  course: {
    code: string;
    titleZh: string;
    titleEn: string;
  };
}

export const lectures: Lecture[] = lectureRecords as Lecture[];

export const lectureKindLabels: Record<LectureKind, string> = {
  Stu: "学习讲义",
  Lec: "课程讲义",
  Rev: "复习讲义",
  Aux: "辅助讲义",
};

export function lectureSlug(lecture: Lecture): string {
  return lecture.fileName.replace(/\.pdf$/i, "").toLowerCase();
}

export function lectureUrl(lecture: Lecture): string {
  return `${LECTURE_ASSET_BASE}/lectures/${lecture.subject}/${encodeURIComponent(lecture.fileName)}`;
}

export function lectureViewerUrl(lecture: Lecture): string {
  const params = new URLSearchParams({
    file: lectureUrl(lecture),
    title: lecture.titleZh,
  });

  return `/viewer/?${params.toString()}`;
}

export function lectureCoverUrl(lecture: Lecture): string {
  return `/images/lectures/${lecture.fileName.replace(/\.pdf$/i, "")}.png`;
}

export function lectureShareUrl(lecture: Lecture): string {
  return `/lecture/${lectureSlug(lecture)}/`;
}

export function lectureMessageUrl(lecture: Lecture): string {
  return `/messages/${lectureSlug(lecture)}/`;
}
