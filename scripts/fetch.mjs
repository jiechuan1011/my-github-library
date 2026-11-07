// 拉取 GitHub 账号的 Star 项目 + 自己的仓库，输出 data/*.json
// 用法：
//   node scripts/fetch.mjs                     # 默认读 GH_USER 或 config
//   GITHUB_TOKEN=ghp_xxx node scripts/fetch.mjs   # 有 Token 可拉满 5000 次/小时，并包含私有仓库
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OWNER = process.env.GH_USER || "jiechuan1011";
const TOKEN = process.env.GITHUB_TOKEN || "";

const HEADERS = {
  "User-Agent": "github-project-organizer",
  Accept: "application/vnd.github+json",
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

const api = async (path) => {
  const res = await fetch("https://api.github.com" + path, { headers: HEADERS });
  const remaining = res.headers.get("x-ratelimit-remaining");
  if (res.status === 404) return { data: null, remaining };
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return { data: await res.json(), remaining };
};

const lastPage = (link) => {
  const m = /[?&]page=(\d+)>; rel="last"/.exec(link || "");
  return m ? Number(m[1]) : null;
};

const compact = (r) => ({
  full_name: r.full_name,
  name: r.name,
  owner: r.owner?.login,
  description: r.description || "",
  language: r.language || "",
  stars: r.stargazers_count ?? 0,
  forks: r.forks_count ?? 0,
  topics: r.topics || [],
  pushed_at: r.pushed_at,
  created_at: r.created_at,
  html_url: r.html_url,
  homepage: r.homepage || "",
  archived: !!r.archived,
  is_fork: !!r.fork,
  license: r.license?.spdx_id || "",
  size_kb: r.size ?? 0,
  open_issues: r.open_issues_count ?? 0,
});

async function main() {
  mkdirSync(DATA, { recursive: true });

  console.log(`账号：${OWNER}${TOKEN ? "（已带 Token）" : "（匿名请求，60 次/小时）"}`);

  // 1) 个人资料
  const { data: profile } = await api(`/users/${OWNER}`);
  if (!profile) throw new Error(`找不到用户 ${OWNER}`);
  writeFileSync(
    join(DATA, "profile.json"),
    JSON.stringify(
      {
        login: profile.login,
        name: profile.name || "",
        bio: profile.bio || "",
        avatar: profile.avatar_url,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        html_url: profile.html_url,
        fetched_at: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`公开仓库 ${profile.public_repos} 个，关注者 ${profile.followers}`);

  // 2) 自己的仓库（含 README 是否存在，用于审计）
  const { data: repos } = await api(
    `/users/${OWNER}/repos?per_page=100&sort=pushed&direction=desc`
  );
  const myRepos = [];
  for (const r of repos || []) {
    const { data: readme } = await api(`/repos/${r.full_name}/readme`);
    const item = compact(r);
    item.has_readme = !!readme;
    item.has_description = !!r.description;
    item.has_license = !!r.license;
    item.has_topics = (r.topics || []).length > 0;
    myRepos.push(item);
    console.log(`  · ${r.name}  README:${item.has_readme ? "有" : "无"}  描述:${item.has_description ? "有" : "无"}`);
  }
  writeFileSync(join(DATA, "repos.json"), JSON.stringify(myRepos, null, 2));

  // 3) Star 过的项目（逐页拉取）
  const stars = [];
  let page = 1;
  let total = null;
  while (page <= 20) {
    const { data, remaining } = await api(`/users/${OWNER}/starred?per_page=100&page=${page}`);
    if (!data || data.length === 0) break;
    total = total ?? null;
    for (const r of data) stars.push(compact(r));
    if (process.env.VERBOSE) console.log(`  · 第 ${page} 页：${data.length} 条，剩余配额 ${remaining}`);
    if (data.length < 100) break;
    page++;
  }
  writeFileSync(join(DATA, "stars.json"), JSON.stringify(stars, null, 2));
  console.log(`Star 项目：${stars.length} 个`);

  // 4) 简要统计，方便一眼看结果
  const byLang = {};
  for (const s of stars) {
    const k = s.language || "未标注";
    byLang[k] = (byLang[k] || 0) + 1;
  }
  const top = [...stars].sort((a, b) => b.stars - a.stars).slice(0, 10);
  console.log("\n语言分布：", Object.entries(byLang).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}`).join("  "));
  console.log("星数最高的 10 个收藏：");
  for (const s of top) console.log(`  ${String(s.stars).padStart(7)}  ${s.full_name}  ${s.description.slice(0, 46)}`);
  console.log("\n已写入 data/profile.json、data/repos.json、data/stars.json");
}

main().catch((e) => {
  console.error("失败：", e.message);
  process.exit(1);
});
