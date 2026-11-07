// 体检逻辑：Star 项目的“收藏卫生” + 自己仓库的“开源成熟度”
// 被 build.mjs（生成网页）和 audit.mjs（生成 Markdown 报告）共用

const DAY = 86400000;
const days = (iso, now) => Math.floor((now - new Date(iso).getTime()) / DAY);

export function starAudit(stars, now = Date.now()) {
  const items = [];
  const archived = stars.filter((s) => s.archived);
  const stale = stars.filter((s) => !s.archived && days(s.pushed_at, now) > 365);
  const noDesc = stars.filter((s) => !s.description);

  if (archived.length) {
    items.push({
      level: "mid",
      tag: "已归档",
      title: `${archived.length} 个收藏已被作者归档`,
      detail: archived.map((s) => s.full_name).join("、"),
      action: "归档项目不会再更新。若只是当资料参考可以留着，否则取消收藏能让列表更干净。",
    });
  }
  if (stale.length) {
    items.push({
      level: "mid",
      tag: "超一年未更新",
      title: `${stale.length} 个收藏超过 1 年没有提交`,
      detail: stale.map((s) => `${s.full_name}（${days(s.pushed_at, now)} 天）`).join("、"),
      action: "先确认有没有活跃的 fork 或替代品；确实不需要的可以移除，避免以后照着重装踩坑。",
    });
  }
  if (noDesc.length) {
    items.push({
      level: "low",
      tag: "缺少描述",
      title: `${noDesc.length} 个收藏没有仓库描述`,
      detail: noDesc.map((s) => s.full_name).join("、"),
      action: "这类项目以后很难凭记忆想起用途，建议在整理时就近记一句备注（或改到自己的笔记里）。",
    });
  }

  // 疑似重复：同一项目的中英文版 / 兄弟仓库
  const norm = (s) => s.toLowerCase().replace(/-(zh|cn|en|tw|hk|2|3)$/g, "");
  const buckets = {};
  for (const s of stars) (buckets[norm(s.full_name.split("/")[1])] ||= []).push(s);
  const dup = Object.values(buckets).filter((g) => g.length > 1);
  if (dup.length) {
    items.push({
      level: "low",
      tag: "疑似重复",
      title: `${dup.length} 组收藏看起来是同一个项目的不同版本`,
      detail: dup.map((g) => g.map((s) => s.full_name).join(" / ")).join("；"),
      action: "留一个主仓库即可，另一个放进备注或取消收藏。",
    });
  }

  const forks = stars.filter((s) => s.is_fork);
  if (forks.length) {
    items.push({
      level: "low",
      tag: "fork 仓库",
      title: `${forks.length} 个收藏是 fork`,
      detail: forks.map((s) => s.full_name).join("、"),
      action: "收藏 fork 容易错过上游更新，建议改收藏源仓库。",
    });
  }

  return items;
}

const DESC_HINT = {
  default: "用一句话写清「它是什么 + 解决什么问题 + 给谁用」，例如：自动把本地代码推送到 GitHub 的小工具，适合不想手动敲 git 命令的人。",
};

export function repoAudit(repo, now = Date.now()) {
  const d = days(repo.pushed_at, now);
  const issues = [];
  const wins = [];

  if (!repo.has_description)
    issues.push({
      key: "desc",
      level: "high",
      title: "没有仓库描述",
      fix: "在仓库页右上角 About 里补一句描述（≤160 字），它会出现在搜索结果和你的主页上。",
    });
  else wins.push("有仓库描述");

  if (!repo.has_readme)
    issues.push({
      key: "readme",
      level: "high",
      title: "没有 README",
      fix: "README 至少写：这是什么 / 怎么跑起来 / 截图或示例 / 目录结构。可以复制别的项目当模板。",
    });
  else wins.push("有 README");

  if (!repo.has_license)
    issues.push({
      key: "license",
      level: "mid",
      title: "没有开源许可证",
      fix: "没有 LICENSE 时，别人在法律上不能复用你的代码。个人项目建议直接加 MIT（GitHub 新建文件时可选模板）。",
    });
  else wins.push(`许可证 ${repo.license}`);

  if (!repo.has_topics)
    issues.push({
      key: "topics",
      level: "mid",
      title: "没有 Topics 标签",
      fix: "加 3~8 个 topics（如 python、cli、tool），能显著提高被搜到的概率，也方便自己归类。",
    });
  else wins.push("有 Topics");

  if (!repo.homepage)
    issues.push({
      key: "homepage",
      level: "low",
      title: "没填主页 / 演示链接",
      fix: "有在线演示或文档就填进 About 的 Website；没有可以把 Releases 页或截图链接放上。",
    });

  if (d > 180)
    issues.push({
      key: "stale",
      level: "mid",
      title: `已经 ${d} 天没有提交`,
      fix: "二选一：① 继续做，先补个 TODO 列表；② 确认不做了就点 Archive（存档后仍可读，且不会被误认为在维护）。",
    });

  if (repo.size_kb === 0) issues.push({ key: "empty", level: "high", title: "仓库看起来是空的", fix: "至少补一个 README 并提交。" });

  if (repo.size_kb > 10240)
    issues.push({
      key: "size",
      level: "mid",
      title: `仓库体积 ${(repo.size_kb / 1024).toFixed(0)} MB，偏大`,
      fix: "把构建产物、视频、数据集移出版本库（用 .gitignore），大文件放 Releases 或网盘，否则 clone 会很慢。",
    });

  const score = Math.max(0, 100 - issues.reduce((a, i) => a + (i.level === "high" ? 25 : i.level === "mid" ? 12 : 5), 0));
  return { repo, days: d, issues, wins, score };
}

export function summarize(stars, repos, now = Date.now()) {
  const active = stars.filter((s) => !s.archived && days(s.pushed_at, now) <= 90).length;
  return {
    stars: stars.length,
    repos: repos.length,
    active,
    archived: stars.filter((s) => s.archived).length,
    stale: stars.filter((s) => !s.archived && days(s.pushed_at, now) > 365).length,
    languages: new Set(stars.map((s) => s.language).filter(Boolean)).size,
  };
}
