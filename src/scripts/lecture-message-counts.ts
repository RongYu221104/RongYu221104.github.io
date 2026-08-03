const issueEndpoint =
  "https://api.github.com/repos/RongYu221104/RongYu221104.github.io/issues?state=all&per_page=100&sort=created&direction=desc";
const cacheKey = "rongyu-lecture-messages-v1";
const cacheLifetime = 2 * 60 * 1000;
const markerPattern = /<!--\s*rongyu-lecture-message:([^\s]+)\s*-->/;

export interface LectureMessageMetadata {
  version: 1;
  lecture: string;
  author: string;
  needsResolution: boolean;
}

export interface LectureMessageIssue {
  body: string | null;
  created_at: string;
  html_url: string;
  number: number;
  pull_request?: unknown;
  state: "open" | "closed";
  title: string;
}

interface CachedIssues {
  savedAt: number;
  issues: LectureMessageIssue[];
}

let issueRequest: Promise<LectureMessageIssue[]> | undefined;

export function parseLectureMessage(body: string | null): LectureMessageMetadata | null {
  const encoded = body?.match(markerPattern)?.[1];
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<LectureMessageMetadata>;
    if (
      parsed.version !== 1 ||
      typeof parsed.lecture !== "string" ||
      typeof parsed.author !== "string" ||
      typeof parsed.needsResolution !== "boolean"
    ) {
      return null;
    }
    return parsed as LectureMessageMetadata;
  } catch {
    return null;
  }
}

function readCache(): LectureMessageIssue[] | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) ?? "null") as CachedIssues | null;
    if (!cached || Date.now() - cached.savedAt > cacheLifetime) return null;
    return cached.issues;
  } catch {
    return null;
  }
}

function writeCache(issues: LectureMessageIssue[]) {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), issues }));
  } catch {
    // Browsers with storage disabled can still read directly from GitHub.
  }
}

export function fetchLectureMessageIssues(): Promise<LectureMessageIssue[]> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (issueRequest) return issueRequest;
  issueRequest = fetch(issueEndpoint, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      return response.json() as Promise<LectureMessageIssue[]>;
    })
    .then((issues) => {
      const filtered = issues.filter((issue) => !issue.pull_request);
      writeCache(filtered);
      return filtered;
    })
    .finally(() => {
      issueRequest = undefined;
    });
  return issueRequest;
}

async function updateMessageCounts() {
  const badges = Array.from(
    document.querySelectorAll<HTMLElement>("[data-message-count]"),
  ).filter((badge) => badge.closest<HTMLElement>("[data-message-slug]")?.dataset.messageSlug);
  if (badges.length === 0) return;

  try {
    const issues = await fetchLectureMessageIssues();
    const counts = new Map<string, number>();
    issues.forEach((issue) => {
      const message = parseLectureMessage(issue.body);
      if (!message?.needsResolution || issue.state !== "open") return;
      counts.set(message.lecture, (counts.get(message.lecture) ?? 0) + 1);
    });
    badges.forEach((badge) => {
      const link = badge.closest<HTMLElement>("[data-message-slug]");
      const count = counts.get(link?.dataset.messageSlug ?? "") ?? 0;
      badge.textContent = count > 99 ? "99+" : String(count);
      badge.hidden = count === 0;
      if (link) {
        link.setAttribute(
          "aria-label",
          count > 0
            ? `${link.getAttribute("aria-label")?.replace(/，有 \d+ 条未解决$/, "")}，有 ${count} 条未解决`
            : link.getAttribute("aria-label")?.replace(/，有 \d+ 条未解决$/, "") ?? "留言板",
        );
      }
    });
  } catch {
    badges.forEach((badge) => {
      badge.hidden = true;
    });
  }
}

updateMessageCounts();
document.addEventListener("astro:page-load", updateMessageCounts);
document.addEventListener("lecture-message-ready", updateMessageCounts);
