# -*- coding: utf-8 -*-
"""把新收藏的仓库说明自动翻成中文。

只处理「人工翻译表里没有、自动翻译表里也没有」的条目，结果写入
config/中文说明.auto.json，页面会标注「机翻」。
人工翻译（config/中文说明.json）永远优先，不会被覆盖。

用法：
  python scripts/translate.py            # 翻译所有缺的（每次最多 60 条）
  python scripts/translate.py --limit 10 # 只翻 10 条
  python scripts/translate.py --test owner/repo   # 只试翻一条，不写文件
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STARS = os.path.join(ROOT, "data", "stars.json")
MANUAL = os.path.join(ROOT, "config", "中文说明.json")
AUTO = os.path.join(ROOT, "config", "中文说明.auto.json")
PROXY = "http://127.0.0.1:7890"

CJK = re.compile(r"[\u4e00-\u9fa5]")

try:  # 让中文在 Windows 控制台正常显示
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def load(path, default):
    try:
        with open(path, encoding="utf-8-sig") as f:
            return json.load(f)
    except Exception:
        return default


def http_get(url, timeout=15):
    """先直连，失败再走本机 Clash 代理。"""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "ignore")
    except Exception:
        handler = urllib.request.ProxyHandler({"http": PROXY, "https": PROXY})
        opener = urllib.request.build_opener(handler)
        return opener.open(req, timeout=timeout).read().decode("utf-8", "ignore")


def translate_google(text):
    url = (
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q="
        + urllib.parse.quote(text[:1800])
    )
    data = json.loads(http_get(url))
    parts = [seg[0] for seg in data[0] if seg and seg[0]]
    out = "".join(parts).strip()
    return out or None


def translate_mymemory(text):
    url = (
        "https://api.mymemory.translated.net/get?q="
        + urllib.parse.quote(text[:480])
        + "&langpair=en|zh-CN"
    )
    data = json.loads(http_get(url))
    out = (data.get("responseData") or {}).get("translatedText") or ""
    out = out.strip()
    return out or None


def translate(text):
    for fn in (translate_google, translate_mymemory):
        for _ in range(2):
            try:
                out = fn(text)
                if out and CJK.search(out):
                    return out
            except Exception:
                time.sleep(0.5)
    return None


def clean(text):
    text = re.sub(r"https?://\S+", "", text or "")
    text = re.sub(r":[a-z0-9_+-]+:", " ", text)  # 去掉 :trollface: 这类表情代码
    text = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", text)  # emoji
    text = re.sub(r"\s+", " ", text).strip()
    return text


def main():
    argv = sys.argv[1:]
    limit = 60
    test_repo = None
    for i, a in enumerate(argv):
        if a == "--limit" and i + 1 < len(argv):
            limit = int(argv[i + 1])
        if a == "--test" and i + 1 < len(argv):
            test_repo = argv[i + 1]

    stars = load(STARS, [])
    manual = load(MANUAL, {})
    auto = load(AUTO, {})
    if not isinstance(auto, dict):
        auto = {}
    auto = {k: v for k, v in auto.items() if not k.startswith("_")}

    def need(r):
        name = r.get("full_name")
        desc = clean(r.get("description"))
        if not name or not desc:
            return False
        if name in manual or name in auto:
            return False
        if CJK.search(desc):
            return False
        return True

    todo = [r for r in stars if need(r)]

    if test_repo:
        target = next((r for r in stars if r.get("full_name") == test_repo), None)
        if not target:
            print("找不到仓库：", test_repo)
            return 1
        src = clean(target.get("description"))
        print("原文：", src)
        print("译文：", translate(src))
        return 0

    if not todo:
        print("没有需要翻译的新收藏。")
        return 0

    todo = todo[:limit]
    print(f"待翻译 {len(todo)} 条，开始…")
    done = 0
    for r in todo:
        name = r["full_name"]
        desc = clean(r.get("description"))
        out = translate(desc)
        if out:
            auto[name] = out
            done += 1
            print(f"  ✓ {name}")
        else:
            print(f"  ✗ {name}（翻译失败，下次再试）")
        time.sleep(0.35)

    payload = {"_说明": "由 scripts/translate.py 自动生成，可整篇删除后重跑。人工翻译见 中文说明.json。", **dict(sorted(auto.items()))}
    with open(AUTO, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"完成：新翻译 {done} 条，累计自动翻译 {len(auto)} 条 → config/中文说明.auto.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
