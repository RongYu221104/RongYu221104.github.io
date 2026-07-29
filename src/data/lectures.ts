export type LectureSubject = "maths" | "physics";
export type LectureKind = "Stu" | "Lec" | "Rev";

export interface Lecture {
  subject: LectureSubject;
  kind: LectureKind;
  fileName: string;
  titleZh: string;
  titleEn: string;
  pages: number;
  updatedAt: string;
}

const updatedAt = "2026-07-29";

export const lectures: Lecture[] = [
  { subject: "maths", kind: "Stu", fileName: "Stu_AA.pdf", titleZh: "抽象代数", titleEn: "Abstract Algebra", pages: 76, updatedAt },
  { subject: "maths", kind: "Stu", fileName: "Stu_DG-Manifold.pdf", titleZh: "流形微分几何", titleEn: "Differential Geometry of Manifolds", pages: 54, updatedAt },
  { subject: "maths", kind: "Stu", fileName: "Stu_GRT.pdf", titleZh: "群表示论", titleEn: "Group Representation Theory", pages: 28, updatedAt },
  { subject: "maths", kind: "Stu", fileName: "Stu_LA.pdf", titleZh: "线性代数", titleEn: "Linear Algebra", pages: 83, updatedAt },
  { subject: "maths", kind: "Lec", fileName: "Lec_ODE.pdf", titleZh: "常微分方程", titleEn: "Ordinary Differential Equation", pages: 75, updatedAt },
  { subject: "maths", kind: "Lec", fileName: "Lec_PS.pdf", titleZh: "概率论与数理统计", titleEn: "Probability & Mathematical Statistics", pages: 29, updatedAt },
  { subject: "maths", kind: "Rev", fileName: "Rev_LA.pdf", titleZh: "线性代数", titleEn: "Linear Algebra", pages: 13, updatedAt },
  { subject: "maths", kind: "Rev", fileName: "Rev_MP-Method.pdf", titleZh: "数学物理方法", titleEn: "Method of Mathematical Physics", pages: 21, updatedAt },
  { subject: "physics", kind: "Stu", fileName: "Stu_CM.pdf", titleZh: "经典力学", titleEn: "Classical Mechanics", pages: 39, updatedAt },
  { subject: "physics", kind: "Stu", fileName: "Stu_QM.pdf", titleZh: "量子力学", titleEn: "Quantum Mechanics", pages: 54, updatedAt },
  { subject: "physics", kind: "Stu", fileName: "Stu_SR.pdf", titleZh: "狭义相对论", titleEn: "Special Relativity", pages: 31, updatedAt },
  { subject: "physics", kind: "Lec", fileName: "Lec_AP.pdf", titleZh: "原子物理学", titleEn: "Atomic Physics", pages: 48, updatedAt },
  { subject: "physics", kind: "Lec", fileName: "Lec_ED.pdf", titleZh: "电动力学", titleEn: "Electrodynamics", pages: 63, updatedAt },
  { subject: "physics", kind: "Lec", fileName: "Lec_OP.pdf", titleZh: "光学", titleEn: "Optics", pages: 32, updatedAt },
  { subject: "physics", kind: "Rev", fileName: "Rev_AP.pdf", titleZh: "原子物理学", titleEn: "Atomic Physics", pages: 8, updatedAt },
  { subject: "physics", kind: "Rev", fileName: "Rev_CM.pdf", titleZh: "经典力学", titleEn: "Classical Mechanics", pages: 15, updatedAt },
  { subject: "physics", kind: "Rev", fileName: "Rev_ED.pdf", titleZh: "电动力学", titleEn: "Electrodynamics", pages: 20, updatedAt },
  { subject: "physics", kind: "Rev", fileName: "Rev_EM.pdf", titleZh: "电磁学", titleEn: "Electromagnetics", pages: 22, updatedAt },
  { subject: "physics", kind: "Rev", fileName: "Rev_TH.pdf", titleZh: "热学", titleEn: "Thermology", pages: 12, updatedAt },
];

export const lectureKindLabels: Record<LectureKind, string> = {
  Stu: "学习讲义",
  Lec: "课程讲义",
  Rev: "复习讲义",
};

export function lectureUrl(lecture: Lecture): string {
  return `/lectures/${lecture.subject}/${encodeURIComponent(lecture.fileName)}`;
}
