"""开放教育资源聚合检索。

只接入开放许可 / 公共领域来源，不抓取版权教材平台：
- Wikimedia Commons：开放版权图片
- Openverse：CC 授权图片
- Internet Archive：公共领域文本与教材

外部站点不可达时由前端回退到内置图示，不影响课堂使用。
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_TTL = 600
USER_AGENT = "XiangkeOer/1.0 (teaching demo; contact: local)"
BASE_DIR = Path(__file__).resolve().parent
INDEX_PATH = BASE_DIR / "data" / "oer_index.json"
ASSET_DIR = BASE_DIR / "assets" / "oer"


def load_index() -> list[dict[str, Any]]:
    try:
        data = json.loads(INDEX_PATH.read_text("utf-8"))
        return data.get("items") or []
    except Exception:  # noqa: BLE001 - 索引缺失时返回空列表
        return []


def _score(item: dict[str, Any], query: str) -> int:
    lowered = query.lower().strip()
    if not lowered:
        return 0
    haystack = " ".join(
        [
            str(item.get("title") or ""),
            " ".join(item.get("keywords") or []),
            str(item.get("source") or ""),
        ]
    ).lower()
    if lowered in haystack:
        return 10 + haystack.count(lowered)
    tokens = [token for token in re.split(r"[\s,，/、]+", lowered) if token]
    return sum(3 for token in tokens if token in haystack)


def hot_resources(limit: int = 8) -> list[dict[str, Any]]:
    return load_index()[: max(1, min(limit, 12))]


def search_local(query: str, limit: int = 8) -> list[dict[str, Any]]:
    items = load_index()
    if not query.strip():
        return hot_resources(limit)
    scored = [(_score(item, query), index, item) for index, item in enumerate(items)]
    matched = [entry for entry in scored if entry[0] > 0]
    matched.sort(key=lambda entry: (-entry[0], entry[1]))
    return [entry[2] for entry in matched][: max(1, min(limit, 12))]


def _fetch_json(url: str, timeout: float = 4.0) -> Any:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", "replace"))


def _plain(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").strip()


def _search_commons(query: str, limit: int) -> list[dict[str, Any]]:
    search = urllib.parse.quote(f"filetype:bitmap {query}")
    url = (
        "https://commons.wikimedia.org/w/api.php?action=query&format=json"
        f"&generator=search&gsrsearch={search}&gsrnamespace=6&gsrlimit={limit}"
        "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640"
    )
    data = _fetch_json(url)
    pages = ((data.get("query") or {}).get("pages") or {}).values()
    results = []
    for page in pages:
        info = (page.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata") or {}
        license_name = _plain((meta.get("LicenseShortName") or {}).get("value") or "开放许可")
        creator = _plain((meta.get("Artist") or {}).get("value") or "")
        results.append(
            {
                "id": f"commons-{page.get('pageid')}",
                "title": str(page.get("title") or "").replace("File:", ""),
                "thumbnail": info.get("thumburl") or info.get("url"),
                "url": info.get("descriptionurl") or info.get("url"),
                "license": license_name,
                "creator": creator,
                "source": "Wikimedia Commons",
            }
        )
    return results


def _search_openverse(query: str, limit: int) -> list[dict[str, Any]]:
    search = urllib.parse.quote(query)
    url = f"https://api.openverse.org/v1/images/?q={search}&page_size={limit}"
    data = _fetch_json(url)
    results = []
    for item in data.get("results") or []:
        results.append(
            {
                "id": f"openverse-{item.get('id')}",
                "title": item.get("title") or "开放图片",
                "thumbnail": item.get("thumbnail"),
                "url": item.get("foreign_landing_url") or item.get("url"),
                "license": f"{item.get('license') or 'CC'} {item.get('license_version') or ''}".strip(),
                "creator": item.get("creator") or "",
                "source": "Openverse",
            }
        )
    return results


def _search_archive(query: str, limit: int) -> list[dict[str, Any]]:
    search = urllib.parse.quote(query)
    url = (
        "https://archive.org/advancedsearch.php?"
        f"q={search}+AND+mediatype%3Atexts"
        "&fl%5B%5D=identifier&fl%5B%5D=title&fl%5B%5D=licenseurl"
        f"&rows={limit}&page=1&output=json"
    )
    data = _fetch_json(url)
    docs = ((data.get("response") or {}).get("docs")) or []
    results = []
    for item in docs:
        identifier = item.get("identifier")
        if not identifier:
            continue
        license_url = item.get("licenseurl") or ""
        results.append(
            {
                "id": f"archive-{identifier}",
                "title": item.get("title") or identifier,
                "thumbnail": f"https://archive.org/services/img/{identifier}",
                "url": f"https://archive.org/details/{identifier}",
                "license": "公共领域 / 见原页" if not license_url else "开放许可（见原页）",
                "creator": "",
                "source": "Internet Archive",
            }
        )
    return results


def search_resources(query: str, limit: int = 8, live: bool = False) -> dict[str, Any]:
    query = (query or "").strip()
    if not query:
        raise ValueError("缺少检索关键词")
    limit = max(1, min(limit, 12))
    started = time.time()
    if not live:
        results = search_local(query, limit)
        return {
            "ok": bool(results),
            "query": query,
            "count": len(results),
            "results": results,
            "errors": [] if results else ["local_index_empty"],
            "local": True,
            "elapsed_ms": round((time.time() - started) * 1000, 2),
            "license_note": "本地预取索引，引用请标注作者与许可。",
        }
    key = f"{query}|{limit}"
    now = time.time()
    cached = CACHE.get(key)
    if cached and now - cached[0] < CACHE_TTL:
        return {**cached[1], "cached": True}

    results: list[dict[str, Any]] = []
    errors: list[str] = []
    adapters = (
        ("Wikimedia Commons", _search_commons),
        ("Openverse", _search_openverse),
        ("Internet Archive", _search_archive),
    )
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(adapter, query, limit): name for name, adapter in adapters
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                results.extend(future.result())
            except Exception as error:  # noqa: BLE001 - 单个来源失败不影响其他来源
                errors.append(f"{name}: {type(error).__name__}")

    seen = set()
    unique = []
    for item in results:
        if not item.get("thumbnail") or item["id"] in seen:
            continue
        seen.add(item["id"])
        unique.append(item)
    payload = {
        "ok": bool(unique),
        "query": query,
        "count": len(unique),
        "results": unique[: limit * 2],
        "errors": errors,
        "license_note": "仅聚合开放许可来源；引用请标注作者与许可。",
    }
    if unique:
        CACHE[key] = (now, payload)
    return payload


# ── 图解区配图：按课题关键词从本地缓存索引挑选可直接使用的图片 ──────────
RASTER_SUFFIXES = (".jpg", ".jpeg", ".png", ".gif", ".bmp")

DIAGRAM_RULES: tuple[tuple[str, str], ...] = (
    ("分数|几分之几|几分之一|通分|约分", "分数 图解"),
    ("小数|数轴", "小数 数轴"),
    ("乘法|口诀", "乘法口诀表"),
    ("除法|平均分", "除法 竖式"),
    ("加法|加减", "加法 数学 图示"),
    ("减法", "减法 数学 图示"),
    ("三角形|长方形|正方形|平行四边形|梯形|圆|周长|面积|角", "几何图形 小学"),
    ("钟表|时针|分针|时间|秒", "钟表 整时"),
    ("人民币|元角分|购物", "人民币 一年级"),
    ("统计|条形|折线|扇形", "统计图 小学"),
    ("古诗|课文|散文|诗歌", "古诗 配图"),
    ("植物|种子|发芽|生长|叶|花", "植物 生长 过程"),
    ("实验|观察|测量|科学", "科学 实验 学生"),
    ("单词|英语|字母", "英语 字母 卡片"),
    ("安全|规则|交通", "安全教育 校园"),
    ("音乐|节奏|歌曲|音符", "音乐 节奏 图"),
    ("汉字|识字|拼音|书写", "汉字 书写 田字格"),
)

SUBJECT_QUERIES = {
    "数学": "几何图形 小学",
    "语文": "古诗 配图",
    "英语": "英语 字母 卡片",
    "科学": "科学 实验 学生",
    "道德与法治": "安全教育 校园",
    "音乐": "音乐 节奏 图",
    "美术": "",
    "体育": "",
}

BUILTIN_FALLBACKS: tuple[tuple[str, str], ...] = (
    ("分数|几分之几|几分之一", "圆图"),
    ("小数|数轴", "数轴"),
    ("加法|减法|加减|凑十|10 的分成", "10 的分成"),
)

# 配图要求里的可视元素词表：按具体到抽象排序，先命中先采用
VISUAL_TERMS: tuple[str, ...] = (
    "条形统计图", "折线统计图", "统计表", "路线图", "示意图", "情境图", "线段图",
    "平行四边形", "三角形", "长方形", "正方形", "圆形", "圆片", "圆盘",
    "方格纸", "田字格", "数轴", "钟面", "钟表", "温度计", "直尺", "三角尺",
    "量角器", "天平", "小棒", "圆点", "方块", "积木", "纸片", "纸条", "彩纸",
    "月饼", "苹果", "西瓜", "橘子", "糖果", "玉米", "豆子", "种子", "叶子",
    "人民币", "纸币", "硬币", "水杯", "冰块", "食盐", "沙子", "地图", "国旗",
    "古诗", "插图", "情境", "涂色", "折纸", "平均分", "平分", "排队", "测量",
    "拼摆", "观察", "实验", "发芽", "根", "茎", "花", "红色", "黄色",
    "绿色", "蓝色", "橙色", "圆", "纸",
)

TERM_ALIASES = {"圆": "圆形", "纸": "纸片"}

# 抽象动作词：检索时让具体图形 / 实物词优先
ABSTRACT_TERMS = {
    "涂色", "折纸", "平均分", "平分", "排队", "测量",
    "拼摆", "观察", "实验", "发芽", "插图", "情境",
}

COLOR_TERMS = {"红色", "黄色", "绿色", "蓝色", "橙色"}

LIVE_CACHE: dict[str, float] = {}
LIVE_TTL = 900
LIVE_LOCK = threading.Lock()


def _local_asset(item: dict[str, Any]) -> Path | None:
    thumbnail = str(item.get("thumbnail") or "")
    prefix = "/api/oer/assets/"
    if not thumbnail.startswith(prefix):
        return None
    path = ASSET_DIR / os.path.basename(thumbnail)
    return path if path.is_file() else None


def _hint_terms(hint: str) -> list[str]:
    """从「配图要求」里抽取可视元素，如圆形、涂色、平均分、数轴、种子。"""
    text = re.sub(r"^(配图|画面|插图|情境图|情境)[:：]\s*", "", (hint or "").strip())
    remaining = text
    terms: list[str] = []
    for term in VISUAL_TERMS:
        if term in remaining:
            terms.append(TERM_ALIASES.get(term, term))
            remaining = remaining.replace(term, " ")
    # 只有颜色词时不作为配图检索依据，避免搜到无关的颜色素材
    if terms and all(term in COLOR_TERMS for term in terms):
        return []
    return terms[:4]


def _priority_terms(terms: list[str]) -> list[str]:
    concrete = [term for term in terms if term not in ABSTRACT_TERMS]
    abstract = [term for term in terms if term in ABSTRACT_TERMS]
    return concrete + abstract


def _content_terms(terms: list[str]) -> list[str]:
    """颜色只做次要线索，检索以图形 / 实物为主。"""
    return [term for term in terms if term not in COLOR_TERMS]


def _topic_anchor(text: str) -> str:
    """从课题/配图文字里提取学科主题词，如分数、小数、几何图形。"""
    for pattern, query in DIAGRAM_RULES:
        if re.search(pattern, text):
            return query.split()[0]
    return ""


def _query_list(
    subject: str,
    lesson: str,
    title: str,
    hint: str,
) -> tuple[list[str], list[str]]:
    terms = _hint_terms(hint)
    ordered = _priority_terms(terms)
    focus = _content_terms(ordered)
    text = " ".join(part for part in (lesson, title, hint) if part)
    queries: list[str] = []
    if focus:
        queries.append(" ".join(focus[:3]))
    if lesson:
        if focus:
            queries.append(f"{lesson} {focus[0]}")
        queries.append(f"{lesson} 配图")
    for pattern, query in DIAGRAM_RULES:
        if re.search(pattern, text) and query not in queries:
            queries.append(query)
    default = SUBJECT_QUERIES.get(subject.strip())
    if default and default not in queries:
        queries.append(default)
    return queries, terms


def _builtin_for(text: str) -> dict[str, Any] | None:
    items = load_index()
    for pattern, fragment in BUILTIN_FALLBACKS:
        if re.search(pattern, text):
            for item in items:
                if fragment in str(item.get("title") or ""):
                    return item
    return None


def _haystack(item: dict[str, Any]) -> str:
    return " ".join(
        [
            str(item.get("title") or ""),
            " ".join(item.get("keywords") or []),
            str(item.get("source") or ""),
        ]
    ).lower()


def _matches_core(item: dict[str, Any], query: str) -> bool:
    """检索词的首词必须命中，避免只凭「配图 / 图解」等泛词跨课题取图。"""
    core = (query.split() or [""])[0].lower()
    if not core:
        return True
    return core in _haystack(item)


def _matches_hint(item: dict[str, Any], terms: list[str]) -> int:
    haystack = _haystack(item)
    return sum(1 for term in terms if term.lower() in haystack)


def _append_index(items: list[dict[str, Any]]) -> None:
    if not items:
        return
    with LIVE_LOCK:
        try:
            data = json.loads(INDEX_PATH.read_text("utf-8"))
        except Exception:  # noqa: BLE001 - 索引缺失时新建
            data = {"generated_at": "", "note": "", "items": []}
        current = data.get("items") or []
        known = {str(item.get("id")) for item in current}
        current.extend(item for item in items if str(item.get("id")) not in known)
        data["items"] = current
        INDEX_PATH.write_text(
            json.dumps(data, ensure_ascii=False, indent=2),
            "utf-8",
        )


def _live_crawl(
    query: str,
    terms: list[str],
    anchor: str = "",
    lesson: str = "",
) -> int:
    """按配图要求即时检索一次网络图片，落盘后进入本地索引。"""
    now = time.time()
    with LIVE_LOCK:
        if now - LIVE_CACHE.get(query, 0) < LIVE_TTL:
            return 0
        LIVE_CACHE[query] = now
    try:
        try:
            from . import oer_crawl as fetcher
        except ImportError:
            import oer_crawl as fetcher
    except Exception:  # noqa: BLE001 - 抓取模块不可用时退回本地
        return 0
    required = [
        term for term in _priority_terms(terms) if len(term) >= 2
    ] or _priority_terms(terms)
    try:
        candidates = fetcher.search_baidu(query, 3)
    except Exception:  # noqa: BLE001 - 单个来源失败继续兜底
        candidates = []
    if len(candidates) < 2:
        try:
            candidates += fetcher.search_bing(query, 3)
        except Exception:  # noqa: BLE001 - 兜底来源失败则放弃
            pass
    items: list[dict[str, Any]] = []
    for candidate in candidates:
        title = str(candidate.get("title") or "")
        matched = [term for term in required if term in title]
        if not matched:
            continue
        concrete = [term for term in matched if term not in ABSTRACT_TERMS]
        abstract = [term for term in matched if term in ABSTRACT_TERMS]
        contextual = bool(
            (anchor and anchor in title) or (lesson and lesson in title)
        )
        # 只凭形状 / 颜色命中的商品图、风景图不要
        if not contextual and not (concrete and abstract):
            continue
        if fetcher.BLOCK_TITLE.search(title):
            continue
        saved = fetcher.save_image(str(candidate.get("thumbnail") or ""))
        if not saved:
            continue
        filename, width, height = saved
        asset_id = f"web-{hashlib.md5(str(candidate['thumbnail']).encode()).hexdigest()[:12]}"
        items.append(
            {
                "id": asset_id,
                "title": title,
                "thumbnail": f"/api/oer/assets/{filename}",
                "url": candidate.get("page") or candidate.get("thumbnail") or "",
                "license": "网络检索 · 版权见原页，仅课堂示意",
                "creator": candidate.get("host") or "网络来源",
                "source": "百度图片（全网检索）",
                "keywords": matched,
                "width": width,
                "height": height,
            }
        )
        if len(items) >= 3:
            break
    _append_index(items)
    return len(items)


def pick_diagram(
    subject: str = "",
    lesson: str = "",
    title: str = "",
    hint: str = "",
    seed: str = "",
    grade: str = "",
) -> dict[str, Any]:
    """为图解区挑选一张配图：优先按配图要求检索，其次课题/学科素材。

    seed 用于在同一课题的多页之间稳定地轮换图片，网页预览与 PPT 导出结果一致。
    """
    text = " ".join(part for part in (lesson, title, hint) if part)
    queries, hint_terms = _query_list(subject, lesson, title, hint)
    ordered_terms = _priority_terms(hint_terms)
    content_terms = _content_terms(ordered_terms)
    abstract_terms = [term for term in content_terms if term in ABSTRACT_TERMS]
    focus_terms = content_terms[:2] + abstract_terms[:1]
    match_terms = content_terms or hint_terms
    anchor = _topic_anchor(lesson)
    prefix = " ".join(part for part in (grade, anchor or lesson) if part)
    hint_query = f"{prefix} {' '.join(focus_terms)}".strip() if focus_terms else ""
    lesson_hint_query = f"{lesson} {focus_terms[0]}" if lesson and focus_terms else ""
    seen: set[str] = set()

    def eligible(item: dict[str, Any], query: str) -> bool:
        if match_terms and query == hint_query:
            return _matches_hint(item, match_terms) > 0
        if match_terms and query == lesson_hint_query:
            return (
                lesson.lower() in _haystack(item)
                and _matches_hint(item, match_terms) > 0
            )
        return _matches_core(item, query)

    def collect(query_list: list[str]) -> list[tuple[int, int, dict[str, Any], str]]:
        found: list[tuple[int, int, dict[str, Any], str]] = []
        order = 0
        for query in query_list:
            for item in search_local(query, 8):
                asset_id = str(item.get("id") or "")
                path = _local_asset(item)
                if not path or asset_id in seen or not eligible(item, query):
                    continue
                seen.add(asset_id)
                haystack = _haystack(item)
                item_title = str(item.get("title") or "")
                # 明确写着其他年级的素材直接排除
                if grade:
                    grades = set(re.findall(r"([一二三四五六七八九])年级", item_title))
                    if grades and grade not in {f"{item}年级" for item in grades}:
                        continue
                raster = path.suffix.lower() in RASTER_SUFFIXES
                score = _score(item, query)
                score += 40 if raster else 0
                if "Bing" in str(item.get("source") or ""):
                    score += 12
                # 课题命中优先，保证同课题素材不被泛图挤掉
                if lesson and lesson.lower() in haystack:
                    score += 12
                # 学科主题词命中（分数 / 小数 / 几何图形）再加一层贴合度
                if anchor and anchor.lower() in haystack:
                    score += 6
                # 配图要求命中的可视元素越多，排序越靠前
                if match_terms:
                    score += min(50, _matches_hint(item, match_terms) * 25)
                colors = [term for term in hint_terms if term in COLOR_TERMS]
                if colors:
                    score += min(8, _matches_hint(item, colors) * 4)
                item_title = str(item.get("title") or "")
                # 练习卷、手抄报、PPT 模板、活动小报更适合整页展示，不如图解
                if re.search(
                    "手抄报|小报|活动|方案|记忆|感想|作文|总结|ppt|PPT|模板|试卷|练习|打印|电子版|下载",
                    item_title,
                ):
                    score -= 15
                # 题干截图、文字题不适合当图解
                if re.search("请详细说明|要求写出|至少|几种|练习题|答案|解析", item_title):
                    score -= 20
                # 图解优先实拍图 / 示意图 / 教具
                if re.search("图|插图|配图|图形|教具|学具|演示器|模型|实物", item_title):
                    score += 8
                # 图解区是横向区域，优先横图
                width = item.get("width")
                height = item.get("height")
                if (
                    isinstance(width, (int, float))
                    and isinstance(height, (int, float))
                    and height
                ):
                    ratio = width / height
                    if ratio >= 1.15:
                        score += 10
                    elif ratio < 0.85:
                        score -= 8
                found.append((score, order, item, query))
                order += 1
        return found

    candidates = collect(queries[:5])
    # 本地没有贴合配图要求的图片时，按配图要求即时抓取一次
    threshold = 1 if match_terms else 0
    strong_hint = any(
        _matches_hint(entry[2], match_terms) >= threshold
        and (path := _local_asset(entry[2])) is not None
        and path.suffix.lower() in RASTER_SUFFIXES
        for entry in candidates
    ) if match_terms else False
    if hint_query and not strong_hint:
        if _live_crawl(hint_query, match_terms, anchor, lesson) > 0:
            candidates += collect([query for query in (hint_query, lesson_hint_query) if query])
    if not candidates:
        builtin = _builtin_for(text)
        return {
            "ok": bool(builtin),
            "query": "内置图示",
            "asset": builtin,
            "raster": False,
        }
    candidates.sort(key=lambda entry: (-entry[0], entry[1]))
    if match_terms:
        # 配图要求优先：命中图形 / 实物的图排在泛课题素材之前
        hint_pool = [
            entry for entry in candidates if _matches_hint(entry[2], match_terms) > 0
        ]
        if hint_pool:
            candidates = hint_pool
    # 只在分数接近的候选之间轮换，避免把贴合配图要求的图换掉
    best_score = candidates[0][0]
    top = [entry for entry in candidates if entry[0] >= best_score - 4][:4]
    fingerprint = seed or title or lesson or hint or "xiangke"
    offset = int(hashlib.md5(fingerprint.encode("utf-8")).hexdigest()[:6], 16) % len(top)
    _top_score, _order, item, query = top[offset]
    return {
        "ok": True,
        "query": query,
        "asset": item,
        "raster": str(item.get("thumbnail") or "").lower().endswith(RASTER_SUFFIXES),
    }
