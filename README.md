# 我的 GitHub 项目整理

把「Star 过的项目」和「自己名下的仓库」放进同一个工作台：自动分类、标出停更与归档、体检缺什么。

- 网页：**[index.html](index.html)**　双击即可打开，离线可用，支持搜索 / 分类筛选 / 排序 / 一键复制 Markdown
- 报告：**[仓库审计报告.md](仓库审计报告.md)**　可直接当待办清单
- 数据：`data/*.json`　每次抓取后覆盖

当前数据：**94 个 Star 项目 · 3 个我的仓库 · 17 种语言**（快照日期见页面右下角）。

> 新手先看 **[使用说明.txt](使用说明.txt)**（纯中文、一步一步写，没有命令）。
> 想在桌面放图标：把文件夹里的 `GitHub项目整理.lnk` 复制到桌面即可，双击就打开。

---

## 一眼看懂

| 文件 | 作用 |
|---|---|
| `index.html` | 生成的成品网页（自包含，别手动改，会被覆盖） |
| `template.html` | 网页模板，改样式 / 布局改这里 |
| `data/stars.json` | 抓取到的 Star 项目原始数据 |
| `data/repos.json` | 自己仓库的原始数据 + README/描述/许可证检查结果 |
| `data/profile.json` | 账号信息 |
| `scripts/fetch.mjs` | 抓数据（GitHub API） |
| `scripts/classify.mjs` | 自动分类（规则打分） |
| `scripts/audit-lib.mjs` | 体检规则（收藏卫生 + 仓库成熟度） |
| `scripts/build.mjs` | 生成 `index.html` |
| `scripts/report.mjs` | 生成 `仓库审计报告.md` |
| `scripts/review.mjs` | 命令行查看分类结果，调规则时用 |
| `config/categories.json` | 分类规则（关键词 / topics） |
| `config/overrides.json` | 人工指定分类，优先级最高 |
| `config/中文说明.json` | 页面「说明」列的中文翻译；新收藏的仓库在这里补一行即可 |
| `.github/workflows/sync.yml` | 推到 GitHub 后每天自动同步 |
| `更新.ps1` | Windows 一键更新 + 打开网页 |

---

## 日常使用

```powershell
# 更新数据 → 重新生成网页和报告
node scripts/fetch.mjs
node scripts/build.mjs
node scripts/report.mjs
```

Windows 也可以直接双击 **`更新.ps1`**（或右键 → 使用 PowerShell 运行）。

### 用 Token 提高额度（可选，但推荐）

匿名请求每小时只有 60 次，加了 Token 是 5000 次/小时，还能读到**私有仓库**和**私有 Star（如果你开了）**。

```powershell
$env:GITHUB_TOKEN = "ghp_你的token"   # 只勾 repo 权限即可
node scripts/fetch.mjs
```

Token 在 GitHub → Settings → Developer settings → Personal access tokens 里生成，别提交到仓库里。

### 换账号 / 多账号

```powershell
$env:GH_USER = "另一个用户名"
node scripts/fetch.mjs
```

---

## 放到 GitHub 上，每天自动更新

1. 在 GitHub 新建一个仓库（建议 `Public`，名字随意，比如 `my-github-library`）
2. 把这个文件夹推上去：

   ```powershell
   git init
   git add -A
   git commit -m "init: github 项目整理"
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```

3. 什么都不用配：`sync.yml` 用的 `GITHUB_TOKEN` 是 Actions 自动提供的，**每天北京时间 05:00 自动抓取并提交**
4. 想马上看效果：仓库 → Actions → 「同步 GitHub 项目整理」→ Run workflow
5. （可选）仓库 → Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`、目录 `/root`，之后就能用
   `https://<用户名>.github.io/<仓库名>/` 在手机上看这个页面

> 注意：仓库设为 Private 时，Pages 需要 Pro 才能用；纯自用的话本地打开 `index.html` 也一样。

---

## 改分类：两层机制

先看 `node scripts/review.mjs` 的输出（按分类列出全部项目），不合适的按下面两种方式改：

**① 临时覆盖单个项目** —— 改 `config/overrides.json`：

```json
{
  "owner/repo 全名": "life"
}
```

可用的 key：`agent`、`ai-infra`、`ai-app`、`desktop`、`dev-tool`、`selfhost`、`web`、`mobile`、`resource`、`media`、`hardware`、`life`、`other`
（想加分类：在 `config/categories.json` 里加一条，`overrides.json` 就能用新 key）

**② 调整整体规则** —— 改 `config/categories.json`：
- `topics` 命中算 3 分，名称/描述命中算 1 分，取最高分，同分时排在前面的分类优先
- 没命中任何规则时，按语言兜底（Kotlin/Dart/Swift → 移动端，HTML/JS/TS → Web）

改完重新 `node scripts/build.mjs` 即可，不用重新抓数据。

---

## 体检规则（`index.html` 的「体检建议」页）

**Star 收藏卫生**
- 已归档（作者自己点了 Archive）
- 超过 1 年没提交
- 没有仓库描述（以后想不起来是干嘛的）
- 疑似重复（同名不同语言版本，如 `xxx` 与 `xxx-zh`）
- 收藏的是 fork（会错过上游更新）

**我的仓库成熟度（满分 100）**
- 有描述 / 有 README / 有 LICENSE / 有 Topics / 填了主页 → 加分项
- 超过 180 天没提交、仓库体积 > 10 MB、仓库为空 → 扣分 + 给具体做法

评分规则在 `scripts/audit-lib.mjs`，想改阈值直接改。

---

## 常见问题

**Q：`fetch.mjs` 报 403 或超额度？**
A：匿名 60 次/小时用完了，等一小时或加 `GITHUB_TOKEN`。

**Q：为什么只有 3 个仓库？**
A：只统计**公开**仓库；私有仓库要加 Token 才会出现（脚本已支持）。

**Q：网页打开是空白？**
A：`index.html` 是构建产物，需要先跑 `node scripts/build.mjs`。也别用记事本改它，改 `template.html`。

**Q：能导出给别人看吗？**
A：`index.html` 是单文件自包含的，直接发给别人就能打开；里面不含任何 Token。
