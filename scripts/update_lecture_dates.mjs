import { execFileSync } from "node:child_process";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataPath = fileURLToPath(new URL("../src/data/lectures.json", import.meta.url));
const outputPath = fileURLToPath(new URL("../src/data/lecture-updates.json", import.meta.url));
const automaticUpdatesSince = "2026-08-03";
const lectures = JSON.parse(readFileSync(dataPath, "utf8"));
const updates = {};

for (const lecture of lectures) {
  const publicPath = `public/lectures/${lecture.subject}/${lecture.fileName}`;
  try {
    const status = execFileSync(
      "git",
      ["status", "--porcelain", "--", publicPath],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const date = status
      ? statSync(fileURLToPath(new URL(`../${publicPath}`, import.meta.url)))
          .mtime.toISOString().slice(0, 10)
      : execFileSync(
          "git",
          ["log", "-1", "--format=%cs", "--", publicPath],
          { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
        ).trim();
    if (date >= automaticUpdatesSince) updates[lecture.fileName] = date;
  } catch {
    // Keep the historical date when Git metadata is unavailable.
  }
}

writeFileSync(outputPath, `${JSON.stringify(updates, null, 2)}\n`, "utf8");
console.log(`Derived ${Object.keys(updates).length} lecture update dates from Git.`);
