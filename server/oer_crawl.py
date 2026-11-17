"""预取网络教育资源：检索全网图片、下载到本地并写入索引。

用法：python server/oer_crawl.py
说明：
- 主检索入口为百度图片（中文课堂素材覆盖更好），Bing 作为兜底；
- 结果按标题关键词过滤，剔除壁纸、商品、影视等无关图；
- 每张图片下载后统一转成 JPEG 并压缩，便于图解区直接使用与 PPT 嵌入；
- 记录来源站点与原图页地址，便于课堂引用时标注来源；
- 需要可访问外网的运行环境；外部不可达时保留原索引。
"""

from __future__ import annotations

import hashlib
import html as html_lib
import io
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

from oer import ASSET_DIR, INDEX_PATH, load_index

KEYWORDS = [
    "分数 图解",
    "小数 数轴",
    "几何图形 小学",
    "加法 数学 图示",
    "减法 数学 图示",
    "乘法口诀表",
    "除法 竖式",
    "钟表 整时",
    "人民币 一年级",
    "统计图 小学",
    "古诗 配图",
    "植物 生长 过程",
    "科学 实验 学生",
    "英语 字母 卡片",
    "安全教育 校园",
    "音乐 节奏 图",
    "汉字 书写 田字格",
    # 精编课文 / 课时：按课题抓取专属配图
    "分数的初步认识 配图",
    "秋天的雨 配图",
    "小数的意义 配图",
    "种子发芽实验 配图",
    "公民的基本权利 配图",
    "表内乘法 配图",
    "少年闰土 配图",
    "My School 配图",
]

# 图库 / 素材站 / 文档预览站 / 电商商品页，易带水印与价格，直接跳过
BLOCK_HOSTS = (
    "699pic",
    "vcg.com",
    "gettyimages",
    "shutterstock",
    "dreamstime",
    "veer",
    "tuchong",
    "58pic",
    "zcool",
    "21cnjy",
    "docin",
    "book118",
    "renrendoc",
    "doc88",
    "cnki",
    "wanfang",
    "ypppt",
    "wendang",
    "360doc",
    "jd.com",
    "3.cn",
    "taobao.com",
    "tmall.com",
    "1688.com",
    "alibaba.com",
    "pinduoduo.com",
    "yangkeduo.com",
    "suning.com",
    "dangdang.com",
    "youzan.com",
)

# 标题明显与课堂无关的内容直接跳过
BLOCK_TITLE = re.compile(
    "壁纸|招聘|淘宝|天猫|旗舰店|小说|漫画|攻略|直播|美女|帅哥|黑皮|体育生|明星|股票|基金|彩票|电影|电视剧|综艺|砧板|菜板|长椅|沙发|瓷砖|批发|促销|包邮"
)

MAX_NEW = 110
PER_KEYWORD = 4
TIMEOUT = 10
MAX_BYTES = 4 * 1024 * 1024
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"
)


def _fetch(url: str, timeout: float = TIMEOUT) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Accept": "image/*,application/json,*/*;q=0.8",
            "Referer": "https://image.baidu.com/",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read(MAX_BYTES)


def _clean_title(raw: str) -> str:
    text = html_lib.unescape(str(raw or ""))
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def search_baidu(keyword: str, want: int) -> list[dict[str, str]]:
    """百度图片 JSON 检索：返回标题、缩略图、原页与来源站点。"""
    url = (
        "https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj"
        "&ct=201326592&fp=result&fr=&gsm=1e"
        f"&logid={int(time.time() * 1000)}"
        f"&word={urllib.parse.quote(keyword)}&pn=0&rn={max(12, want * 4)}"
    )
    data = json.loads(_fetch(url).decode("utf-8", "replace"))
    results: list[dict[str, str]] = []
    for item in data.get("data") or []:
        if not isinstance(item, dict):
            continue
        title = _clean_title(item.get("fromPageTitleEnc") or item.get("fromPageTitle") or "")
        thumbnail = str(item.get("middleURL") or item.get("thumbURL") or "")
        if not title or not thumbnail:
            continue
        host = str(item.get("fromURLHost") or "").lower()
        if any(block in host for block in BLOCK_HOSTS):
            continue
        page = str(item.get("fromJumpUrl") or item.get("fromURL") or "")
        # 百度跳转链是编码串，不可读时退回来源站点首页
        if not page.startswith("http") or "ippr_" in page:
            page = f"https://{host}" if host else ""
        results.append({"title": title, "thumbnail": thumbnail, "page": page, "host": host})
        if len(results) >= want * 3:
            break
    return results


