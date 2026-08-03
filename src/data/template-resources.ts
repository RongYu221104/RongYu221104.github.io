export interface TemplateDocument {
  slug: string;
  fileName: string;
  titleZh: string;
  titleEn: string;
  description: string;
  pages: number;
  updatedAt: string;
}

export const templateDocuments: TemplateDocument[] = [
  {
    slug: "rynotes_v2-usage",
    fileName: "rynotes_v2-usage.pdf",
    titleZh: "rynotes_v2 使用指南",
    titleEn: "rynotes_v2 Usage Guide",
    description: "讲义模板的安装、配置与常用命令说明。",
    pages: 25,
    updatedAt: "2026-08-03",
  },
  {
    slug: "rynotes_v2-demo",
    fileName: "rynotes_v2-demo.pdf",
    titleZh: "rynotes_v2 样式总览",
    titleEn: "rynotes_v2 Style Demo",
    description: "讲义模板的标题、定理环境与版面效果展示。",
    pages: 13,
    updatedAt: "2026-08-03",
  },
];

export const templateArchive = {
  fileName: "rynotes_v2-template.zip",
  title: "rynotes_v2 模板与字体包",
  description: "包含 rynotes_v2.sty 与模板所需字体。",
};

export function templateDocumentUrl(document: TemplateDocument) {
  return `/resources/rynotes-v2/${encodeURIComponent(document.fileName)}`;
}

export function templateDocumentViewerUrl(document: TemplateDocument) {
  const params = new URLSearchParams({
    file: templateDocumentUrl(document),
    title: document.titleZh,
  });
  return `/viewer/?${params.toString()}`;
}

export function templateDocumentCoverUrl(document: TemplateDocument) {
  return `/images/lectures/${document.slug}.png`;
}

export function templateDocumentShareUrl(document: TemplateDocument) {
  return `/resource/${document.slug}/`;
}

export function templateDocumentMessageUrl(document: TemplateDocument) {
  return `/messages/${document.slug}/`;
}
