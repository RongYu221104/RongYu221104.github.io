import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lectures = JSON.parse(readFileSync(new URL("../src/data/lectures.json", import.meta.url), "utf8"));
const tracks = JSON.parse(readFileSync(new URL("../src/data/tracks.json", import.meta.url), "utf8"));
const tools = JSON.parse(readFileSync(new URL("../src/data/tools.json", import.meta.url), "utf8"));
const output = new URL("../src/data/generated-announcements.json", import.meta.url);

// Lectures whose slugs are already linked from a curated announcement are
// covered by that curated announcement and must not also get an automatic one.
// Curated records are never deleted (retired ones keep their `archivedAt`),
// so this exclusion stays correct permanently.
const manualRecords = JSON.parse(readFileSync(new URL("../src/data/manual-announcements.json", import.meta.url), "utf8"));
const coveredLectureSlugs = new Set();
for (const manual of manualRecords) {
  for (const link of manual.links ?? []) {
    const match = String(link.href).match(/^\/lecture\/([^/]+)\//);
    if (match) coveredLectureSlugs.add(match[1]);
  }
}

// Only resources added at or after this moment have ever been announced. All
// records since then are emitted permanently (expired ones included) so the
// runtime can move them into the archive instead of deleting them.
const automaticAnnouncementsSince = new Date("2026-08-03T14:05:50+08:00").getTime();

// Legacy helper for assets that remain inside the website repository (tools
// and the rynotes_v2 template). Media in the asset repositories is handled by
// explicit `publishedAt` metadata instead of Git history.
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

function announcedAt(publishedAt) {
  const time = publishedAt ? new Date(publishedAt).getTime() : 0;
  return time > automaticAnnouncementsSince ? publishedAt : null;
}

const records = [];

for (const lecture of lectures) {
  const publishedAt = announcedAt(lecture.publishedAt);
  if (!publishedAt) continue;
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
  const publishedAt = announcedAt(addedAt(publicPath));
  if (!publishedAt) continue;
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
  const publishedAt = announcedAt(addedAt(templatePath));
  if (publishedAt) {
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

// Music: one announcement per track whose explicit `publishedAt` is after the
// cutover. Titles and artists come from tracks.json so announcement text stays
// accurate; tracks without a publishedAt are never announced.
for (const track of tracks) {
  const publishedAt = announcedAt(track.publishedAt);
  if (!publishedAt) continue;
  const audioFile = String(track.audio).split("/").pop() || "";
  const slug = audioFile.replace(/\.mp3$/i, "").toLowerCase();
  records.push({
    id: `music-${slug}-${publishedAt.slice(0, 10)}`,
    type: "music",
    title: `《${track.title}》新曲上架`,
    body: `${track.artist} · ${track.album}`,
    publishedAt,
  });
}

records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`, "utf8");
const activeCount = records.length;
console.log(`Generated ${activeCount} announcements (all since cutover, archived at runtime).`);
