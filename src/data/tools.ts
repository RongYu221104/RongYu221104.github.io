export interface Tool {
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  description: string;
  meta: string;
  preview: string;
  previewAlt: string;
  openPath?: string;
  downloadPath: string;
  downloadFilename: string;
}

export const tools: Tool[] = [
  {
    slug: "ryplan",
    name: "RYplan",
    category: "规划与记录",
    subtitle: "学习计划管理工具",
    description:
      "安排每日计划、记录完成情况，并管理长期目标。下载单文件版本后即可在浏览器中使用，数据保存在当前浏览器中，也可导入或下载 JSON 备份。",
    meta: "Offline HTML · JSON backup",
    preview: "/images/ryplan-preview.png",
    previewAlt: "RYplan 学习计划管理工具界面预览",
    downloadPath: "/downloads/RYplan.html",
    downloadFilename: "RYplan.html",
  },
  {
    slug: "workspace-viewer",
    name: "workspace-viewer",
    category: "PDF 阅读",
    subtitle: "工作区 PDF 阅读器",
    description:
      "选择整个工作区目录，为其中的 PDF 建立清晰导航，并在浏览器内集中阅读。目录授权与阅读记录由浏览器在本地管理。",
    meta: "Folder access · PDF viewer",
    preview: "/images/workspace-viewer-preview.png",
    previewAlt: "workspace-viewer 工作区 PDF 阅读器界面预览",
    openPath: "/tools/workspace-viewer/",
    downloadPath: "/downloads/workspace-viewer.html",
    downloadFilename: "workspace-viewer.html",
  },
  {
    slug: "docbridge",
    name: "DocBridge",
    category: "文档转换",
    subtitle: "文档转换与处理工具",
    description:
      "在浏览器本地处理 PDF、SVG 与 PPTX 文件，完成常用的转换和整理工作。文档无需上传到服务器。",
    meta: "PDF · SVG · PPTX",
    preview: "/images/docbridge-preview.png",
    previewAlt: "DocBridge 文档转换工具界面预览",
    openPath: "/tools/docbridge/",
    downloadPath: "/downloads/DocBridge.html",
    downloadFilename: "DocBridge.html",
  },
];
