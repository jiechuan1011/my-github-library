// 把仓库归类：先看 config/overrides.json 的人工指定，再按 config/categories.json 打分
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(readFileSync(join(ROOT, "config", "categories.json"), "utf8"));
let overrides = {};
try {
  overrides = JSON.parse(readFileSync(join(ROOT, "config", "overrides.json"), "utf8"));
} catch {
  overrides = {};
}
const LABEL = Object.fromEntries(cfg.categories.map((c) => [c.key, c.label]));
const ORDER = cfg.categories.map((c) => c.key);

export function classify(repo) {
  const override = overrides[repo.full_name];
  if (override && LABEL[override]) return { key: override, label: LABEL[override], score: 99 };

  const topics = (repo.topics || []).map((t) => String(t).toLowerCase());
  const text = [repo.description || "", repo.name || "", topics.join(" ")].join(" ").toLowerCase();

  let best = { key: "other", label: LABEL.other, score: 0 };
  for (const c of cfg.categories) {
    let score = 0;
    for (const k of c.topics || []) if (topics.includes(k)) score += 3;
    for (const k of c.text || []) if (text.includes(k)) score += 1;
    if (score > best.score) best = { key: c.key, label: c.label, score };
  }

  // 没有命中任何规则时，用语言兜底
  if (best.score === 0) {
    const lang = (repo.language || "").toLowerCase();
    if (["kotlin", "dart", "swift"].includes(lang)) return { key: "mobile", label: LABEL.mobile, score: 0 };
    if (["html", "css", "javascript", "typescript", "vue"].includes(lang))
      return { key: "web", label: LABEL.web, score: 0 };
    if (["c", "c++", "c#", "rust"].includes(lang) && /esp|iot|hardware/.test(text))
      return { key: "hardware", label: LABEL.hardware, score: 0 };
  }
  return best;
}

export const CATEGORIES = ORDER.map((k) => ({ key: k, label: LABEL[k] }));

/** 维护状态：最近提交距今多久 */
export function freshness(repo, now = Date.now()) {
  const days = Math.floor((now - new Date(repo.pushed_at).getTime()) / 86400000);
  if (repo.archived) return { days, state: "已归档", level: "dead" };
  if (days <= 90) return { days, state: "活跃", level: "ok" };
  if (days <= 365) return { days, state: "缓慢", level: "warn" };
  return { days, state: "停更", level: "dead" };
}
