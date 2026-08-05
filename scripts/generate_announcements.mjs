import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lectures = JSON.parse(readFileSync(new URL("../src/data/lectures.json", import.meta.url), "utf8"));
const tools = JSON.parse(readFileSync(new URL("../src/data/tools.json", import.meta.url), "utf8"));
const output = new URL("../src/data/generated-announcements.json", import.meta.url);

// Lectures whose slugs are already linked from a manual announcement are
// covered by that curated announcement and must not also get an automatic one.
const manualRecords = JSON.parse(readFileSync(new URL("../src/data/manual-announcements.json", import.meta.url), "utf8"));
const coveredLectureSlugs = new Set();
for (const manual of manualRecords) {
  for (const link of manual.links ?? []) {
    const match = String(link.href).match(/^\/lecture\/([^/]+)\//);
    if (match) coveredLectureSlugs.add(match[1]);
  }
}
const sevenDays = 7 * 24 * 60 * 60 * 1000;
const automaticAnnouncementsSince = new Date("2026-08-03T14:05:50+08:00").getTime();
const now = Date.now();

function addedAt(path) {
  try {
    const value = execFileSync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%cI", "--", path],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim().split(/\r?\n/).filter(Boolean).at(-1);
    return value || null;
  } catch {
    return null;
  }
}

const records = [];
for (const lecture of lectures) {
  const path = `public/lectures/${lecture.subject}/${lecture.fileName}`;
  const publishedAt = addedAt(path);
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : 0;
  if (publishedTime <= automaticAnnouncementsSince || now - publishedTime >= sevenDays) continue;
  const slug = lecture.fileName.replace(/\.pdf$/i, "").toLowerCase();
  if (coveredLectureSlugs.has(slug)) continue;
  records.push({
    id: `lecture-${slug}-${publishedAt.slice(0, 10)}`,
    type: "lecture",
    title: `《${lecture.titleZh}》讲义新上架`,
    body: `${lecture.titleEn} · ${lecture.pages} 页`,
    publishedAt,
    href: `/lecture/${slug}/`,
  });
}

for (const tool of tools) {
  const publicPath = `public${tool.downloadPath}`;
  if (!existsSync(fileURLToPath(new URL(`../${publicPath}`, import.meta.url)))) continue;
  const publishedAt = addedAt(publicPath);
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : 0;
  if (publishedTime <= automaticAnnouncementsSince || now - publishedTime >= sevenDays) continue;
  records.push({
    id: `tool-${tool.slug}-${publishedAt.slice(0, 10)}`,
    type: "tool",
    title: `${tool.name} 工具新上架`,
    body: tool.subtitle,
    publishedAt,
    href: tool.openPath || `/tools/#${tool.slug}`,
  });
}

const templatePath = "public/downloads/rynotes_v2-template.zip";
if (existsSync(fileURLToPath(new URL(`../${templatePath}`, import.meta.url)))) {
  const publishedAt = addedAt(templatePath);
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : 0;
  if (publishedTime > automaticAnnouncementsSince && now - publishedTime < sevenDays) {
    records.push({
      id: `resource-rynotes-v2-${publishedAt.slice(0, 10)}`,
      type: "resource",
      title: "rynotes_v2 模板资源已上架跋页",
      body: "rynotes_v2 讲义模板的源代码、字体包、使用指南与效果示例现已上架跋页。Usage 提供模板使用说明，Demo 展示实际排版效果。",
      publishedAt,
      href: "/colophon/#rynotes-v2-template",
    });
  }
}

records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`Generated ${records.length} active announcements.`);
