// 生成 index.html（自包含，双击即可打开，无需联网）
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, CATEGORIES, freshness } from "./classify.mjs";
import { starAudit, repoAudit, summarize } from "./audit-lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const profile = read("data/profile.json");
const starsRaw = read("data/stars.json");
const reposRaw = read("data/repos.json");

const now = Date.now();

const stars = starsRaw.map((s) => {
  const c = classify(s);
  const f = freshness(s, now);
  return {
    full_name: s.full_name,
    name: s.name,
    owner: s.owner,
    description: s.description,
    language: s.language,
    stars: s.stars,
    topics: s.topics.slice(0, 5),
    pushed_at: s.pushed_at,
    archived: s.archived,
    url: s.html_url,
    cat: c.key,
    catLabel: c.label,
    fresh: f.state,
    freshLevel: f.level,
    days: f.days,
  };
});

const repos = reposRaw.map((r) => {
  const a = repoAudit(r, now);
  return {
    full_name: r.full_name,
    name: r.name,
    description: r.description,
    language: r.language,
    stars: r.stars,
    pushed_at: r.pushed_at,
    url: r.html_url,
    days: a.days,
    score: a.score,
    issues: a.issues,
    wins: a.wins,
    fresh: freshness(r, now).state,
    freshLevel: freshness(r, now).level,
  };
});

const catCounts = Object.fromEntries(CATEGORIES.map((c) => [c.key, 0]));
for (const s of stars) catCounts[s.cat] = (catCounts[s.cat] || 0) + 1;

const payload = {
  profile,
  stars,
  repos,
  categories: CATEGORIES.map((c) => ({ ...c, count: catCounts[c.key] || 0 })).filter((c) => c.count > 0),
  auditStars: starAudit(starsRaw, now),
  stats: summarize(starsRaw, reposRaw, now),
  generatedAt: new Date().toISOString(),
  dataDate: (profile.fetched_at || new Date().toISOString()).slice(0, 10),
};

const tpl = readFileSync(join(ROOT, "template.html"), "utf8");
const json = JSON.stringify(payload)
  .replace(/<\/script/gi, "<\\/script")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");
const html = tpl.replace("/*__PAYLOAD__*/", json);
writeFileSync(join(ROOT, "index.html"), html);
console.log(`已生成 index.html：${stars.length} 个 Star、${repos.length} 个我的仓库、${payload.auditStars.length} 条体检建议`);
