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

export const tools = toolRecords as Tool[];
import toolRecords from "./tools.json";
