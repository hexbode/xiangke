"""把课件 deck JSON 渲染为 guizang 风格的单文件 HTML 演示。

模板来自项目内技能：.trae/skills/guizang-ppt-skill/assets/template.html
只做确定性的结构映射，不调用外部模型。
"""

from __future__ import annotations

import base64
import html
import json
import re
from pathlib import Path
from typing import Any

TEMPLATE_PATH = (
    Path(__file__).resolve().parent.parent
    / ".trae"
    / "skills"
    / "guizang-ppt-skill"
    / "assets"
    / "template.html"
)
MOTION_PATH = TEMPLATE_PATH.parent / "motion.min.js"

KIND_LABEL = {
    "cover": "课题",
    "lesson": "教学环节",
    "practice": "课堂练习",
    "scenario": "情境导入",
    "case": "案例分析",
    "objectives": "学习目标",
    "agenda": "教学流程",
    "homework": "课后任务",
    "summary": "课堂小结",
    "closing": "结课",
}

LIST_KINDS = {"objectives", "agenda", "homework"}


def template_available() -> bool:
    return TEMPLATE_PATH.is_file()


def _text(value: Any, limit: int = 0) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit] if limit else text


def _esc(value: Any, limit: int = 0) -> str:
    return html.escape(_text(value, limit), quote=True)


def _lines(raw: Any, limit: int = 6) -> list[str]:
    if not isinstance(raw, (list, tuple)):
        return []
    items: list[str] = []
    for entry in raw:
        text = _text(entry, 80)
        if text:
            items.append(text)
        if len(items) >= limit:
            break
    return items


def _page_id(index: int, kind: str) -> str:
    clean = re.sub(r"[^a-z-]", "", kind.lower()) or "slide"
    return f"s{index + 1:02d}-{clean}"


def _minutes(slide: dict[str, Any]) -> int:
    try:
        value = int(slide.get("minutes") or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, value)


def _chrome(deck: dict[str, Any], index: int, total: int, minutes: int) -> str:
    meta = deck.get("meta") if isinstance(deck.get("meta"), dict) else {}
    left = " · ".join(
        part
        for part in (
            _text(meta.get("subject")),
            _text(meta.get("grade")),
            _text(meta.get("lesson")),
        )
        if part
    ) or _text(deck.get("subtitle"), 30)
    right = f"{index + 1:02d} / {total:02d}"
    if minutes:
        right = f"{right} · {minutes} MIN"
    return (
        f'  <div class="chrome"><div>{html.escape(left)}</div>'
        f"<div>{right}</div></div>\n"
    )


def _foot(deck: dict[str, Any], slide: dict[str, Any]) -> str:
    left = _esc(slide.get("note") or deck.get("title"), 40)
    right = _esc(deck.get("subtitle") or "乡课", 24)
    return (
        f'  <div class="foot"><div class="title">{left}</div>'
        f"<div>{right}</div></div>\n"
    )


def _rowlines(items: list[str]) -> str:
    rows = []
    for position, item in enumerate(items, start=1):
        rows.append(
            '    <div class="rowline" data-anim>'
            f'<div class="k">{position:02d}</div>'
            f'<div class="v">{html.escape(item)}</div>'
            '<div class="m">KEY</div></div>'
        )
    return "\n".join(rows) + "\n"


def _tags(slide: dict[str, Any]) -> str:
    entries = [
        ("做一做", _text(slide.get("activity"), 40)),
        ("学生结论", _text(slide.get("conclusion"), 40)),
        ("口诀", _text(slide.get("mnemonic"), 40)),
    ]
    chips = [
        f'<span class="tag">{label} · {html.escape(text)}</span>'
        for label, text in entries
        if text
    ]
    if not chips:
        return ""
    return (
        '  <div style="display:flex;gap:1.6vw;flex-wrap:wrap;margin-top:2vh" data-anim>\n    '
        + "\n    ".join(chips)
        + "\n  </div>\n"
    )


def _question(text: str) -> str:
    if not text:
        return ""
    return (
        '  <div class="callout" style="margin:2.6vh 0" data-anim>\n'
        f'    <div class="q-big">{html.escape(text)}</div>\n'
        '    <span class="cite">核心提问</span>\n'
        "  </div>\n"
    )


