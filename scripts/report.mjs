// 生成 仓库审计报告.md：可直接当待办清单用
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { starAudit, repoAudit, summarize } from "./audit-lib.mjs";
import { classify, freshness } from "./classify.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const profile = read("data/profile.json");
const stars = read("data/stars.json");
const repos = read("data/repos.json");
const now = Date.now();
const today = new Date(now).toISOString().slice(0, 10);

const audits = repos.map((r) => repoAudit(r, now)).sort((a, b) => a.score - b.score);
const stats = summarize(stars, repos, now);
const sAudit = starAudit(stars, now);
const catOf = (s) => classify(s).label;

const lvl = { high: "🔴 高", mid: "🟡 中", low: "🔵 低" };
const out = [];
const P = (s = "") => out.push(s);

P(`# GitHub 项目整理报告 · @${profile.login}`);
P("");
P(`> 生成时间：${today}　|　数据来源：GitHub API　|　重新生成：\`node scripts/fetch.mjs && node scripts/report.mjs\``);
P("");
P("## 一、总览");
P("");
P("| 指标 | 数值 |");
P("|---|---:|");
P(`| Star 项目 | ${stats.stars} |`);
P(`| 我名下的公开仓库 | ${stats.repos} |`);
P(`| 近 90 天有更新的收藏 | ${stats.active} |`);
P(`| 已被归档的收藏 | ${stats.archived} |`);
P(`| 超过 1 年未更新的收藏 | ${stats.stale} |`);
P(`| 涉及编程语言 | ${stats.languages} |`);
P("");

P("## 二、我的仓库：成熟度体检");
P("");
P("| 仓库 | 语言 | 星数 | 最近提交 | 成熟度 | 主要问题 |");
P("|---|---|---:|---|---:|---|");
for (const a of audits) {
  const top = a.issues.filter((i) => i.level !== "low").slice(0, 2).map((i) => i.title);
  P(`| [${a.repo.name}](${a.repo.html_url}) | ${a.repo.language || "—"} | ${a.repo.stars} | ${a.repo.pushed_at.slice(0, 10)}（${a.days} 天前） | ${a.score}/100 | ${top.length ? top.join("；") : "—"} |`);
}
P("");

for (const a of audits) {
  const r = a.repo;
  P(`### ${r.name}　\`${a.score}/100\``);
  P("");
  P(`- 链接：${r.html_url}`);
  P(`- 语言：${r.language || "未识别"}　星数：${r.stars}　体积：${r.size_kb} KB　最近提交：${r.pushed_at.slice(0, 10)}（${a.days} 天前 · ${freshness(r, now).state}）`);
  P(`- 描述：${r.description || "（空）"}`);
  P("");
  if (a.wins.length) {
    P(`**已经具备**：${a.wins.map((w) => `✅ ${w}`).join("　")}`);
    P("");
  }
  if (a.issues.length) {
    P("**待办（按优先级）**");
    P("");
    let i = 1;
    for (const issue of a.issues) {
      P(`${i++}. ${lvl[issue.level]} · **${issue.title}**`);
      P(`   - 怎么做：${issue.fix}`);
    }
    P("");
  } else {
    P("状态良好，没有需要处理的问题。");
    P("");
  }
}

P("## 三、Star 收藏体检");
P("");
if (!sAudit.length) {
  P("没有发现问题：没有归档、长期停更、重复收藏或缺描述的项目。");
} else {
  for (const a of sAudit) {
    P(`### ${lvl[a.level]} · ${a.tag}｜${a.title}`);
    P("");
    P(`- 涉及：${a.detail}`);
    P(`- 建议：${a.action}`);
    P("");
  }
}

P("## 四、收藏分布（按自动分类）");
P("");
const dist = {};
for (const s of stars) {
  const k = catOf(s);
  (dist[k] ||= []).push(s);
}
P("| 分类 | 数量 | 星数最高 |");
P("|---|---:|---|");
for (const [k, list] of Object.entries(dist).sort((a, b) => b[1].length - a[1].length)) {
  list.sort((x, y) => y.stars - x.stars);
  P(`| ${k} | ${list.length} | [${list[0].name}](${list[0].html_url})（${list[0].stars.toLocaleString("en-US")}★） |`);
}
P("");

P("## 五、下一周就能做完的清单");
P("");
P("- [ ] 给每个仓库补一句 About 描述（≤160 字，写清「是什么 + 解决什么」）");
P("- [ ] EgoFlow 补 README（结构：一句话介绍 / 截图 / 怎么跑 / 目录说明 / License）");
P("- [ ] 三个仓库统一加 MIT 许可证（GitHub 页面 Add file → Create new file → 输入 LICENSE 选模板）");
P("- [ ] 每个仓库加 3~8 个 Topics（语言、类型、领域各一个）");
P("- [ ] 长期不维护的仓库点 Archive，别让访客误以为还在更新");
P("- [ ] 把「Code-Upload-Assistant」这类小工具补一个用法动图或 gif，README 转化率会明显变好");
P("- [ ] 在主页固定（Pin）最想展示的 3~6 个仓库");
P("");
P("---");
P("");
P(`*本报告由脚本生成，数据快照：${today}。*`);

writeFileSync(join(ROOT, "仓库审计报告.md"), out.join("\n"));
console.log(`已生成 仓库审计报告.md：${audits.length} 个仓库、${sAudit.length} 条收藏建议`);
