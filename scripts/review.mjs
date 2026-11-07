// 查看分类结果，方便调规则：node scripts/review.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, CATEGORIES, freshness } from "./classify.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const stars = JSON.parse(readFileSync(join(ROOT, "data", "stars.json"), "utf8"));

const group = Object.fromEntries(CATEGORIES.map((c) => [c.key, []]));
for (const s of stars) group[classify(s).key].push(s);

for (const c of CATEGORIES) {
  const items = group[c.key].sort((a, b) => b.stars - a.stars);
  if (!items.length) continue;
  console.log(`\n### ${c.label}（${items.length}）`);
  for (const s of items) {
    const f = freshness(s);
    console.log(`  ${String(s.stars).padStart(7)} ${(s.language || "—").padEnd(10)} ${f.state.padEnd(3)} ${s.full_name.padEnd(44)} ${(s.description || "（无描述）").slice(0, 40)}`);
  }
}
