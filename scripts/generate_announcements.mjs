import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const lectures = JSON.parse(readFileSync(new URL("../src/data/lectures.json", import.meta.url), "utf8"));
const tools = JSON.parse(readFileSync(new URL("../src/data/tools.json", import.meta.url), "utf8"));
const output = new URL("../src/data/generated-announcements.json", import.meta.url);
const sevenDays = 7 * 24 * 60 * 60 * 1000;
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
  if (!publishedAt || now - new Date(publishedAt).getTime() >= sevenDays) continue;
  const slug = lecture.fileName.replace(/\.pdf$/i, "").toLowerCase();
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
  if (!publishedAt || now - new Date(publishedAt).getTime() >= sevenDays) continue;
  records.push({
    id: `tool-${tool.slug}-${publishedAt.slice(0, 10)}`,
    type: "tool",
    title: `${tool.name} 工具新上架`,
    body: tool.subtitle,
    publishedAt,
    href: tool.openPath || `/tools/#${tool.slug}`,
  });
}

records.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`Generated ${records.length} active announcements.`);