def search_bing(keyword: str, want: int) -> list[dict[str, str]]:
    """Bing 图片兜底检索。"""
    url = (
        "https://cn.bing.com/images/search?q="
        + urllib.parse.quote(keyword)
        + "&qft=+filterui:license-L1&form=IRFLTR&first=1"
    )
    page = _fetch(url).decode("utf-8", "replace")
    results: list[dict[str, str]] = []
    for raw in re.findall(r'm="(\{.*?\})"', page):
        try:
            data = json.loads(html_lib.unescape(raw))
        except Exception:  # noqa: BLE001 - 单条解析失败跳过
            continue
        title = _clean_title(data.get("t") or "")
        thumbnail = html_lib.unescape(str(data.get("murl") or data.get("turl") or ""))
        if not title or not thumbnail:
            continue
        purl = html_lib.unescape(str(data.get("purl") or ""))
        host = urllib.parse.urlparse(purl).netloc.lower()
        if any(block in host for block in BLOCK_HOSTS):
            continue
        results.append({"title": title, "thumbnail": thumbnail, "page": purl, "host": host})
        if len(results) >= want * 3:
            break
    return results


def save_image(url: str) -> tuple[str, int, int] | None:
    """下载并归一化为 JPEG，返回（本地文件名, 宽, 高）。"""
    try:
        data = _fetch(url)
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            width, height = img.size
            if width < 320 or height < 200:
                return None
            ratio = width / max(1, height)
            if ratio < 0.55 or ratio > 2.6:
                return None
            if img.mode in ("RGBA", "LA", "P"):
                rgba = img.convert("RGBA")
                canvas = Image.new("RGB", rgba.size, (255, 255, 255))
                canvas.paste(rgba, mask=rgba.split()[-1])
                image = canvas
            else:
                image = img.convert("RGB")
            image.thumbnail((1200, 1200), Image.LANCZOS)
            name = f"web-{hashlib.md5(url.encode()).hexdigest()[:12]}.jpg"
            ASSET_DIR.mkdir(parents=True, exist_ok=True)
            image.save(ASSET_DIR / name, "JPEG", quality=84, optimize=True)
            return name, image.width, image.height
    except Exception:  # noqa: BLE001 - 单张图片失败不影响整体
        return None


def main() -> None:
    previous = load_index()
    # 重新抓取前清掉上一轮网络缓存，避免遗留无关图
    for item in previous:
        if str(item.get("id", "")).startswith("web-"):
            stale = ASSET_DIR / Path(str(item.get("thumbnail") or "")).name
            if stale.is_file():
                stale.unlink()
    existing = [item for item in previous if not str(item.get("id", "")).startswith("web-")]
    seen_ids = {item.get("id") for item in existing}
    seen_urls = {item.get("url") for item in existing}
    seen_titles = {item.get("title") for item in existing}
    added = 0

    for keyword in KEYWORDS:
        if added >= MAX_NEW:
            break
        try:
            candidates = search_baidu(keyword, PER_KEYWORD)
        except Exception as error:  # noqa: BLE001 - 检索失败继续下一个关键词
            print(f"[skip] {keyword}: {type(error).__name__}")
            continue
        if len(candidates) < 2:
            try:
                candidates += search_bing(keyword, PER_KEYWORD)
            except Exception:  # noqa: BLE001 - 兜底来源失败忽略
                pass
        picked = 0
        tokens = [token for token in re.split(r"\s+", keyword) if token]
        for item in candidates:
            if added >= MAX_NEW or picked >= PER_KEYWORD:
                break
            title = item["title"]
            # 标题必须包含检索词，避免搜索引擎给出的无关推荐图
            if not any(token in title for token in tokens):
                continue
            if BLOCK_TITLE.search(title):
                continue
            if title in seen_titles:
                continue
            if item["page"] and item["page"] in seen_urls:
                continue
            local = save_image(item["thumbnail"])
            if not local:
                continue
            filename, image_w, image_h = local
            asset_id = f"web-{hashlib.md5(item['thumbnail'].encode()).hexdigest()[:12]}"
            if asset_id in seen_ids:
                continue
            seen_ids.add(asset_id)
            if item["page"]:
                seen_urls.add(item["page"])
            seen_titles.add(title)
            existing.append(
                {
                    "id": asset_id,
                    "title": title,
                    "thumbnail": f"/api/oer/assets/{filename}",
                    "url": item["page"] or item["thumbnail"],
                    "license": "网络检索 · 版权见原页，仅课堂示意",
                    "creator": item["host"] or "网络来源",
                    "source": "百度图片（全网检索）",
                    "keywords": tokens,
                    "width": image_w,
                    "height": image_h,
                }
            )
            added += 1
            picked += 1
        print(f"[ok] {keyword}: 新增 {picked} 张")
        time.sleep(0.4)

    INDEX_PATH.write_text(
        json.dumps(
            {
                "generated_at": __import__("datetime").date.today().isoformat(),
                "note": "网络预取索引：图解区优先使用本地缓存图片，检索无需等待。",
                "items": existing,
            },
            ensure_ascii=False,
            indent=2,
        ),
        "utf-8",
    )
    print(f"完成：新增 {added} 条，索引共 {len(existing)} 条 -> {INDEX_PATH}")


if __name__ == "__main__":
    main()
