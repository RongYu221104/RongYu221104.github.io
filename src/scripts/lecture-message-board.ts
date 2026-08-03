import {
  fetchLectureMessageIssues,
  parseLectureMessage,
  type LectureMessageIssue,
} from "./lecture-message-counts";

const issueCreateUrl = "https://github.com/RongYu221104/RongYu221104.github.io/issues/new";
const bodyPattern = /## 留言正文\s*\n([\s\S]*?)\n\s*<!-- rongyu-lecture-message-end -->/;

function messageBody(issue: LectureMessageIssue) {
  return issue.body?.match(bodyPattern)?.[1]?.trim() || "（正文未能读取）";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function renderMessages(board: HTMLElement, issues: LectureMessageIssue[]) {
  const slug = board.dataset.lectureSlug ?? "";
  const list = board.querySelector<HTMLElement>("[data-message-list]");
  const total = board.querySelector<HTMLElement>("[data-board-total]");
  const unresolved = board.querySelector<HTMLElement>("[data-board-unresolved]");
  if (!list || !total || !unresolved) return;

  const messages = issues
    .map((issue) => ({ issue, metadata: parseLectureMessage(issue.body) }))
    .filter(({ metadata }) => metadata?.lecture === slug);
  const unresolvedCount = messages.filter(
    ({ issue, metadata }) => metadata?.needsResolution && issue.state === "open",
  ).length;
  unresolved.textContent = String(unresolvedCount);
  total.textContent = `${messages.length} tracks`;
  list.replaceChildren();

  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "message-list__empty";
    empty.textContent = "还没有留言。第一条唱针落下的位置留给你。";
    list.append(empty);
    return;
  }

  messages.forEach(({ issue, metadata }, index) => {
    const article = document.createElement("article");
    article.className = "message-card";
    const number = document.createElement("span");
    number.className = "message-card__number";
    number.textContent = `NO.${String(index + 1).padStart(2, "0")}`;
    const copy = document.createElement("div");
    copy.className = "message-card__copy";
    const header = document.createElement("header");
    const author = document.createElement("strong");
    author.textContent = metadata?.author || "匿名读者";
    const date = document.createElement("time");
    date.dateTime = issue.created_at;
    date.textContent = formatDate(issue.created_at);
    header.append(author, date);
    const body = document.createElement("p");
    body.textContent = messageBody(issue);
    copy.append(header, body);

    const status = document.createElement("a");
    status.className = "message-card__status";
    status.href = issue.html_url;
    status.target = "_blank";
    status.rel = "noreferrer";
    if (!metadata?.needsResolution) {
      status.dataset.state = "note";
      status.textContent = "普通留言";
    } else if (issue.state === "closed") {
      status.dataset.state = "resolved";
      status.textContent = "已解决";
    } else {
      status.dataset.state = "open";
      status.textContent = "未解决";
    }
    status.title = "在 GitHub 查看这条留言";
    article.append(number, copy, status);
    list.append(article);
  });
}

async function initialiseMessageBoard() {
  const board = document.querySelector<HTMLElement>("[data-message-board]");
  if (!board || board.dataset.initialised === "true") return;
  board.dataset.initialised = "true";
  const list = board.querySelector<HTMLElement>("[data-message-list]");
  try {
    renderMessages(board, await fetchLectureMessageIssues());
  } catch {
    if (list) list.innerHTML = '<p class="message-list__empty">留言暂时无法读取，请稍后刷新。</p>';
  }

  const form = board.querySelector<HTMLFormElement>("[data-message-form]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const author = form.querySelector<HTMLInputElement>("[data-message-author]")?.value.trim() ?? "";
    const body = form.querySelector<HTMLTextAreaElement>("[data-message-body]")?.value.trim() ?? "";
    const needsResolution = form.querySelector<HTMLInputElement>("[data-message-needs-resolution]")?.checked ?? false;
    const status = form.querySelector<HTMLElement>("[data-message-form-status]");
    if (!author || !body) return;
    const slug = board.dataset.lectureSlug ?? "lecture";
    const title = board.dataset.lectureTitle ?? "讲义";
    const metadata = encodeURIComponent(JSON.stringify({ version: 1, lecture: slug, author, needsResolution }));
    const issueBody = `<!-- rongyu-lecture-message:${metadata} -->\n\n## 留言者\n${author}\n\n## 留言正文\n${body}\n\n<!-- rongyu-lecture-message-end -->\n\n---\n[返回《${title}》留言板](${window.location.href})`;
    const params = new URLSearchParams({
      title: `[留言板:${slug}] ${needsResolution ? "待解决" : "留言"} · ${author}`,
      body: issueBody,
    });
    window.open(`${issueCreateUrl}?${params}`, "_blank", "noopener,noreferrer");
    if (status) status.textContent = "GitHub 发布页已打开，确认后即可提交。";
  });
}

initialiseMessageBoard();
document.addEventListener("astro:page-load", initialiseMessageBoard);
