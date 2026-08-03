// Fetch lecture-message issues from the GitHub API and write a static snapshot
// (public/lecture-messages.json) that the site serves. The message board reads
// this snapshot instead of calling the GitHub API from each visitor's browser,
// so it always loads same-origin — no CORS, no per-IP rate limit, no dependence
// on a visitor's ability to reach api.github.com.
//
// Runs in `prebuild`: GitHub Actions supplies GITHUB_TOKEN (higher rate limit);
// local builds without one fall back to the unauthenticated endpoint. On any
// fetch failure the previous snapshot is kept so the board never goes stale.
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const output = new URL("../public/lecture-messages.json", import.meta.url);
const issuesEndpoint =
  "https://api.github.com/repos/RongYu221104/RongYu221104.github.io/issues?state=all&per_page=100&sort=created&direction=desc";

async function fetchIssues() {
  const token = process.env.GITHUB_TOKEN;
  const response = await fetch(issuesEndpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

function toSnapshot(issues) {
  return {
    savedAt: new Date().toISOString(),
    issues: issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? null,
        created_at: issue.created_at,
        html_url: issue.html_url,
        state: issue.state === "closed" ? "closed" : "open",
      })),
  };
}

async function main() {
  const outputPath = fileURLToPath(output);
  try {
    const snapshot = toSnapshot(await fetchIssues());
    writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    console.log(`lecture messages: wrote ${snapshot.issues.length} issues to public/lecture-messages.json`);
  } catch (error) {
    if (existsSync(outputPath)) {
      console.warn(`lecture messages: fetch failed (${error.message}); keeping existing snapshot.`);
    } else {
      writeFileSync(outputPath, `${JSON.stringify({ savedAt: "", issues: [] }, null, 2)}\n`, "utf8");
      console.warn(`lecture messages: fetch failed (${error.message}); wrote empty snapshot.`);
    }
  }
}

main();