def _cover(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    title = _text(slide.get("title"), 48)
    subtitle = _text(deck.get("subtitle"), 30)
    bullets = _lines(slide.get("bullets"), 3)
    meta = deck.get("meta") if isinstance(deck.get("meta"), dict) else {}
    font = "9vw" if len(title) <= 10 else "7.2vw" if len(title) <= 18 else "6vw"
    lead = "<br>".join(html.escape(item) for item in bullets[:2])
    author = _text(deck.get("author"), 20)
    school = _text(deck.get("school"), 30)
    meta_parts = [html.escape(part) for part in (author, school) if part]
    meta_row = "<span>·</span>".join(f"<span>{part}</span>" for part in meta_parts)
    kicker = _esc(slide.get("kicker") or f"{_text(meta.get('grade'))}{_text(meta.get('subject'))}", 60)
    return (
        f'<section class="slide hero dark" data-slide-id="{_page_id(index, "cover")}" '
        f'data-title="{html.escape(title)}">\n'
        + _chrome(deck, index, total, _minutes(slide))
        + '  <div class="frame" style="display:grid; gap:3.4vh; align-content:center; min-height:82vh">\n'
        + f'    <div class="kicker" data-anim>{kicker}</div>\n'
        + f'    <h1 class="h-hero" style="font-size:{font}; line-height:1.12" data-anim>{html.escape(title)}</h1>\n'
        + (
            f'    <h2 class="h-sub" data-anim>{html.escape(subtitle)}</h2>\n'
            if subtitle
            else ""
        )
        + (
            f'    <p class="lead" style="max-width:60vw" data-anim>{lead}</p>\n'
            if lead
            else ""
        )
        + (
            f'    <div class="meta-row" data-anim>{meta_row}</div>\n'
            if meta_row
            else ""
        )
        + "  </div>\n"
        + _foot(deck, slide)
        + "</section>\n"
    )


def _summary(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    title = _text(slide.get("title"), 48)
    quote = _text(slide.get("mnemonic") or slide.get("conclusion") or title, 60)
    bullets = _lines(slide.get("bullets"), 3)
    lead = "<br>".join(html.escape(item) for item in bullets)
    font = "5.4vw" if len(quote) <= 18 else "4.4vw" if len(quote) <= 30 else "3.6vw"
    return (
        f'<section class="slide dark" data-animate="quote" '
        f'data-slide-id="{_page_id(index, "summary")}" data-title="{html.escape(title)}">\n'
        + _chrome(deck, index, total, _minutes(slide))
        + '  <div class="frame" style="display:grid; gap:4vh; align-content:center; min-height:80vh">\n'
        + '    <div class="kicker" data-anim>课堂小结 · Takeaway</div>\n'
        + f'    <blockquote style="font-family:var(--serif-zh); font-weight:700; '
        f'font-size:{font}; line-height:1.22; max-width:74vw" data-anim>{html.escape(quote)}</blockquote>\n'
        + (
            f'    <p class="lead" style="max-width:58vw; opacity:.72" data-anim>{lead}</p>\n'
            if lead
            else ""
        )
        + "  </div>\n"
        + _foot(deck, slide)
        + "</section>\n"
    )


def _closing(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    title = _text(slide.get("title"), 48)
    bullets = _lines(slide.get("bullets"), 3)
    lead = "<br>".join(html.escape(item) for item in bullets)
    return (
        f'<section class="slide hero dark" data-slide-id="{_page_id(index, "closing")}" '
        f'data-title="{html.escape(title)}">\n'
        + _chrome(deck, index, total, _minutes(slide))
        + '  <div class="frame" style="display:grid; gap:5vh; align-content:center; min-height:82vh">\n'
        + '    <div class="kicker" data-anim>结课 · Closing</div>\n'
        + f'    <h1 class="h-hero" style="font-size:8vw" data-anim>{html.escape(title)}</h1>\n'
        + (
            f'    <p class="lead" style="max-width:54vw; opacity:.8" data-anim>{lead}</p>\n'
            if lead
            else ""
        )
        + "  </div>\n"
        + _foot(deck, slide)
        + "</section>\n"
    )


def _content(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    kind = _text(slide.get("kind")) or "lesson"
    theme = "dark" if index % 3 == 2 else "light"
    title = _text(slide.get("title"), 48)
    kicker = _esc(slide.get("kicker") or KIND_LABEL.get(kind, "教学环节"), 60)
    bullets = _lines(slide.get("bullets"), 5)

    body = ""
    if bullets:
        body += _rowlines(bullets)
    body += _tags(slide)

    return (
        f'<section class="slide {theme}" data-slide-id="{_page_id(index, kind)}" '
        f'data-title="{html.escape(title)}">\n'
        + _chrome(deck, index, total, _minutes(slide))
        + '  <div class="frame" style="padding-top:3vh">\n'
        + f'    <div class="kicker" data-anim>{kicker}</div>\n'
        + f'    <h2 class="h-xl" data-anim>{html.escape(title)}</h2>\n'
        + _question(_text(slide.get("question"), 60))
        + body
        + "  </div>\n"
        + _foot(deck, slide)
        + "</section>\n"
    )


def _plain(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    theme = "dark" if index % 3 == 2 else "light"
    title = _text(slide.get("title"), 48)
    bullets = _lines(slide.get("bullets"), 6)
    return (
        f'<section class="slide {theme}" data-slide-id="{_page_id(index, "slide")}" '
        f'data-title="{html.escape(title)}">\n'
        + _chrome(deck, index, total, _minutes(slide))
        + '  <div class="frame" style="padding-top:3vh">\n'
        + f'    <div class="kicker" data-anim>{_esc(slide.get("kicker") or "要点", 60)}</div>\n'
        + f'    <h2 class="h-xl" data-anim>{html.escape(title)}</h2>\n'
        + _question(_text(slide.get("question"), 60))
        + (_rowlines(bullets) if bullets else "")
        + _tags(slide)
        + "  </div>\n"
        + _foot(deck, slide)
        + "</section>\n"
    )


def _render_slide(deck: dict[str, Any], slide: dict[str, Any], index: int, total: int) -> str:
    kind = _text(slide.get("kind")) or "lesson"
    if kind == "cover":
        return _cover(deck, slide, index, total)
    if kind == "summary":
        return _summary(deck, slide, index, total)
    if kind == "closing":
        return _closing(deck, slide, index, total)
    if kind == "lesson" or kind in LIST_KINDS:
        return _content(deck, slide, index, total)
    return _plain(deck, slide, index, total)


def _speaker_notes(slides: list[dict[str, Any]], total: int) -> str:
    notes: list[dict[str, Any]] = []
    for index, slide in enumerate(slides):
        title = _text(slide.get("title"), 48)
        next_title = _text(slides[index + 1].get("title"), 48) if index + 1 < total else ""
        talk = [
            _text(slide.get("teacherNote"), 120),
            _text(slide.get("activity"), 60),
            _text(slide.get("visualHint"), 80),
        ]
        talk = [item for item in talk if item][:3]
        transition = f"讲完本页后进入「{next_title}」。" if next_title else "收束整节课。"
        notes.append(
            {
                "id": _page_id(index, _text(slide.get("kind")) or "slide"),
                "title": title,
                "section": KIND_LABEL.get(_text(slide.get("kind")), "教学环节"),
                "minutes": _minutes(slide),
                "purpose": _text(slide.get("question") or slide.get("conclusion"), 80)
                or f"讲清「{title}」",
                "talk": talk or [f"围绕「{title}」展开。"],
                "transition": transition,
            }
        )
    return "const SPEAKER_NOTES = " + json.dumps(notes, ensure_ascii=False, indent=2) + ";"


def _normalize(deck: Any) -> dict[str, Any]:
    if not isinstance(deck, dict):
        raise ValueError("deck_must_be_object")
    slides = deck.get("slides")
    if not isinstance(slides, list) or not slides:
        raise ValueError("deck_slides_required")
    cleaned = [slide for slide in slides if isinstance(slide, dict) and _text(slide.get("title"))]
    if not cleaned:
        raise ValueError("deck_slides_required")
    result = dict(deck)
    result["slides"] = cleaned
    return result


def _inline_assets(page: str) -> str:
    """把动效库内联成 data URL，保证导出文件离线可用。"""
    if MOTION_PATH.is_file():
        encoded = base64.b64encode(MOTION_PATH.read_bytes()).decode("ascii")
        page = page.replace(
            "motion = await import('./assets/motion.min.js');",
            f"motion = await import('data:text/javascript;base64,{encoded}');",
        )
    page = page.replace(
        "<script>lucide.createIcons();</script>",
        "<script>if (window.lucide) lucide.createIcons();</script>",
    )
    return page


def build_html(deck: Any) -> str:
    """把 deck 渲染为 guizang 单文件 HTML；模板缺失或内容非法时抛 ValueError。"""
    if not template_available():
        raise ValueError("html_template_missing")
    data = _normalize(deck)
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    slides = data["slides"]
    total = len(slides)

    slide_html = "\n".join(
        _render_slide(data, slide, index, total) for index, slide in enumerate(slides)
    )
    title = _text(data.get("title"), 48) or "乡课课件"
    subtitle = _text(data.get("subtitle"), 30)
    page_title = f"{title} · {subtitle}" if subtitle else title

    result = template.replace("<!-- SLIDES_HERE -->", slide_html)
    result = result.replace(
        "<title>[必填] 替换为 PPT 标题 · Deck Title</title>",
        f"<title>{html.escape(page_title)}</title>",
    )
    result = re.sub(
        r"const SPEAKER_NOTES = \[[\s\S]*?\];",
        _speaker_notes(slides, total),
        result,
        count=1,
    )
    return _inline_assets(result)
