"""基于 python-pptx 构建精制课件 PPT。

优先使用 server/templates/template.pptx 作为母版；模板不存在时从零构建 16:9 课件。
输入为前端 assemble 的 deck JSON，输出 .pptx 二进制。
"""

from __future__ import annotations

import io
import math
import os
import re
from pathlib import Path
from typing import Any

from lxml import etree
from PIL import Image
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

try:  # 图解区配图：复用开放资源索引
    from .oer import ASSET_DIR as OER_ASSET_DIR, pick_diagram
except ImportError:
    from oer import ASSET_DIR as OER_ASSET_DIR, pick_diagram

TEMPLATE_PATH = Path(__file__).resolve().parent / "templates" / "template.pptx"

COLORS = {
    "paper": "F7F2E6",
    "card": "FFFDF6",
    "card_line": "E4D9C0",
    "ink": "22301F",
    "ink_soft": "4C5A4D",
    "green": "2E5A3C",
    "green_mid": "24452F",
    "green_deep": "16301F",
    "green_card": "254633",
    "green_card_line": "3C5B47",
    "green_soft": "E9EEDF",
    "gold": "D9AE6A",
    "orange": "D98A2B",
    "blue": "3F6E8C",
    "sky": "F1F0E1",
    "green_mist": "DCE6D3",
    "gold_mist": "EDE1C6",
    "blue_mist": "C3D6DA",
    "white_soft": "FDFBF3",
    "terracotta": "C2674A",
    "gold_pale": "E6D8B8",
    "gold_faint": "EFE5CE",
    "cream": "FBF8EE",
    "chalk": "EEF1E2",
    "soft": "D9E4D2",
    "red": "A6462E",
    "muted": "7C7460",
    "note": "A8BBA9",
    "footer_dark": "8FA292",
    "rule_light": "E2D7BF",
    "rule_dark": "3E5747",
}

SLIDE_WIDTH = 10.0  # 英寸，16:9
SLIDE_HEIGHT = 5.625

# 字体三档：标题 / 正文 / 数字
FONT_TITLE = "微软雅黑"
FONT_BODY = "微软雅黑"
FONT_NUM = "Segoe UI"
FONT = FONT_BODY  # 兼容旧签名
FONT_LATIN = FONT_NUM

# 间距 token（英寸）
GAP_XS = 0.08
GAP_S = 0.14
GAP_M = 0.22
GAP_L = 0.36
GAP_XL = 0.6
MARGIN_X = 0.6
MARGIN_TOP = 1.62
MARGIN_BOTTOM = 0.5

MAX_SLIDES = 1000
MAX_CARD_BULLETS = 8


def template_available() -> bool:
    return TEMPLATE_PATH.is_file()


def _rgb(key: str) -> RGBColor:
    return RGBColor.from_string(COLORS.get(key, key))


# ---------------------------------------------------------------------------
# 底层绘制工具
# ---------------------------------------------------------------------------

def _soft_shadow(
    shape,
    *,
    blur: float = 8,
    dist: float = 2.5,
    alpha: int = 15,
    color: str = "000000",
    direction: int = 5400000,
) -> None:
    """给形状加柔和外阴影。direction: 5400000=向下，2700000=向右。"""
    try:
        shape.shadow.inherit = False
    except Exception:  # noqa: BLE001 - 个别形状不支持 shadow
        return
    spPr = shape._element.spPr
    effectLst = spPr.find(qn("a:effectLst"))
    if effectLst is None:
        effectLst = etree.SubElement(spPr, qn("a:effectLst"))
    for child in list(effectLst):
        effectLst.remove(child)
    outer = etree.SubElement(effectLst, qn("a:outerShdw"))
    outer.set("blurRad", str(int(blur * 12700)))
    outer.set("dist", str(int(dist * 12700)))
    outer.set("dir", str(direction))
    outer.set("algn", "ctr")
    outer.set("rotWithShape", "0")
    clr = etree.SubElement(outer, qn("a:srgbClr"))
    clr.set("val", COLORS.get(color, color))
    a = etree.SubElement(clr, qn("a:alpha"))
    a.set("val", str(alpha * 1000))


def _set_run_font(
    run,
    *,
    size: float,
    color: str,
    bold: bool = False,
    italic: bool = False,
    name: str = FONT_BODY,
    char_spacing: float | None = None,
) -> None:
    font = run.font
    font.size = Pt(size)
    font.bold = bold
    font.italic = italic
    font.name = name
    font.color.rgb = _rgb(color)
    if char_spacing is not None:
        font._rPr.set("spc", str(int(char_spacing * 100)))
    # 中文字体需要同时写入 East Asian typeface，否则部分环境回退为宋体
    rpr = run._r.get_or_add_rPr()
    ea = rpr.find(qn("a:ea"))
    if ea is None:
        ea = rpr.makeelement(qn("a:ea"), {})
        rpr.append(ea)
    ea.set("typeface", name)


def _add_text(
    slide,
    content: str | list[str],
    *,
    x: float,
    y: float,
    w: float,
    h: float,
    size: float,
    color: str,
    bold: bool = False,
    italic: bool = False,
    align: PP_ALIGN | None = None,
    line_spacing: float = 1.2,
    space_after: float = 0,
    char_spacing: float | None = None,
    anchor: MSO_ANCHOR | None = None,
    pad: float = 0.0,
    name: str = FONT_BODY,
):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.word_wrap = True
    frame.margin_left = Inches(pad)
    frame.margin_right = Inches(pad)
    frame.margin_top = 0
    frame.margin_bottom = 0
    if anchor is not None:
        frame.vertical_anchor = anchor
    lines = list(content) if isinstance(content, (list, tuple)) else [str(content)]
    if not lines:
        lines = [""]
    for index, line in enumerate(lines):
        paragraph = frame.paragraphs[0] if index == 0 else frame.add_paragraph()
        paragraph.line_spacing = line_spacing
        if space_after:
            paragraph.space_after = Pt(space_after)
        if align is not None:
            paragraph.alignment = align
        run = paragraph.add_run()
        run.text = str(line)
        _set_run_font(
            run,
            size=size,
            color=color,
            bold=bold,
            italic=italic,
            name=name,
            char_spacing=char_spacing,
        )
    return box


def _add_shape(
    slide,
    shape_type,
    *,
    x: float,
    y: float,
    w: float,
    h: float,
    fill: str | None = None,
    line: str | None = None,
    line_width: float = 1.0,
    radius: float | None = None,
    shadow: bool = False,
    shadow_alpha: int = 15,
    shadow_color: str = "000000",
    shadow_blur: float = 8,
    shadow_dist: float = 2.5,
):
    shape = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    if fill is None:
        shape.fill.background()
    else:
        shape.fill.solid()
        shape.fill.fore_color.rgb = _rgb(fill)
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = _rgb(line)
        shape.line.width = Pt(line_width)
    try:
        shape.shadow.inherit = False
    except Exception:  # noqa: BLE001 - 个别形状不支持阴影属性
        pass
    if shadow:
        _soft_shadow(
            shape,
            blur=shadow_blur,
            dist=shadow_dist,
            alpha=shadow_alpha,
            color=shadow_color,
        )
    if radius is not None and shape_type == MSO_SHAPE.ROUNDED_RECTANGLE:
        shape.adjustments[0] = radius
    return shape


def _card(slide, *, x: float, y: float, w: float, h: float, dark: bool = False, shadow: bool = True):
    shape = _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x,
        y=y,
        w=w,
        h=h,
        fill="green_card" if dark else "card",
        line="green_card_line" if dark else "card_line",
        line_width=0.75,
        radius=0.1,
        shadow=False,
    )
    if shadow:
        if dark:
            _soft_shadow(shape, blur=10, dist=0, alpha=8, color="D9AE6A")
        else:
            _soft_shadow(shape, blur=8, dist=2.5, alpha=14)
    return shape


def _paint_background(slide, color: str) -> None:
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = _rgb(color)


def _gradient_bg(slide, c1: str, c2: str, angle_deg: float = 135) -> None:
    """线性渐变背景；python-pptx 版本不支持时退回纯色。"""
    try:
        fill = slide.background.fill
        fill.gradient()
        fill.gradient_angle = angle_deg
        stops = fill.gradient_stops
        stops[0].color.rgb = _rgb(c1)
        stops[0].position = 0.0
        stops[1].color.rgb = _rgb(c2)
        stops[1].position = 1.0
    except Exception:  # noqa: BLE001 - 旧版本降级
        _paint_background(slide, c1)


def _reset_slides(prs: Presentation) -> None:
    """保留模板母版与主题，只清空示例幻灯片。"""
    slide_ids = prs.slides._sldIdLst
    for slide_id in list(slide_ids):
        prs.part.drop_rel(slide_id.rId)
        slide_ids.remove(slide_id)


def _blank_layout(prs: Presentation):
    for layout in prs.slide_layouts:
        if "blank" in (layout.name or "").lower():
            return layout
    return prs.slide_layouts[len(prs.slide_layouts) - 1]


def _new_presentation() -> tuple[Presentation, bool]:
    if template_available():
        prs = Presentation(str(TEMPLATE_PATH))
        _reset_slides(prs)
        prs.slide_width = Inches(SLIDE_WIDTH)
        prs.slide_height = Inches(SLIDE_HEIGHT)
        return prs, True
    prs = Presentation()
    prs.slide_width = Inches(SLIDE_WIDTH)
    prs.slide_height = Inches(SLIDE_HEIGHT)
    return prs, False


def _dot_grid(slide, *, x: float, y: float, color: str, count: int = 3, step: float = 0.15, size: float = 0.045) -> None:
    for row in range(count):
        for col in range(count):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + col * step,
                y=y + row * step,
                w=size,
                h=size,
                fill=color,
            )


def _decor_circles(slide, *, dark: bool) -> None:
    """右上角同心圆装饰，暗示梯田与年轮，增加画面层次。"""
    if dark:
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=7.0,
            y=-1.7,
            w=4.4,
            h=4.4,
            fill="green_mid",
            line="gold",
            line_width=0.9,
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=8.05,
            y=-0.65,
            w=2.3,
            h=2.3,
            fill="green_deep",
            line="gold",
            line_width=0.7,
        )
    else:
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=7.5,
            y=-1.9,
            w=4.2,
            h=4.2,
            fill=None,
            line="gold_pale",
            line_width=1.1,
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=8.3,
            y=-1.1,
            w=2.6,
            h=2.6,
            fill=None,
            line="gold_faint",
            line_width=0.9,
        )


# ---------------------------------------------------------------------------
# 形状插画（无图时的默认视觉）
# ---------------------------------------------------------------------------

def _icon_book(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x=x, y=y, w=size * 0.45, h=size, fill=color, radius=0.1)
    _add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x=x + size * 0.55, y=y, w=size * 0.45, h=size, fill=color, radius=0.1)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.48, y=y, w=size * 0.04, h=size, fill="gold")


def _icon_sun(slide, x: float, y: float, size: float, color: str = "gold") -> None:
    cx, cy = x + size / 2, y + size / 2
    _add_shape(slide, MSO_SHAPE.OVAL, x=x + size * 0.28, y=y + size * 0.28, w=size * 0.44, h=size * 0.44, fill=color)
    for i in range(8):
        ang = math.radians(i * 45)
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx + math.cos(ang) * size * 0.4 - size * 0.035,
            y=cy + math.sin(ang) * size * 0.4 - size * 0.035,
            w=size * 0.07,
            h=size * 0.07,
            fill=color,
        )


def _icon_tree(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, x=x + size * 0.1, y=y, w=size * 0.8, h=size * 0.62, fill=color)
    _add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, x=x + size * 0.2, y=y + size * 0.28, w=size * 0.6, h=size * 0.5, fill="green_mid")
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.42, y=y + size * 0.72, w=size * 0.16, h=size * 0.28, fill="gold")


def _icon_lightbulb(slide, x: float, y: float, size: float, color: str = "gold") -> None:
    _add_shape(slide, MSO_SHAPE.OVAL, x=x + size * 0.2, y=y, w=size * 0.6, h=size * 0.6, fill=color)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.34, y=y + size * 0.52, w=size * 0.32, h=size * 0.2, fill="green")
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.3, y=y + size * 0.74, w=size * 0.4, h=size * 0.12, fill="green_mid")
    for i, off in enumerate((0.12, 0.3, 0.48)):
        _add_shape(slide, MSO_SHAPE.OVAL, x=x + size * (0.1 + off), y=y + size * 0.9, w=size * 0.1, h=size * 0.1, fill="gold_pale")


def _icon_compass(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.OVAL, x=x, y=y, w=size, h=size, fill=None, line=color, line_width=2.0)
    _add_shape(slide, MSO_SHAPE.OVAL, x=x + size * 0.42, y=y + size * 0.42, w=size * 0.16, h=size * 0.16, fill="gold")
    _add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, x=x + size * 0.2, y=y + size * 0.4, w=size * 0.6, h=size * 0.22, fill=color)


def _icon_flag(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.28, y=y, w=size * 0.06, h=size, fill=color)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.34, y=y + size * 0.05, w=size * 0.52, h=size * 0.4, fill="gold")


def _icon_house(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.ISOSCELES_TRIANGLE, x=x + size * 0.08, y=y, w=size * 0.84, h=size * 0.5, fill="gold")
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.16, y=y + size * 0.48, w=size * 0.68, h=size * 0.5, fill=color)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x + size * 0.42, y=y + size * 0.66, w=size * 0.16, h=size * 0.32, fill="gold_pale")


def _icon_question(slide, x: float, y: float, size: float, color: str = "red") -> None:
    _add_shape(slide, MSO_SHAPE.OVAL, x=x, y=y, w=size, h=size, fill=None, line=color, line_width=2.2)
    _add_text(slide, "?", x=x, y=y + size * 0.02, w=size, h=size, size=size * 32, color=color, bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)


def _icon_star(slide, x: float, y: float, size: float, color: str = "gold") -> None:
    _add_shape(slide, MSO_SHAPE.STAR_5_POINT, x=x, y=y, w=size, h=size, fill=color)


def _icon_globe(slide, x: float, y: float, size: float, color: str = "green") -> None:
    _add_shape(slide, MSO_SHAPE.OVAL, x=x, y=y, w=size, h=size, fill=None, line=color, line_width=1.8)
    _add_shape(slide, MSO_SHAPE.OVAL, x=x + size * 0.3, y=y, w=size * 0.4, h=size, fill=None, line=color, line_width=1.2)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=x, y=y + size * 0.44, w=size, h=size * 0.12, fill=color)


_ICON_DRAWERS = {
    "book": _icon_book,
    "sun": _icon_sun,
    "tree": _icon_tree,
    "lightbulb": _icon_lightbulb,
    "compass": _icon_compass,
    "flag": _icon_flag,
    "house": _icon_house,
    "question": _icon_question,
    "star": _icon_star,
    "globe": _icon_globe,
}


def _pick_icon(deck_meta: dict[str, Any] | None, data: dict[str, Any]) -> str:
    meta = deck_meta or {}
    text = " ".join(
        str(meta.get(k) or "") for k in ("subject", "lesson")
    ) + " " + str(data.get("title") or "") + " " + str(data.get("visual_hint") or "")
    if any(k in text for k in ("语文", "阅读", "课文", "古诗", "识字", "作文")):
        return "book"
    if any(k in text for k in ("数学", "几何", "计算", "图形", "测量")):
        return "compass"
    if any(k in text for k in ("英语", "地理", "世界", "国家", "地图")):
        return "globe"
    if any(k in text for k in ("科学", "自然", "植物", "动物", "生物")):
        return "tree"
    if any(k in text for k in ("历史", "道德", "法治", "爱国", "节日")):
        return "flag"
    if any(k in text for k in ("音乐", "美术", "艺术", "表演")):
        return "star"
    if any(k in text for k in ("家", "乡村", "故乡", "生活")):
        return "house"
    if any(k in text for k in ("思考", "提问", "探究", "为什么")):
        return "question"
    if any(k in text for k in ("光", "太阳", "时间", "季节")):
        return "sun"
    return "lightbulb"


def _draw_icon(slide, kind: str, x: float, y: float, size: float, color: str = "green") -> None:
    drawer = _ICON_DRAWERS.get(kind) or _icon_lightbulb
    drawer(slide, x, y, size, color)


# ---------------------------------------------------------------------------
# 图片处理
# ---------------------------------------------------------------------------

def _style_picture(
    pic,
    *,
    radius: float = 0.06,
    line_color: str = "gold_pale",
    line_w: float = 0.75,
    shadow: bool = True,
) -> None:
    spPr = pic._element.spPr
    prstGeom = spPr.find(qn("a:prstGeom"))
    if prstGeom is not None:
        prstGeom.set("prst", "roundRect")
        avLst = prstGeom.find(qn("a:avLst"))
        if avLst is None:
            avLst = etree.SubElement(prstGeom, qn("a:avLst"))
        for child in list(avLst):
            avLst.remove(child)
        gd = etree.SubElement(avLst, qn("a:gd"))
        gd.set("name", "adj")
        gd.set("fmla", f"val {int(radius * 100000)}")
    if shadow:
        _soft_shadow(pic, blur=6, dist=1.5, alpha=12)
    for old in spPr.findall(qn("a:ln")):
        spPr.remove(old)
    ln = etree.Element(qn("a:ln"))
    ln.set("w", str(int(line_w * 12700)))
    solid = etree.SubElement(ln, qn("a:solidFill"))
    clr = etree.SubElement(solid, qn("a:srgbClr"))
    clr.set("val", COLORS.get(line_color, line_color))
    effectLst = spPr.find(qn("a:effectLst"))
    if effectLst is not None:
        effectLst.addprevious(ln)
    else:
        spPr.append(ln)


def _contained_size(path: Path, max_w: float, max_h: float) -> tuple[float, float]:
    try:
        with Image.open(path) as image:
            width, height = image.size
    except Exception:  # noqa: BLE001 - 尺寸读取失败时按最大框
        return max_w, max_h
    if not width or not height:
        return max_w, max_h
    scale = min(max_w / width, max_h / height)
    return width * scale, height * scale


def _add_contained_picture(
    slide,
    path: Path,
    x: float,
    y: float,
    w: float,
    h: float,
    align: str = "center",
    styled: bool = True,
):
    """把图片等比例放大到目标框内，完整显示、不裁剪。"""
    draw_w, draw_h = _contained_size(path, w, h)
    if align == "right":
        offset_x = w - draw_w
    elif align == "left":
        offset_x = 0
    else:
        offset_x = (w - draw_w) / 2
    pic = slide.shapes.add_picture(
        str(path),
        Inches(x + offset_x),
        Inches(y + (h - draw_h) / 2),
        Inches(draw_w),
        Inches(draw_h),
    )
    if styled:
        _style_picture(pic)
    return pic


# ---------------------------------------------------------------------------
# 封面 / 封底 / 页眉 / 页脚
# ---------------------------------------------------------------------------

def _render_cover(slide, data: dict[str, Any]) -> None:
    _gradient_bg(slide, "green_deep", "green_mid", 135)
    _decor_circles(slide, dark=True)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=0, y=0, w=0.16, h=5.625, fill="gold")

    _add_text(
        slide,
        "乡课",
        x=0.62,
        y=0.4,
        w=1.2,
        h=0.34,
        size=13,
        color="gold",
        bold=True,
        char_spacing=3,
        name=FONT_TITLE,
    )
    _add_text(
        slide,
        "XIANGKE · RURAL LESSON",
        x=1.34,
        y=0.46,
        w=3.6,
        h=0.24,
        size=7.5,
        color="note",
        char_spacing=1.8,
        name=FONT_NUM,
    )
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=0.66, y=0.86, w=0.55, h=0.02, fill="gold")

    kicker = data.get("kicker")
    if kicker:
        _add_text(
            slide,
            kicker,
            x=0.62,
            y=1.2,
            w=6.6,
            h=0.3,
            size=11,
            color="gold",
            char_spacing=1.4,
        )

    title = data.get("title") or ""
    _add_text(
        slide,
        title,
        x=0.62,
        y=1.56,
        w=7.2,
        h=1.2,
        size=30 if len(title) <= 18 else 26,
        color="cream",
        bold=True,
        line_spacing=1.15,
        name=FONT_TITLE,
    )

    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=0.66, y=2.92, w=1.1, h=0.045, fill="gold")

    bullets = data.get("bullets") or []
    if bullets:
        _add_text(
            slide,
            bullets,
            x=0.66,
            y=3.14,
            w=6.6,
            h=1.05,
            size=12,
            color="soft",
            line_spacing=1.55,
            space_after=2,
        )

    note = data.get("note")
    if note:
        _add_text(
            slide,
            note,
            x=0.66,
            y=4.88,
            w=6.8,
            h=0.28,
            size=8.5,
            color="note",
            char_spacing=0.4,
        )

    _dot_grid(slide, x=0.68, y=4.42, color="gold")


def _render_closing(slide, data: dict[str, Any]) -> None:
    _gradient_bg(slide, "green_deep", "green_mid", 135)
    _decor_circles(slide, dark=True)
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=0, y=0, w=0.16, h=5.625, fill="gold")

    _add_text(
        slide,
        "乡课 · XIANGKE",
        x=0,
        y=0.5,
        w=10,
        h=0.28,
        size=8.5,
        color="note",
        align=PP_ALIGN.CENTER,
        char_spacing=2,
        name=FONT_NUM,
    )
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=4.4, y=1.5, w=1.2, h=0.045, fill="gold")
    _add_text(
        slide,
        data.get("title") or "",
        x=0.8,
        y=1.86,
        w=8.4,
        h=0.95,
        size=28,
        color="cream",
        bold=True,
        align=PP_ALIGN.CENTER,
        line_spacing=1.2,
        name=FONT_TITLE,
    )
    bullets = data.get("bullets") or []
    if bullets:
        _add_text(
            slide,
            bullets,
            x=1.2,
            y=2.98,
            w=7.6,
            h=1.35,
            size=12,
            color="soft",
            align=PP_ALIGN.CENTER,
            line_spacing=1.7,
            space_after=3,
        )
    _add_text(
        slide,
        "让村小也能备一堂好课",
        x=0,
        y=4.86,
        w=10,
        h=0.28,
        size=9,
        color="gold",
        align=PP_ALIGN.CENTER,
        char_spacing=2,
    )


def _render_header(slide, data: dict[str, Any], index: int, *, dark: bool = False) -> None:
    _add_shape(
        slide,
        MSO_SHAPE.RECTANGLE,
        x=0,
        y=0,
        w=0.14,
        h=5.625,
        fill="gold" if dark else "green",
    )
    _add_text(
        slide,
        f"{index + 1:02d}",
        x=8.3,
        y=0.14,
        w=1.2,
        h=0.82,
        size=40,
        color="2F4A39" if dark else "EBE2CE",
        bold=True,
        align=PP_ALIGN.RIGHT,
        name=FONT_NUM,
    )
    kicker = data.get("kicker")
    if kicker:
        _add_text(
            slide,
            kicker,
            x=0.6,
            y=0.38,
            w=5.2,
            h=0.26,
            size=9.5,
            color="gold" if dark else "red",
            bold=True,
            char_spacing=2,
        )
    title = data.get("title") or ""
    size = 21 if len(title) <= 16 else 19 if len(title) <= 22 else 17
    _add_text(
        slide,
        title,
        x=0.6,
        y=0.64,
        w=7.5,
        h=0.64,
        size=size,
        color="chalk" if dark else "ink",
        bold=True,
        name=FONT_TITLE,
    )
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=0.63, y=1.38, w=0.9, h=0.04, fill="gold")


def _render_footer(slide, *, title: str, index: int, total: int, dark: bool = False) -> None:
    _add_shape(
        slide,
        MSO_SHAPE.RECTANGLE,
        x=0.6,
        y=5.14,
        w=8.8,
        h=0.012,
        fill="rule_dark" if dark else "rule_light",
    )
    _add_text(
        slide,
        f"乡课 · {title}",
        x=0.6,
        y=5.21,
        w=6.5,
        h=0.24,
        size=8,
        color="footer_dark" if dark else "muted",
    )
    _add_text(
        slide,
        f"{index + 1:02d} / {total:02d}",
        x=8.4,
        y=5.21,
        w=1.0,
        h=0.24,
        size=8,
        color="footer_dark" if dark else "muted",
        align=PP_ALIGN.RIGHT,
        name=FONT_NUM,
    )


# ---------------------------------------------------------------------------
# 正文版式
# ---------------------------------------------------------------------------

def _card_text_size(text: str, row_h: float) -> float:
    if row_h >= 0.72:
        size = 13.0
    elif row_h >= 0.58:
        size = 12.0
    else:
        size = 11.0
    if len(text) > 44:
        size -= 1.5
    elif len(text) > 30:
        size -= 0.5
    return max(size, 10.0)


def _render_card_list(
    slide,
    bullets: list[str],
    *,
    x: float = 0.6,
    y: float = 1.66,
    w: float = 8.8,
    h: float = 3.32,
    dark: bool = False,
    accent: str = "green",
    cols: int | None = None,
    start_number: int = 1,
    shadow: bool = True,
) -> None:
    items = [item for item in bullets if item.strip()][:MAX_CARD_BULLETS]
    if not items:
        return
    if cols is None:
        cols = 2 if len(items) > 4 else 1
    cols = max(1, min(cols, len(items)))
    rows = math.ceil(len(items) / cols)
    gap = GAP_S
    row_h = min(0.88, (h - gap * (rows - 1)) / rows)
    col_w = (w - gap * (cols - 1)) / cols
    offset = max(0.0, (h - (rows * row_h + gap * (rows - 1))) / 2)

    for position, item in enumerate(items):
        row = position // cols
        col = position % cols
        cx = x + col * (col_w + gap)
        cy = y + offset + row * (row_h + gap)
        _card(slide, x=cx, y=cy, w=col_w, h=row_h, dark=dark, shadow=shadow)

        dot = 0.3 if row_h >= 0.62 else 0.26
        dot_x = cx + 0.2
        dot_y = cy + (row_h - dot) / 2
        _add_shape(slide, MSO_SHAPE.OVAL, x=dot_x, y=dot_y, w=dot, h=dot, fill=accent)
        _add_text(
            slide,
            f"{start_number + position:02d}",
            x=dot_x,
            y=dot_y + 0.01,
            w=dot,
            h=dot,
            size=7.5 if dot < 0.3 else 8,
            color="green_deep" if accent == "gold" else "cream",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            name=FONT_NUM,
        )
        _add_text(
            slide,
            item,
            x=dot_x + dot + 0.2,
            y=cy + 0.04,
            w=col_w - dot - 0.62,
            h=row_h - 0.08,
            size=_card_text_size(item, row_h),
            color="chalk" if dark else "ink",
            line_spacing=1.22,
            anchor=MSO_ANCHOR.MIDDLE,
        )


def _render_objectives(slide, bullets: list[str]) -> None:
    items = [item for item in bullets if item.strip()][:3]
    if len(items) < 3:
        _render_card_list(slide, bullets, accent="green")
        return
    gap = GAP_M
    card_w = (8.8 - gap * 2) / 3
    card_h = 2.4
    top = 1.7
    for index, item in enumerate(items):
        cx = 0.6 + index * (card_w + gap)
        _card(slide, x=cx, y=top, w=card_w, h=card_h, shadow=True)
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx,
            y=top,
            w=card_w,
            h=0.07,
            fill="gold",
            radius=0.5,
        )
        _add_text(
            slide,
            f"0{index + 1}",
            x=cx + 0.24,
            y=top + 0.26,
            w=1.2,
            h=0.5,
            size=26,
            color="gold_pale",
            bold=True,
            name=FONT_NUM,
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx + 0.26,
            y=top + 0.82,
            w=0.11,
            h=0.11,
            fill="green",
        )
        _add_text(
            slide,
            item,
            x=cx + 0.26,
            y=top + 0.98,
            w=card_w - 0.52,
            h=card_h - 1.14,
            size=12.5 if len(item) <= 24 else 11.5,
            color="ink",
            line_spacing=1.35,
            anchor=MSO_ANCHOR.MIDDLE,
        )


def _render_agenda(slide, bullets: list[str]) -> None:
    items = [item for item in bullets if item.strip()][:6]
    if not items:
        return
    row_h = min(0.78, 3.15 / len(items))
    top = 1.72
    for index, item in enumerate(items):
        cy = top + index * row_h
        _add_text(
            slide,
            f"0{index + 1}",
            x=0.62,
            y=cy + row_h / 2 - 0.2,
            w=0.7,
            h=0.4,
            size=13,
            color="gold",
            bold=True,
            name=FONT_NUM,
        )
        _add_text(
            slide,
            item,
            x=1.42,
            y=cy + row_h / 2 - 0.22,
            w=7.2,
            h=0.44,
            size=14 if len(item) <= 24 else 12.5,
            color="ink",
        )
        _add_shape(
            slide,
            MSO_SHAPE.RECTANGLE,
            x=0.62,
            y=cy + row_h - 0.05,
            w=8.76,
            h=0.008,
            fill="rule_light",
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=9.3,
            y=cy + row_h / 2 - 0.035,
            w=0.07,
            h=0.07,
            fill="gold",
        )


def _render_scenario(slide, bullets: list[str]) -> None:
    """情景页：情景卡 + 内嵌细框 + 大引号 + 编号步骤 + 任务高亮 + TIP。"""
    items = [item for item in bullets if item.strip()][:3]
    if not items:
        return
    left = 0.6
    top = 1.66
    width = 8.8
    card_h = 2.92

    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left + 0.07,
        y=top + 0.07,
        w=width,
        h=card_h,
        fill="gold_faint",
        radius=0.1,
    )
    _card(slide, x=left, y=top, w=width, h=card_h, shadow=True)
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left,
        y=top,
        w=0.09,
        h=card_h,
        fill="gold",
        radius=0.4,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left + 0.16,
        y=top + 0.14,
        w=width - 0.32,
        h=card_h - 0.28,
        fill=None,
        line="gold_faint",
        line_width=0.7,
        radius=0.06,
    )
    _add_text(
        slide,
        "“",
        x=left + width - 1.35,
        y=top + 0.1,
        w=1.1,
        h=1.0,
        size=76,
        color="gold_faint",
        bold=True,
        align=PP_ALIGN.RIGHT,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left + 0.38,
        y=top + 0.26,
        w=0.92,
        h=0.34,
        fill="green",
        radius=0.5,
    )
    _add_text(
        slide,
        "情景",
        x=left + 0.38,
        y=top + 0.27,
        w=0.92,
        h=0.32,
        size=9.5,
        color="cream",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
        char_spacing=1,
    )
    _dot_grid(
        slide,
        x=left + width - 0.64,
        y=top + 1.3,
        color="gold_pale",
        count=2,
        step=0.14,
        size=0.05,
    )

    line_top = top + 0.78
    line_h = (card_h - 0.92) / len(items)
    for index, item in enumerate(items):
        ly = line_top + index * line_h
        is_task = index == len(items) - 1
        if is_task:
            _add_shape(
                slide,
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x=left + 0.36,
                y=ly + 0.02,
                w=width - 0.72,
                h=line_h - 0.06,
                fill="gold_faint",
                radius=0.14,
            )
        badge = 0.32
        badge_y = ly + (line_h - badge) / 2
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=left + 0.5,
            y=badge_y,
            w=badge,
            h=badge,
            fill="gold" if is_task else "green_soft",
            radius=0.3,
        )
        _add_text(
            slide,
            f"0{index + 1}",
            x=left + 0.5,
            y=badge_y + 0.01,
            w=badge,
            h=badge,
            size=9,
            color="green_deep" if is_task else "green",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            name=FONT_NUM,
        )
        _add_text(
            slide,
            item,
            x=left + 0.98,
            y=ly,
            w=width - 1.42,
            h=line_h,
            size=14.0 if len(item) <= 32 else 12.5,
            color="red" if is_task else "ink",
            bold=is_task,
            line_spacing=1.4,
            anchor=MSO_ANCHOR.MIDDLE,
        )
        if not is_task:
            _add_shape(
                slide,
                MSO_SHAPE.RECTANGLE,
                x=left + 0.98,
                y=ly + line_h - 0.02,
                w=width - 1.5,
                h=0.008,
                fill="rule_light",
            )

    tip_y = top + card_h + 0.14
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left + 0.02,
        y=tip_y,
        w=0.5,
        h=0.26,
        fill="green_soft",
        radius=0.5,
    )
    _add_text(
        slide,
        "TIP",
        x=left + 0.02,
        y=tip_y + 0.01,
        w=0.5,
        h=0.24,
        size=7.5,
        color="green",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
        char_spacing=0.6,
        name=FONT_NUM,
    )
    _add_text(
        slide,
        "先读明白情景，再动笔解决问题。",
        x=left + 0.62,
        y=tip_y + 0.01,
        w=6.0,
        h=0.24,
        size=9,
        color="muted",
    )
    _dot_grid(
        slide,
        x=8.98,
        y=4.68,
        color="gold_pale",
        count=2,
        step=0.14,
        size=0.045,
    )


def _render_case(slide, bullets: list[str]) -> None:
    """案例页：案例 / 分析 / 结论三张步骤卡 + 连接箭头 + 追问条。"""
    items = [item for item in bullets if item.strip()][:3]
    if len(items) != 3:
        _render_card_list(slide, bullets, accent="green")
        return
    labels = ["案例", "分析", "结论"]
    gap = GAP_M + 0.02
    card_w = (8.8 - gap * 2) / 3
    card_h = 2.32
    top = 1.66
    for index, (label, item) in enumerate(zip(labels, items)):
        cx = 0.6 + index * (card_w + gap)
        is_result = index == 2
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx + 0.05,
            y=top + 0.05,
            w=card_w,
            h=card_h,
            fill="gold_faint",
            radius=0.1,
        )
        _card(slide, x=cx, y=top, w=card_w, h=card_h, shadow=True)
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx,
            y=top + 0.14,
            w=0.05,
            h=card_h - 0.28,
            fill="gold" if is_result else ("green_mid" if index == 1 else "green"),
            radius=0.5,
        )
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx + 0.18,
            y=top + 0.02,
            w=card_w - 0.36,
            h=0.05,
            fill="gold",
            radius=0.5,
        )
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx + 0.2,
            y=top + 0.2,
            w=0.86,
            h=0.3,
            fill="gold" if is_result else "green",
            radius=0.5,
        )
        _add_text(
            slide,
            label,
            x=cx + 0.2,
            y=top + 0.21,
            w=0.86,
            h=0.28,
            size=9.5,
            color="green_deep" if is_result else "cream",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            char_spacing=1,
        )
        badge = 0.4
        bx = cx + card_w - 0.6
        by = top + 0.16
        _add_shape(slide, MSO_SHAPE.OVAL, x=bx, y=by, w=badge, h=badge, fill="green_soft")
        _add_text(
            slide,
            f"0{index + 1}",
            x=bx,
            y=by + 0.01,
            w=badge,
            h=badge,
            size=9,
            color="green",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            name=FONT_NUM,
        )
        _add_text(
            slide,
            item,
            x=cx + 0.22,
            y=top + 0.68,
            w=card_w - 0.44,
            h=card_h - 1.06,
            size=12.5 if len(item) <= 24 else 11.5,
            color="ink",
            line_spacing=1.45,
            anchor=MSO_ANCHOR.TOP,
        )
        if index < 2:
            _add_shape(
                slide,
                MSO_SHAPE.RIGHT_ARROW,
                x=cx + card_w + (gap - 0.16) / 2,
                y=top + card_h / 2 - 0.08,
                w=0.16,
                h=0.16,
                fill="gold",
            )

    bar_y = top + card_h + 0.2
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=0.6,
        y=bar_y,
        w=8.8,
        h=0.5,
        fill="green_soft",
        radius=0.5,
    )
    qs = 0.28
    qs_y = bar_y + (0.5 - qs) / 2
    _add_shape(slide, MSO_SHAPE.OVAL, x=0.84, y=qs_y, w=qs, h=qs, fill="green")
    _add_text(
        slide,
        "?",
        x=0.84,
        y=qs_y + 0.01,
        w=qs,
        h=qs,
        size=10,
        color="cream",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )
    _add_text(
        slide,
        "追问：换一种方法，还能得到同样的结论吗？先和同桌说一说。",
        x=1.22,
        y=bar_y + 0.06,
        w=8.0,
        h=0.38,
        size=10,
        color="green",
        bold=True,
        line_spacing=1.2,
        anchor=MSO_ANCHOR.MIDDLE,
    )


def _render_flow(slide, data: dict[str, Any]) -> None:
    """课时流程页：做一做 / 想一想 / 说一说 + 配图位；答案与时间写入讲者备注。"""
    activity = data.get("activity") or ""
    question = data.get("question") or ""
    conclusion = data.get("conclusion") or ""
    visual = (data.get("visual_hint") or "").rstrip("。")
    if not (activity or question or conclusion):
        _render_card_list(slide, data.get("bullets") or [])
        return

    left_x = 0.6
    left_w = 5.92
    right_x = 6.74
    right_w = 2.66
    top = 1.6

    def size_for(text: str, base: float = 12.5) -> float:
        if len(text) <= 32:
            return base
        if len(text) <= 48:
            return base - 1
        return max(base - 2, 9.5)

    _card(slide, x=left_x, y=top, w=left_w, h=1.02, shadow=True)
    _add_text(
        slide,
        "做一做",
        x=left_x + 0.22,
        y=top + 0.13,
        w=2.2,
        h=0.24,
        size=9,
        color="green",
        bold=True,
        char_spacing=1.5,
    )
    _add_text(
        slide,
        activity,
        x=left_x + 0.22,
        y=top + 0.39,
        w=left_w - 0.44,
        h=0.56,
        size=size_for(activity, 12.5),
        color="ink",
        line_spacing=1.25,
    )

    ask_y = top + 1.14
    _card(slide, x=left_x, y=ask_y, w=left_w, h=0.92, shadow=True)
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left_x,
        y=ask_y,
        w=0.06,
        h=0.92,
        fill="red",
        radius=0.4,
    )
    _add_text(
        slide,
        "想一想",
        x=left_x + 0.22,
        y=ask_y + 0.12,
        w=2.4,
        h=0.24,
        size=9,
        color="red",
        bold=True,
        char_spacing=1.5,
    )
    _add_text(
        slide,
        f"「{question}」",
        x=left_x + 0.22,
        y=ask_y + 0.38,
        w=left_w - 0.44,
        h=0.46,
        size=size_for(question, 13.0),
        color="ink",
        bold=True,
        line_spacing=1.2,
    )

    res_y = ask_y + 1.04
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left_x,
        y=res_y,
        w=left_w,
        h=0.86,
        fill="green_soft",
        radius=0.08,
    )
    _add_text(
        slide,
        "说一说",
        x=left_x + 0.22,
        y=res_y + 0.11,
        w=2.2,
        h=0.24,
        size=9,
        color="green",
        bold=True,
        char_spacing=1.5,
    )
    _add_text(
        slide,
        conclusion,
        x=left_x + 0.22,
        y=res_y + 0.37,
        w=left_w - 0.44,
        h=0.42,
        size=size_for(conclusion, 12.5),
        color="green_deep",
        bold=True,
        line_spacing=1.2,
    )

    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=right_x,
        y=top,
        w=right_w,
        h=3.24,
        fill="cream",
        line="gold_pale",
        line_width=1.0,
        radius=0.06,
    )
    _add_text(
        slide,
        "配图",
        x=right_x + 0.2,
        y=top + 0.16,
        w=1.6,
        h=0.24,
        size=9,
        color="green",
        bold=True,
        char_spacing=1.5,
    )
    _add_text(
        slide,
        "图",
        x=right_x,
        y=top + 0.62,
        w=right_w,
        h=1.1,
        size=52,
        color="gold_faint",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
    )
    _add_shape(
        slide,
        MSO_SHAPE.RECTANGLE,
        x=right_x + 0.2,
        y=top + 1.86,
        w=right_w - 0.4,
        h=0.012,
        fill="gold_pale",
    )
    _add_text(
        slide,
        visual,
        x=right_x + 0.2,
        y=top + 2.02,
        w=right_w - 0.4,
        h=1.02,
        size=10,
        color="ink_soft",
        line_spacing=1.35,
    )


def _diagram_picture(
    deck_meta: dict[str, Any] | None,
    data: dict[str, Any],
) -> tuple[Path, str, str, str] | None:
    """为图解区挑选本地缓存的网络图片；SVG 内置图示不嵌入（PowerPoint 不支持）。"""
    meta = deck_meta or {}
    try:
        payload = pick_diagram(
            subject=str(meta.get("subject") or ""),
            lesson=str(meta.get("lesson") or ""),
            title=str(data.get("title") or ""),
            hint=str(data.get("visual_hint") or ""),
            grade=str(meta.get("grade") or ""),
        )
    except Exception:  # noqa: BLE001 - 索引异常时退回纯文字图解
        return None
    asset = payload.get("asset") or {}
    thumbnail = str(asset.get("thumbnail") or "")
    if not thumbnail.startswith("/api/oer/assets/"):
        return None
    path = OER_ASSET_DIR / os.path.basename(thumbnail)
    if not path.is_file() or path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
        return None
    return (
        path,
        str(asset.get("title") or "网络图片"),
        str(asset.get("source") or ""),
        str(asset.get("url") or ""),
    )


def _render_plan_shapes(slide, plan: dict[str, Any], x: float, y: float, w: float, h: float) -> bool:
    """按配图参数直接绘制圆形 / 方块 / 三角形，用于几何与数量对应页。"""
    params = plan.get("params") or {}
    raw_shapes = params.get("shapes") or []
    instances: list[dict[str, Any]] = []
    for item in raw_shapes:
        if not isinstance(item, dict):
            continue
        try:
            count = max(1, min(8, int(item.get("count") or 1)))
        except (TypeError, ValueError):
            count = 1
        instances.extend([item] * count)
    instances = instances[:12]
    if not instances:
        return False
    cols = max(1, min(len(instances), int(params.get("cols") or len(instances))))
    rows = max(1, math.ceil(len(instances) / cols))
    cell_w = w / cols
    cell_h = h / rows
    size = min(cell_w, cell_h) * 0.62
    for index, item in enumerate(instances):
        col = index % cols
        row = index // cols
        center_x = x + cell_w * (col + 0.5)
        center_y = y + cell_h * (row + 0.5)
        shape_kind = str(item.get("type") or "circle")
        shape_type = (
            MSO_SHAPE.OVAL
            if shape_kind == "circle"
            else MSO_SHAPE.ISOSCELES_TRIANGLE
            if shape_kind == "triangle"
            else MSO_SHAPE.ROUNDED_RECTANGLE
        )
        _add_shape(
            slide,
            shape_type,
            x=center_x - size / 2,
            y=center_y - size / 2,
            w=size,
            h=size,
            fill=str(item.get("color") or "gold"),
            line="green",
            line_width=1.0,
            radius=0.08 if shape_kind != "circle" else None,
            shadow=True,
            shadow_alpha=10,
        )
    return True


def _render_mermaid_tree(slide, plan: dict[str, Any], x: float, y: float, w: float, h: float) -> bool:
    """把 Mermaid 节点/边画成简单树状图（不依赖外部渲染器）。"""
    nodes = [item for item in (plan.get("mermaidNodes") or []) if isinstance(item, dict)]
    edges = [item for item in (plan.get("mermaidEdges") or []) if isinstance(item, dict)]
    if not nodes or not edges:
        return False
    lookup = {str(item.get("id")): str(item.get("label") or "") for item in nodes}
    children: dict[str, list[str]] = {node_id: [] for node_id in lookup}
    has_parent: set[str] = set()
    for edge in edges:
        source = str(edge.get("from") or "")
        target = str(edge.get("to") or "")
        if source in lookup and target in lookup:
            children[source].append(target)
            has_parent.add(target)
    roots = [node_id for node_id in lookup if node_id not in has_parent]
    root = roots[0] if roots else next(iter(lookup))
    levels: list[list[str]] = []
    current = [root]
    seen: set[str] = {root}
    while current and len(levels) < 4:
        levels.append(current)
        next_level: list[str] = []
        for node_id in current:
            for child in children.get(node_id, []):
                if child not in seen:
                    seen.add(child)
                    next_level.append(child)
        current = next_level
    if not levels:
        return False
    row_h = h / len(levels)
    positions: dict[str, tuple[float, float, float, float]] = {}
    for level_index, level_nodes in enumerate(levels):
        count = len(level_nodes)
        box_w = min(1.4, (w - 0.2) / max(1, count) * 0.82)
        box_h = min(0.42, row_h * 0.66)
        for index, node_id in enumerate(level_nodes):
            center_x = x + w * ((index + 0.5) / count)
            center_y = y + row_h * (level_index + 0.5)
            positions[node_id] = (center_x, center_y, box_w, box_h)
            _add_shape(
                slide,
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x=center_x - box_w / 2,
                y=center_y - box_h / 2,
                w=box_w,
                h=box_h,
                fill="cream",
                line="green",
                line_width=1.0,
                radius=0.12,
                shadow=True,
                shadow_alpha=8,
            )
            _add_text(
                slide,
                lookup.get(node_id, ""),
                x=center_x - box_w / 2,
                y=center_y - box_h / 2 + 0.03,
                w=box_w,
                h=box_h - 0.06,
                size=8.0,
                color="ink",
                bold=True,
                align=PP_ALIGN.CENTER,
                anchor=MSO_ANCHOR.MIDDLE,
            )
    for edge in edges:
        source = str(edge.get("from") or "")
        target = str(edge.get("to") or "")
        if source not in positions or target not in positions:
            continue
        sx, sy, _sw, sh = positions[source]
        tx, ty, _tw, th = positions[target]
        connector = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            Inches(sx),
            Inches(sy + sh / 2),
            Inches(tx),
            Inches(ty - th / 2),
        )
        connector.line.color.rgb = _rgb("green")
        connector.line.width = Pt(1.1)
        try:
            line = connector.line._get_or_add_ln()
            tail = line.makeelement(qn("a:tailEnd"), {"type": "triangle"})
            line.append(tail)
        except Exception:  # noqa: BLE001 - 箭头样式失败不影响连线
            pass
    return True


def _visual_plan_note(plan: dict[str, Any]) -> list[str]:
    plan_type = str(plan.get("type") or "")
    lines: list[str] = []
    if plan_type == "mermaid" and plan.get("mermaid"):
        lines.append("配图方案（Mermaid，可直接渲染）：")
        lines.extend(str(plan["mermaid"]).splitlines())
    elif plan_type == "python-pptx" and plan.get("python"):
        lines.append("配图方案（python-pptx 代码，可直接运行）：")
        lines.extend(str(plan["python"]).splitlines())
    elif plan_type == "ai-prompt":
        lines.append("配图方案（AI 绘画提示词）：")
        if plan.get("promptZh"):
            lines.append(f"中文：{plan['promptZh']}")
        if plan.get("promptEn"):
            lines.append(f"English: {plan['promptEn']}")
    elif plan_type == "ppt-params":
        lines.append(f"配图方案（PPT 操作参数）：{plan.get('summary') or ''}")
        note = (plan.get("params") or {}).get("note")
        if note:
            lines.append(str(note))
    return lines


# ---------------------------------------------------------------------------
# 配图要求解析：把 visualHint 还原成可绘制的语义图形
# ---------------------------------------------------------------------------

_CN_NUMBERS = {
    "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
}

_COLOR_WORDS = (
    ("金", "gold"), ("黄", "gold"), ("红", "red"), ("绿", "green"),
    ("橙", "orange"), ("蓝", "blue"), ("白", "card"),
)

_SHAPE_WORDS = (
    ("半圆", "half_circle"), ("正方形", "square"), ("长方形", "rect"),
    ("矩形", "rect"), ("纸条", "rect"), ("方块", "square"), ("方形", "square"),
    ("三角形", "triangle"), ("圆", "circle"),
)

_NUMBER_TOKEN = r"(\d+|[一二两三四五六七八九十])"


def _hint_int(token: str | None, default: int = 1) -> int:
    """把「2 / 两 / 三」这类数量词转换为整数。"""
    if not token:
        return default
    token = token.strip()
    if token.isdigit():
        return int(token)
    return _CN_NUMBERS.get(token, default)


def _hint_shape(text: str, default: str = "circle") -> str:
    """从配图要求里识别图形类型，半圆优先于圆。"""
    for word, kind in _SHAPE_WORDS:
        if word in text:
            return kind
    return default


def _hint_color(text: str, default: str = "gold") -> str:
    for word, key in _COLOR_WORDS:
        if word in text:
            return key
    return default


def _hint_label(text: str) -> str:
    """识别形如 1/2、3/4 的分数标注。"""
    match = re.search(r"(\d+/\d+)", text)
    return match.group(1) if match else ""


def _hint_mark(text: str) -> str:
    """识别打勾 / 打叉。"""
    if re.search(r"打叉|红叉|✗|×", text):
        return "cross"
    if re.search(r"打勾|绿勾|✓|√", text):
        return "check"
    return ""


def _hint_parts(text: str) -> int:
    """识别等分份数：四等分 / 2 等分 / 分 3 份 / 4 格。"""
    if "四等分" in text:
        return 4
    match = re.search(_NUMBER_TOKEN + r"\s*(?:等分|份|格)", text)
    if match:
        return max(1, min(8, _hint_int(match.group(1))))
    if "左半" in text or "右半" in text or "对折" in text:
        return 2
    return 1


def _hint_fill(text: str) -> int:
    """识别涂色份数；「完整」视为整块涂色。"""
    if "完整" in text:
        return 1
    match = re.search(r"涂\s*" + _NUMBER_TOKEN + r"\s*(?:格|份|块)", text)
    if match:
        return max(1, min(8, _hint_int(match.group(1))))
    match = re.search(_NUMBER_TOKEN + r"\s*(?:格|份|块)\s*涂", text)
    if match:
        return max(1, min(8, _hint_int(match.group(1))))
    if re.search(r"[左右]半涂|涂[左右]半", text):
        return 1
    # 「左半边涂红色」「涂出其中一半」这类口语化写法，默认涂 1 份
    if re.search(r"涂[红黄绿蓝紫橙黑白]", text) or any(
        word in text for word in ("涂色", "涂上", "涂成", "涂出")
    ):
        return 1
    return 0


def _hint_position(text: str) -> str:
    for word in ("左上", "右上", "左下", "右下", "左半", "右半"):
        if word in text:
            return word
    return ""


def _figure_from_text(
    text: str,
    *,
    shape: str = "circle",
    color: str = "gold",
) -> dict[str, Any] | None:
    """把一句配图描述解析成单个图形参数。"""
    text = text.strip()
    if not text:
        return None
    parts = _hint_parts(text)
    fill = _hint_fill(text)
    fold = "虚线" in text or "对折线" in text
    if fold and parts < 2:
        parts = 2
    if parts > 1 and fill > parts:
        fill = parts
    return {
        "shape": _hint_shape(text, shape),
        "parts": parts,
        "fill": fill,
        "position": _hint_position(text),
        "color": _hint_color(text, color),
        "mark": _hint_mark(text),
        "label": _hint_label(text),
        "fold": fold,
        "unequal": "大小不等" in text or "不等" in text,
    }


def _hint_count(text: str) -> int:
    """识别「1 个圆 / 两张 / 三组」里的数量，排除「第 1 张」。"""
    match = re.search(r"(?<!第)" + _NUMBER_TOKEN + r"\s*(?:个|张|组)", text)
    if match:
        return max(1, min(6, _hint_int(match.group(1))))
    return 1


def _parse_hint_figures(hint: str) -> list[dict[str, Any]]:
    """把配图要求拆成图形列表；无法解析时返回空列表，交回原有降级链。"""
    text = re.sub(r"^配图[：:]\s*", "", (hint or "").strip())
    if not text:
        return []
    if any(word in text for word in ("板书", "时间轴", "路线图", "结构图")):
        return []

    default_shape = _hint_shape(text, "circle")
    default_color = _hint_color(text, "gold")
    figures: list[dict[str, Any]] = []

    # ① 逐张描述：第 1 张完整 / 第 2 张画竖虚线 / 第 3 张左半涂色
    if re.search(r"第\s*[1-9]\s*张", text):
        chunks = re.split(r"第\s*[1-9]\s*张", text)
        head = chunks[0]
        shape = _hint_shape(head, default_shape)
        color = _hint_color(head, default_color)
        for segment in chunks[1:]:
            figure = _figure_from_text(segment, shape=shape, color=color)
            if figure:
                figures.append(figure)
        return figures

    # ② 左图 / 右图：先于「图 N」判断，避免把「左图 2」误当成图 2
    if "左图" in text and "右图" in text:
        head, rest = text.split("左图", 1)
        left_text, right_text = rest.split("右图", 1)
        shape = _hint_shape(head, default_shape)
        color = _hint_color(head, default_color)
        for segment in (left_text, right_text):
            figure = _figure_from_text(segment, shape=shape, color=color)
            if figure:
                figures.append(figure)
        return figures

    # ③ 并列图组：①②③ 或 图 1 / 图 2
    chunks = re.split(r"[①②③④⑤⑥]", text)
    if len(chunks) > 1:
        for segment in chunks[1:]:
            figure = _figure_from_text(segment, shape=default_shape, color=default_color)
            if figure:
                figures.append(figure)
        return figures
    chunks = re.split(r"(?<![左右])图\s*[1-9]\s*", text)
    if len(chunks) > 1:
        for segment in chunks[1:]:
            figure = _figure_from_text(segment, shape=default_shape, color=default_color)
            if figure:
                figures.append(figure)
        return figures

    # ④ 分别涂 3/5、2/5：按分数拆成两张图
    labels = re.findall(r"\d+/\d+", text)
    if "分别" in text and len(labels) >= 2:
        shape = _hint_shape(text, "rect")
        for label in labels:
            numerator, denominator = label.split("/")
            figures.append({
                "shape": shape,
                "parts": max(1, min(8, int(denominator))),
                "fill": max(1, min(8, int(numerator))),
                "position": "",
                "color": _hint_color(text, default_color),
                "mark": "",
                "label": label,
                "fold": False,
                "unequal": False,
            })
        return figures

    # ⑤ 「1/2 与 1/4 的对比图」这类只给分数的描述
    if len(labels) == 2 and re.search(r"与|和|、", text):
        shape = _hint_shape(text, "circle")
        for label in labels:
            numerator, denominator = label.split("/")
            figures.append({
                "shape": shape,
                "parts": max(1, min(8, int(denominator))),
                "fill": max(1, min(8, int(numerator))),
                "position": "",
                "color": _hint_color(text, default_color),
                "mark": "",
                "label": label,
                "fold": False,
                "unequal": False,
            })
        return figures

    # ⑥ 通用：按分号和逗号切开，逐句解析；涂色 / 标注等补充说明合并到上一张图
    for clause in re.split(r"[；;，,]", text):
        clause = clause.strip()
        if not clause:
            continue
        if not any(word in clause for word, _ in _SHAPE_WORDS):
            if not figures:
                continue
            last = figures[-1]
            fill = _hint_fill(clause)
            if fill:
                last["fill"] = min(last["parts"], max(int(last["fill"]), fill))
                if not last.get("position"):
                    last["position"] = _hint_position(clause)
                last["color"] = _hint_color(clause, last["color"])
            if "虚线" in clause or "对折线" in clause:
                last["fold"] = True
                last["parts"] = max(2, last["parts"])
            mark = _hint_mark(clause)
            if mark:
                last["mark"] = mark
            label = _hint_label(clause)
            if label and not last.get("label"):
                last["label"] = label
            continue
        figure = _figure_from_text(clause, shape=default_shape, color=default_color)
        if not figure:
            continue
        count = _hint_count(clause)
        for index in range(count):
            item = dict(figure)
            # 大小不等时交替缩放，避免每个图形看起来一模一样
            item["scale"] = 0.8 if (figure["unequal"] and index % 2 == 0) else 1.0
            figures.append(item)
    return figures


# ---------------------------------------------------------------------------
# 语义化图解绘制：等分、涂色、打勾打叉、虚线折痕
# ---------------------------------------------------------------------------


def _partition_grid(parts: int, shape: str) -> tuple[int, int]:
    """按图形和份数决定切分方式；长方形默认横向等分。"""
    if shape == "rect" and parts >= 2:
        return parts, 1
    if parts <= 1:
        return 1, 1
    if parts == 2:
        return 2, 1
    if parts == 3:
        return 3, 1
    if parts == 4:
        return 2, 2
    if parts == 5:
        return 5, 1
    if parts == 6:
        return 3, 2
    return 4, 2


def _fill_indices(figure: dict[str, Any], cols: int, rows: int) -> list[int]:
    """计算需要涂色的格子下标；支持左上/右上/左下/右下/左半/右半。"""
    count = int(figure.get("fill") or 0)
    total = cols * rows
    if count <= 0 or total <= 0:
        return []
    count = min(count, total)
    position = str(figure.get("position") or "")
    starts = {
        "左上": 0,
        "右上": max(0, cols - 1),
        "左下": max(0, (rows - 1) * cols),
        "右下": max(0, total - 1),
        "左半": 0,
        "右半": 1 if total >= 2 else 0,
    }
    start = starts.get(position, 0)
    return [(start + index) % total for index in range(count)]


def _add_freeform(
    slide,
    points: list[tuple[float, float]],
    fill: str | None,
    *,
    line: str = "green",
    line_width: float = 1.0,
):
    """用多边形近似绘制扇形 / 不规则分块，保证各版本 PowerPoint 都能打开。"""
    if len(points) < 3:
        return None
    # 局部坐标使用「千分之一英寸」的整数，避免 freeform 取整后把扇形压成直线
    local = [(round(x * 1000), round(y * 1000)) for x, y in points]
    builder = slide.shapes.build_freeform(local[0][0], local[0][1], scale=914.4)
    builder.add_line_segments(local[1:], close=True)
    shape = builder.convert_to_shape()
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = _rgb(fill)
    else:
        shape.fill.background()
    shape.line.color.rgb = _rgb(line)
    shape.line.width = Pt(line_width)
    return shape


def _sector_points(
    cx: float,
    cy: float,
    radius: float,
    start_deg: float,
    end_deg: float,
    steps: int = 16,
) -> list[tuple[float, float]]:
    points = [(cx, cy)]
    for step in range(steps + 1):
        angle = math.radians(start_deg + (end_deg - start_deg) * step / steps)
        points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return points


def _circle_angle_ranges(parts: int) -> list[tuple[float, float]]:
    """圆的等分角度；顺序为左上、右上、左下、右下的阅读顺序。"""
    if parts == 2:
        return [(90, 270), (-90, 90)]  # 左半、右半
    if parts == 3:
        return [(-90, 30), (30, 150), (150, 270)]
    if parts == 4:
        return [(180, 270), (270, 360), (90, 180), (0, 90)]
    step = 360 / max(1, parts)
    return [(-90 + step * index, -90 + step * (index + 1)) for index in range(parts)]


def _circle_fill_flags(figure: dict[str, Any], parts: int) -> set[int]:
    count = int(figure.get("fill") or 0)
    if count <= 0:
        return set()
    count = min(count, parts)
    position = str(figure.get("position") or "")
    start = {"左上": 0, "右上": 1, "左下": 2, "右下": 3, "左半": 0, "右半": 1}.get(position, 0)
    return {(start + index) % parts for index in range(count)}


def _draw_circle_figure(slide, figure: dict[str, Any], cx: float, cy: float, size: float) -> None:
    radius = size / 2
    color = figure["color"]
    parts = int(figure.get("parts") or 1)
    fill = int(figure.get("fill") or 0)

    if parts <= 1:
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx - radius,
            y=cy - radius,
            w=size,
            h=size,
            fill=color if fill else "cream",
            line="green",
            line_width=1.4,
            shadow=bool(fill),
            shadow_alpha=10,
        )
        return

    # 留白底圆
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius,
        y=cy - radius,
        w=size,
        h=size,
        fill="cream",
        line="green",
        line_width=1.4,
    )

    if parts == 2 and figure.get("unequal"):
        # 大小不等的两半：竖直弦偏左，直观展示「没有平均分」
        offset = -radius * 0.34
        half_chord = math.sqrt(max(radius * radius - offset * offset, 0.0))
        top_angle = math.degrees(math.atan2(-half_chord, offset))
        bottom_angle = math.degrees(math.atan2(half_chord, offset))
        start, end = top_angle, bottom_angle
        if end > start:
            end -= 360
        points = [(cx + offset, cy - half_chord)]
        steps = 18
        for step in range(1, steps + 1):
            angle = math.radians(start + (end - start) * step / steps)
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
        if fill:
            _add_freeform(slide, points, color)
        connector = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            Inches(cx + offset),
            Inches(cy - half_chord),
            Inches(cx + offset),
            Inches(cy + half_chord),
        )
        connector.line.color.rgb = _rgb("green")
        connector.line.width = Pt(1.1)
    else:
        ranges = _circle_angle_ranges(parts)
        filled = _circle_fill_flags(figure, parts)
        for index, (start, end) in enumerate(ranges):
            if index in filled:
                _add_freeform(slide, _sector_points(cx, cy, radius, start, end), color)
        for start, _end in ranges[1:]:
            angle = math.radians(start)
            connector = slide.shapes.add_connector(
                MSO_CONNECTOR.STRAIGHT,
                Inches(cx),
                Inches(cy),
                Inches(cx + radius * math.cos(angle)),
                Inches(cy + radius * math.sin(angle)),
            )
            connector.line.color.rgb = _rgb("green")
            connector.line.width = Pt(1.0)
            if figure.get("fold"):
                connector.line.dash_style = MSO_LINE.DASH

    # 外圈重描，压住扇区边缘的锯齿
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius,
        y=cy - radius,
        w=size,
        h=size,
        fill=None,
        line="green",
        line_width=1.4,
    )


def _draw_rect_figure(slide, figure: dict[str, Any], cx: float, cy: float, size: float) -> None:
    shape = figure["shape"]
    width = size if shape == "square" else size * 1.4
    height = size if shape == "square" else size * 0.92
    left, top = cx - width / 2, cy - height / 2
    parts = int(figure.get("parts") or 1)
    cols, rows = _partition_grid(parts, shape)
    color = figure["color"]

    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=left,
        y=top,
        w=width,
        h=height,
        fill="cream",
        line="green",
        line_width=1.2,
        radius=0.05,
    )
    if parts > 1:
        cell_w, cell_h = width / cols, height / rows
        for index in _fill_indices(figure, cols, rows):
            row, col = divmod(index, cols)
            _add_shape(
                slide,
                MSO_SHAPE.RECTANGLE,
                x=left + col * cell_w + 0.015,
                y=top + row * cell_h + 0.015,
                w=cell_w - 0.03,
                h=cell_h - 0.03,
                fill=color,
            )
        for row in range(1, rows):
            _add_shape(
                slide,
                MSO_SHAPE.RECTANGLE,
                x=left,
                y=top + row * cell_h - 0.006,
                w=width,
                h=0.012,
                fill="green",
            )
        for col in range(1, cols):
            _add_shape(
                slide,
                MSO_SHAPE.RECTANGLE,
                x=left + col * cell_w - 0.006,
                y=top,
                w=0.012,
                h=height,
                fill="green",
            )
    elif figure.get("fill"):
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=left,
            y=top,
            w=width,
            h=height,
            fill=color,
            line="green",
            line_width=1.2,
            radius=0.05,
        )

    if figure.get("fold"):
        connector = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            Inches(cx),
            Inches(top + 0.03),
            Inches(cx),
            Inches(top + height - 0.03),
        )
        connector.line.color.rgb = _rgb("green")
        connector.line.width = Pt(1.0)
        connector.line.dash_style = MSO_LINE.DASH


def _draw_half_circle(slide, figure: dict[str, Any], cx: float, cy: float, size: float) -> None:
    radius = size / 2
    _add_freeform(slide, _sector_points(cx, cy, radius, 0, 180, steps=20), figure["color"])
    # 底边
    connector = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT,
        Inches(cx - radius),
        Inches(cy),
        Inches(cx + radius),
        Inches(cy),
    )
    connector.line.color.rgb = _rgb("green")
    connector.line.width = Pt(1.0)


def _draw_semantic_figure(slide, figure: dict[str, Any], cx: float, cy: float, size: float) -> None:
    shape = figure["shape"]
    if shape in ("rect", "square"):
        _draw_rect_figure(slide, figure, cx, cy, size)
        half_height = (size if shape == "square" else size * 0.92) / 2
    elif shape == "half_circle":
        _draw_half_circle(slide, figure, cx, cy, size)
        half_height = size / 2
    elif shape == "triangle":
        left, top = cx - size / 2, cy - size / 2
        _add_shape(
            slide,
            MSO_SHAPE.ISOSCELES_TRIANGLE,
            x=left,
            y=top,
            w=size,
            h=size,
            fill=figure["color"] if figure.get("fill") else "cream",
            line="green",
            line_width=1.2,
        )
        half_height = size / 2
    else:
        _draw_circle_figure(slide, figure, cx, cy, size)
        half_height = size / 2

    mark = figure.get("mark")
    if mark in ("cross", "check"):
        _add_text(
            slide,
            "✗" if mark == "cross" else "✓",
            x=cx + size * 0.24,
            y=cy - half_height - size * 0.34,
            w=0.3,
            h=0.3,
            size=14,
            color="red" if mark == "cross" else "green",
            bold=True,
            align=PP_ALIGN.CENTER,
            name="Segoe UI Symbol",
        )
    label = figure.get("label")
    if label:
        _add_text(
            slide,
            label,
            x=cx - size * 0.6,
            y=cy + half_height + 0.04,
            w=size * 1.2,
            h=0.22,
            size=9.5,
            color="green_deep",
            bold=True,
            align=PP_ALIGN.CENTER,
            name=FONT_NUM,
        )


def _figure_grid(count: int) -> tuple[int, int]:
    if count <= 1:
        return 1, 1
    if count == 2:
        return 2, 1
    if count == 3:
        return 3, 1
    if count == 4:
        return 2, 2
    if count <= 6:
        return 3, 2
    return 4, 2


def _render_semantic_diagram(
    slide,
    figures: list[dict[str, Any]],
    x: float,
    y: float,
    w: float,
    h: float,
) -> bool:
    """按配图要求绘制等分 / 涂色 / 对错图解；无有效图形时返回 False。"""
    if not figures:
        return False
    cols, rows = _figure_grid(len(figures))
    cell_w, cell_h = w / cols, h / rows
    base_size = min(cell_w * 0.62, cell_h * 0.6)
    for index, figure in enumerate(figures):
        row, col = divmod(index, cols)
        cx = x + cell_w * (col + 0.5)
        cy = y + cell_h * (row + 0.5) - 0.03
        size = base_size * float(figure.get("scale") or 1.0)
        _draw_semantic_figure(slide, figure, cx, cy, size)
    return True


# ---------------------------------------------------------------------------
# 场景类配图：用形状拼出课文里的自然与生活场景
# ---------------------------------------------------------------------------

_SCENE_WORDS = {
    "rain": ("雨",),
    "autumn": ("秋天", "秋季", "落叶", "金黄"),
    "tree": ("树", "林", "银杏", "柳", "植物"),
    "sun": ("太阳", "阳光", "日出", "晴天"),
    "snow": ("雪",),
    "mountain": ("山", "岭", "坡"),
    "river": ("河", "溪", "江", "湖", "潭", "海", "池"),
    "flower": ("花", "草"),
    "moon": ("月亮", "月夜", "星星", "夜空", "月光"),
    "house": ("房子", "房屋", "家", "村", "屋", "校园"),
    "bird": ("鸟", "燕", "雁", "动物"),
    "cloud": ("云",),
}


def _scene_flags(text: str) -> dict[str, bool]:
    """从课题、标题与配图要求里识别场景元素。"""
    text = text or ""
    return {key: any(word in text for word in words) for key, words in _SCENE_WORDS.items()}


def _scene_caption(flags: dict[str, bool], lesson: str) -> str:
    """场景插画的说明文字，替换与画面不一致的原始配图要求。"""
    title = lesson.strip() or "本课场景"
    house_word = "校舍" if ("校园" in title or "学校" in title) else "村舍"
    river_word = "池塘" if "池" in title else "河"
    words: list[str] = []
    # 雨会自动带出云，秋天会自动带出秋树，说明里也要体现
    if flags.get("rain"):
        words.extend(["云", "雨"])
    if flags.get("autumn"):
        words.extend(["秋树", "落叶"])
    if flags.get("snow"):
        words.extend(["雪", "雪人"])
    for key, word in (
        ("sun", "阳光"), ("moon", "月色"), ("snow", "雪"),
        ("tree", "树"), ("mountain", "山"), ("river", river_word),
        ("flower", "花草"), ("house", house_word), ("bird", "飞鸟"),
    ):
        if flags.get(key) and word not in words:
            words.append(word)
    if not words:
        return f"{title}：场景插画"
    return f"{title}：{'、'.join(words)}"


def _scene_sun(slide, cx: float, cy: float, radius: float) -> None:
    """柔和光晕 + 实心太阳，避免齿状光芒。"""
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius * 1.8,
        y=cy - radius * 1.8,
        w=radius * 3.6,
        h=radius * 3.6,
        fill="gold_faint",
    )
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius,
        y=cy - radius,
        w=radius * 2,
        h=radius * 2,
        fill="gold",
    )


def _scene_moon(slide, cx: float, cy: float, radius: float) -> None:
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius * 1.8,
        y=cy - radius * 1.8,
        w=radius * 3.6,
        h=radius * 3.6,
        fill="gold_faint",
    )
    _add_shape(slide, MSO_SHAPE.OVAL, x=cx - radius, y=cy - radius, w=radius * 2, h=radius * 2, fill="gold")
    # 用天空色圆遮出月牙，必须与场景底色一致
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - radius * 0.35,
        y=cy - radius * 1.05,
        w=radius * 2,
        h=radius * 2,
        fill="sky",
    )


def _scene_cloud(slide, x: float, y: float) -> None:
    """三团叠加的软云，去掉硬描边。"""
    for dx, dy, cw, ch in ((0.0, 0.07, 0.34, 0.17), (0.16, 0.0, 0.42, 0.23), (0.44, 0.07, 0.3, 0.16)):
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=x + dx,
            y=y + dy,
            w=cw,
            h=ch,
            fill="white_soft",
        )


def _scene_mountains(slide, x: float, ground_y: float, snow: bool = False) -> None:
    """远山用三层低饱和绿，雪天自动加雪顶。"""
    for offset, width, height, color in (
        (0.2, 1.0, 0.62, "green_mist"),
        (0.8, 1.35, 0.86, "green"),
        (1.7, 0.9, 0.52, "green_mid"),
    ):
        _add_shape(
            slide,
            MSO_SHAPE.ISOSCELES_TRIANGLE,
            x=x + offset,
            y=ground_y - height,
            w=width,
            h=height,
            fill=color,
        )
        if snow:
            cap_w, cap_h = width * 0.34, height * 0.3
            _add_shape(
                slide,
                MSO_SHAPE.ISOSCELES_TRIANGLE,
                x=x + offset + (width - cap_w) / 2,
                y=ground_y - height,
                w=cap_w,
                h=cap_h,
                fill="white_soft",
            )


def _scene_tree(slide, cx: float, ground_y: float, autumn: bool) -> None:
    # 树影，让树落地而不是悬空
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - 0.3,
        y=ground_y - 0.05,
        w=0.6,
        h=0.1,
        fill="green_mist",
    )
    trunk_w, trunk_h = 0.12, 0.5
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=cx - trunk_w / 2,
        y=ground_y - trunk_h,
        w=trunk_w,
        h=trunk_h,
        fill="gold_pale",
        radius=0.3,
    )
    top = ground_y - trunk_h
    # 两根伸向树冠外的枝干，让树不只是一个圆球
    for direction in (-1, 1):
        branch = _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx - 0.015,
            y=top + 0.12,
            w=0.03,
            h=0.34,
            fill="gold_pale",
            radius=0.4,
        )
        branch.rotation = direction * 38
    canopy = ("orange", "gold", "red") if autumn else ("green", "green_mid", "green")
    for dx, dy, size, color in (
        (-0.24, 0.0, 0.34, canopy[1]),
        (-0.06, -0.18, 0.44, canopy[0]),
        (0.2, -0.08, 0.36, canopy[2]),
        (0.1, 0.04, 0.3, canopy[0]),
    ):
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx + dx,
            y=top + dy,
            w=size,
            h=size,
            fill=color,
        )
    if autumn:
        # 枝头的果子，给秋树一点焦点
        for dx, dy, color in ((-0.12, 0.14, "red"), (0.06, -0.02, "orange"), (0.24, 0.12, "red")):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=cx + dx,
                y=top + dy,
                w=0.05,
                h=0.05,
                fill=color,
            )


def _scene_house(slide, x: float, ground_y: float) -> None:
    body_w, body_h = 0.54, 0.34
    # 房屋投影
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=x - 0.04,
        y=ground_y - 0.05,
        w=body_w + 0.12,
        h=0.1,
        fill="green_mist",
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x,
        y=ground_y - body_h,
        w=body_w,
        h=body_h,
        fill="white_soft",
        line="green_mid",
        line_width=0.75,
        radius=0.05,
    )
    # 烟囱在屋顶之后画，只露出上半截
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x + body_w - 0.2,
        y=ground_y - body_h - 0.38,
        w=0.07,
        h=0.2,
        fill="terracotta",
        radius=0.2,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ISOSCELES_TRIANGLE,
        x=x - 0.07,
        y=ground_y - body_h - 0.25,
        w=body_w + 0.14,
        h=0.27,
        fill="terracotta",
    )
    # 三团炊烟
    for dx, dy, size in ((0.02, -0.06, 0.05), (0.06, -0.13, 0.07), (0.03, -0.21, 0.09)):
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=x + body_w - 0.2 + dx,
            y=ground_y - body_h - 0.38 + dy,
            w=size,
            h=size,
            fill="white_soft",
        )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x + 0.08,
        y=ground_y - 0.23,
        w=0.1,
        h=0.23,
        fill="green_mid",
        radius=0.15,
    )
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=x + 0.145,
        y=ground_y - 0.12,
        w=0.02,
        h=0.02,
        fill="gold",
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x + 0.33,
        y=ground_y - 0.22,
        w=0.1,
        h=0.1,
        fill="gold",
        radius=0.1,
    )
    # 右侧小栅栏
    for offset in (body_w + 0.06, body_w + 0.14, body_w + 0.22):
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=x + offset,
            y=ground_y - 0.13,
            w=0.016,
            h=0.13,
            fill="gold_pale",
            radius=0.4,
        )
    for offset_y in (0.05, 0.1):
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=x + body_w + 0.04,
            y=ground_y - offset_y,
            w=0.24,
            h=0.016,
            fill="gold_pale",
            radius=0.5,
        )


def _scene_flowers(slide, x: float, ground_y: float) -> None:
    """三株小花：茎 + 叶 + 五瓣花冠。"""
    for offset, height, petal_color in ((0.04, 0.26, "red"), (0.22, 0.32, "gold"), (0.38, 0.24, "orange")):
        stem_x = x + offset
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=stem_x,
            y=ground_y - height,
            w=0.018,
            h=height,
            fill="green",
            radius=0.5,
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=stem_x - 0.05,
            y=ground_y - height * 0.55,
            w=0.08,
            h=0.045,
            fill="green_mid",
        )
        center_x, center_y = stem_x + 0.009, ground_y - height - 0.03
        for angle in range(0, 360, 72):
            radians = math.radians(angle)
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=center_x + math.cos(radians) * 0.05 - 0.03,
                y=center_y + math.sin(radians) * 0.05 - 0.03,
                w=0.06,
                h=0.06,
                fill=petal_color,
            )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=center_x - 0.025,
            y=center_y - 0.025,
            w=0.05,
            h=0.05,
            fill="gold_mist",
        )


def _scene_birds(slide, x: float, y: float) -> None:
    """两只简笔飞鸟，两翼在中间交汇成 V 形。"""
    for offset, dy in ((0.0, 0.0), (0.22, -0.09)):
        bx, by = x + offset, y + dy
        for start_dx, start_dy, end_dx, end_dy in ((-0.07, -0.05, 0.0, 0.0), (0.0, 0.0, 0.07, -0.05)):
            connector = slide.shapes.add_connector(
                MSO_CONNECTOR.STRAIGHT,
                Inches(bx + start_dx),
                Inches(by + start_dy),
                Inches(bx + end_dx),
                Inches(by + end_dy),
            )
            connector.line.color.rgb = _rgb("ink_soft")
            connector.line.width = Pt(1.2)


def _scene_treeline(slide, x: float, w: float, ground_y: float) -> None:
    """远景小树，高低错落成一排树丛，拉开画面纵深。"""
    for offset, scale, color in (
        (0.58, 0.9, "green_mist"),
        (0.645, 0.7, "soft"),
        (0.7, 1.0, "green_mist"),
        (0.755, 0.78, "soft"),
        (0.81, 0.9, "green_mist"),
    ):
        tree_x = x + w * offset
        trunk_h = 0.14 * scale
        canopy = 0.26 * scale
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=tree_x - 0.008,
            y=ground_y - trunk_h,
            w=0.016,
            h=trunk_h,
            fill="gold_pale",
            radius=0.4,
        )
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=tree_x - canopy / 2,
            y=ground_y - trunk_h - canopy * 0.82,
            w=canopy,
            h=canopy,
            fill=color,
        )


def _scene_snow_tree(slide, cx: float, ground_y: float) -> None:
    """雪松：三层树冠叠出冬季轮廓，顶部压一层雪。"""
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - 0.24,
        y=ground_y - 0.05,
        w=0.48,
        h=0.1,
        fill="blue_mist",
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=cx - 0.04,
        y=ground_y - 0.14,
        w=0.08,
        h=0.14,
        fill="gold_pale",
        radius=0.3,
    )
    for width, height, base_offset, color in (
        (0.44, 0.3, 0.12, "green_mid"),
        (0.34, 0.26, 0.3, "green"),
        (0.24, 0.22, 0.48, "green_mid"),
    ):
        _add_shape(
            slide,
            MSO_SHAPE.ISOSCELES_TRIANGLE,
            x=cx - width / 2,
            y=ground_y - base_offset - height,
            w=width,
            h=height,
            fill=color,
        )
        cap_w, cap_h = width * 0.42, height * 0.34
        _add_shape(
            slide,
            MSO_SHAPE.ISOSCELES_TRIANGLE,
            x=cx - cap_w / 2,
            y=ground_y - base_offset - height,
            w=cap_w,
            h=cap_h,
            fill="white_soft",
        )


def _scene_snowman(slide, cx: float, ground_y: float) -> None:
    """雪天的小雪人，给画面一个视觉焦点。"""
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - 0.12,
        y=ground_y - 0.26,
        w=0.24,
        h=0.24,
        fill="white_soft",
        line="blue_mist",
        line_width=0.5,
    )
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=cx - 0.085,
        y=ground_y - 0.42,
        w=0.17,
        h=0.17,
        fill="white_soft",
        line="blue_mist",
        line_width=0.5,
    )
    for dx in (-0.035, 0.02):
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx + dx,
            y=ground_y - 0.375,
            w=0.018,
            h=0.018,
            fill="ink",
        )
    nose = _add_shape(
        slide,
        MSO_SHAPE.ISOSCELES_TRIANGLE,
        x=cx,
        y=ground_y - 0.368,
        w=0.08,
        h=0.028,
        fill="orange",
    )
    nose.rotation = 90
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=cx - 0.065,
        y=ground_y - 0.435,
        w=0.13,
        h=0.03,
        fill="terracotta",
        radius=0.4,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=cx - 0.04,
        y=ground_y - 0.49,
        w=0.08,
        h=0.07,
        fill="terracotta",
        radius=0.25,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=cx - 0.085,
        y=ground_y - 0.295,
        w=0.17,
        h=0.035,
        fill="red",
        radius=0.5,
    )


def _render_scene_diagram(
    slide,
    flags: dict[str, bool],
    x: float,
    y: float,
    w: float,
    h: float,
) -> bool:
    """按场景关键词拼出一幅简笔插画；没有可识别元素时返回 False。"""
    if not any(flags.values()):
        return False
    # 户外场景默认补一个太阳，避免画面太空
    if not any(flags.get(key) for key in ("sun", "moon", "rain", "snow", "cloud")) and any(
        flags.get(key) for key in ("tree", "flower", "house", "mountain", "river")
    ):
        flags = {**flags, "sun": True}

    # 天空底：让整块图解区成为一张完整的画，而不是浮在页面上的碎片
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x,
        y=y,
        w=w,
        h=h,
        fill="sky",
        radius=0.06,
    )
    ground_y = y + h * 0.78

    # 天空：太阳 / 月亮 / 星星
    if flags.get("sun"):
        _scene_sun(slide, x + w * 0.86, y + h * 0.2, 0.13)
    if flags.get("moon"):
        _scene_moon(slide, x + w * 0.86, y + h * 0.2, 0.13)
        for sx, sy in ((0.6, 0.1), (0.68, 0.26), (0.9, 0.36), (0.55, 0.3)):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * sx,
                y=y + h * sy,
                w=0.035,
                h=0.035,
                fill="gold",
            )
    if flags.get("cloud") or flags.get("rain") or flags.get("snow"):
        _scene_cloud(slide, x + w * 0.44, y + 0.06)

    # 远山与丘陵
    if flags.get("mountain"):
        _scene_mountains(slide, x + w * 0.5, ground_y, snow=bool(flags.get("snow")))
    elif not flags.get("snow") and any(
        flags.get(key) for key in ("tree", "flower", "river", "rain", "autumn", "moon", "sun", "bird")
    ):
        for offset, cw, ch, color in (
            (0.3, 0.42, 0.26, "green_mist"),
            (0.54, 0.5, 0.34, "green_soft"),
        ):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * offset,
                y=ground_y - ch,
                w=w * cw,
                h=ch,
                fill=color,
            )

    # 远景小树，把画面从「一块地」拉出纵深
    if any(flags.get(key) for key in ("tree", "autumn", "flower", "house", "river")):
        _scene_treeline(slide, x, w, ground_y)

    # 地面：圆角色带 + 浅色地平线；雪天整片换成雪地
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x + 0.03,
        y=ground_y,
        w=w - 0.06,
        h=h * 0.22,
        fill="white_soft" if flags.get("snow") else "soft",
        radius=0.06,
    )
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=x + 0.03,
        y=ground_y,
        w=w - 0.06,
        h=0.05,
        fill="blue_mist" if flags.get("snow") else "green_mist",
        radius=0.5,
    )

    # 水面
    if flags.get("river"):
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=x + w * 0.08,
            y=ground_y + h * 0.09,
            w=w * 0.84,
            h=0.16,
            fill="blue_mist",
            radius=0.45,
        )
        for index in range(4):
            _add_shape(
                slide,
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x=x + w * 0.16 + index * 0.9,
                y=ground_y + h * 0.13,
                w=0.3,
                h=0.028,
                fill="white_soft",
                radius=0.5,
            )
        # 荷叶与右岸芦苇
        for pad_x, pad_w, pad_y in ((0.22, 0.14, 0.1), (0.66, 0.12, 0.12)):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * pad_x,
                y=ground_y + h * pad_y,
                w=pad_w,
                h=0.055,
                fill="green_mid",
            )
        for dx, reeds_h in ((0.0, 0.22), (0.035, 0.28), (0.07, 0.2)):
            _add_shape(
                slide,
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x=x + w * 0.92 + dx,
                y=ground_y - reeds_h,
                w=0.012,
                h=reeds_h,
                fill="green",
                radius=0.5,
            )
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * 0.92 + dx - 0.012,
                y=ground_y - reeds_h - 0.035,
                w=0.036,
                h=0.055,
                fill="gold_mist",
            )

    # 近处灌木与草丛；雪天不画，保持雪地干净
    if not flags.get("snow"):
        for offset in (0.36, 0.9):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * offset,
                y=ground_y - 0.14,
                w=0.24,
                h=0.14,
                fill="green",
            )
        for offset in (0.34, 0.46, 0.58, 0.7, 0.82, 0.94):
            for dx, angle in ((-0.028, -16), (0.0, 0), (0.028, 16)):
                blade = _add_shape(
                    slide,
                    MSO_SHAPE.ROUNDED_RECTANGLE,
                    x=x + w * offset + dx,
                    y=ground_y - 0.07,
                    w=0.014,
                    h=0.075,
                    fill="green",
                    radius=0.5,
                )
                blade.rotation = angle

    # 房屋、树、花
    if flags.get("house"):
        _scene_house(slide, x + w * 0.5, ground_y)
    if flags.get("tree") or flags.get("autumn"):
        tree_x = x + w * (0.74 if flags.get("house") else 0.68)
        _scene_tree(slide, tree_x, ground_y, bool(flags.get("autumn")))
    if flags.get("flower"):
        flower_x = x + w * (0.62 if flags.get("house") else 0.5)
        _scene_flowers(slide, flower_x, ground_y)
    if flags.get("snow"):
        # 地面雪堆，增加冬天的层次
        for offset, mound_w, mound_h in ((0.34, 0.5, 0.12), (0.72, 0.6, 0.14)):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * offset,
                y=ground_y - mound_h + 0.02,
                w=mound_w,
                h=mound_h,
                fill="white_soft",
                line="blue_mist",
                line_width=0.6,
            )
        if not (flags.get("tree") or flags.get("autumn")):
            _scene_snow_tree(slide, x + w * 0.8, ground_y)
        # 雪地脚印，从画面左侧走向雪人
        for index in range(5):
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * (0.4 + index * 0.026),
                y=ground_y - 0.025 + (0.012 if index % 2 else 0),
                w=0.032,
                h=0.018,
                fill="blue_mist",
            )
        _scene_snowman(slide, x + w * 0.52, ground_y)

    # 天气元素
    if flags.get("rain"):
        for index in range(6):
            rx = x + w * 0.46 + index * 0.12
            connector = slide.shapes.add_connector(
                MSO_CONNECTOR.STRAIGHT,
                Inches(rx),
                Inches(y + 0.3),
                Inches(rx - 0.03),
                Inches(y + 0.48),
            )
            connector.line.color.rgb = _rgb("blue_mist")
            connector.line.width = Pt(1.1)
    if flags.get("snow"):
        for index in range(12):
            sx = 0.44 + (index % 6) * 0.09
            sy = 0.24 + (index // 6) * 0.18
            _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * sx,
                y=y + sy,
                w=0.055,
                h=0.055,
                fill="white_soft",
            )
    if flags.get("autumn"):
        for sx, sy, color, angle in (
            (0.5, 0.3, "gold", 18),
            (0.6, 0.44, "orange", -22),
            (0.7, 0.6, "red", 35),
            (0.48, 0.56, "gold", -12),
            (0.58, 0.7, "orange", 24),
            (0.8, 0.42, "red", -30),
        ):
            leaf = _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * sx,
                y=y + h * sy,
                w=0.11,
                h=0.06,
                fill=color,
            )
            leaf.rotation = angle
        # 地上的落叶，让秋意落到地面
        for sx, color, angle in ((0.42, "gold", 8), (0.66, "orange", -12), (0.78, "red", 20)):
            leaf = _add_shape(
                slide,
                MSO_SHAPE.OVAL,
                x=x + w * sx,
                y=ground_y + 0.02,
                w=0.09,
                h=0.05,
                fill=color,
            )
            leaf.rotation = angle
    if flags.get("bird") or flags.get("autumn") or flags.get("tree"):
        _scene_birds(slide, x + w * 0.62, y + h * 0.22)
    return True


def _render_lesson_flow(
    slide,
    data: dict[str, Any],
    deck_meta: dict[str, Any] | None = None,
):
    """游戏化课时页：中部图解区 + 右侧活动/提问 + 底部结论/口诀。"""
    activity = data.get("activity") or ""
    question = data.get("question") or ""
    conclusion = data.get("conclusion") or ""
    visual = (data.get("visual_hint") or "").rstrip("。")
    mnemonic = data.get("mnemonic") or ""
    if not (activity or question or conclusion):
        _render_card_list(slide, data.get("bullets") or [])
        return

    def label(text: str, x: float, y: float, color: str = "green") -> None:
        _add_text(
            slide,
            text,
            x=x,
            y=y,
            w=2.2,
            h=0.24,
            size=9,
            color=color,
            bold=True,
            char_spacing=1.5,
        )

    def body(text: str, x: float, y: float, w: float, h: float, size: float, color: str = "ink", bold: bool = False) -> None:
        _add_text(
            slide,
            text,
            x=x,
            y=y,
            w=w,
            h=h,
            size=size,
            color=color,
            bold=bold,
            line_spacing=1.35,
        )

    # 中部：图解区
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=0.6,
        y=1.62,
        w=5.92,
        h=1.98,
        fill="cream",
        line="gold_pale",
        line_width=1.0,
        radius=0.06,
    )
    plan = data.get("visual_plan") or {}
    plan_type = str(plan.get("type") or "")
    # 优先按「配图要求」还原语义图形（等分 / 涂色 / 打勾叉）；
    # 解析不出来时走 OER 图片或形状插画，避免退回无意义的通用圆点。
    hint = str(data.get("visual_hint") or "")
    meta = deck_meta or {}
    scene_text = " ".join(
        [str(meta.get("lesson") or ""), str(data.get("title") or ""), hint]
    )
    scene_flags = _scene_flags(scene_text)
    # 语文 / 科学 / 英语等场景类课文优先画场景插画；数学仍优先画等分涂色图
    scene_first = str(meta.get("subject") or "") != "数学" and any(scene_flags.values())
    scene_drawn = False
    drawn = False
    if scene_first:
        # 场景页说明短，整块图解区都留给插画，文字压在天空留白处
        drawn = _render_scene_diagram(slide, scene_flags, 0.72, 1.66, 5.72, 1.9)
        scene_drawn = drawn
    if not drawn:
        drawn = _render_semantic_diagram(slide, _parse_hint_figures(hint), 3.0, 1.66, 3.42, 1.9)
    if not drawn and plan_type == "mermaid":
        drawn = _render_mermaid_tree(slide, plan, 3.0, 1.66, 3.42, 1.9)
    elif not drawn and not hint and plan_type in ("python-pptx", "ppt-params"):
        drawn = _render_plan_shapes(slide, plan, 3.0, 1.66, 3.42, 1.9)
    if not drawn:
        drawn = _render_scene_diagram(slide, scene_flags, 3.0, 1.66, 3.42, 1.9)
        scene_drawn = drawn
    if scene_drawn:
        # 场景插画与原始「画方块/三角形」的要求不一致，改为场景说明
        lesson_name = str(meta.get("lesson") or "").strip()
        slide_title = str(data.get("title") or "").strip()
        if not lesson_name or (
            not any(_scene_flags(lesson_name).values())
            and any(_scene_flags(slide_title).values())
        ):
            lesson_name = slide_title or lesson_name
        visual = _scene_caption(scene_flags, lesson_name)
    picture = None
    if drawn:
        if scene_drawn:
            visual_size = 8.4
            text_x, text_w = 0.92, 1.95
        else:
            visual_size = 9.2 if len(visual) <= 80 else 8.2 if len(visual) <= 120 else 7.6
            text_x, text_w = 0.76, 2.1
        body(visual, text_x, 1.98, text_w, 1.4, visual_size, "ink_soft")
        label("图解区", text_x + 0.06, 1.76, "red")
    else:
        picture = _diagram_picture(deck_meta, data)
    if picture:
        picture_path, _picture_title, _source, _link = picture
        draw_w, _draw_h = _contained_size(picture_path, 3.42, 1.9)
        text_w = max(1.75, 6.42 - draw_w - 0.88)
        visual_size = 9.2 if len(visual) <= 80 else 8.2 if len(visual) <= 120 else 7.6
        body(visual, 0.76, 1.98, text_w, 1.5, visual_size, "ink_soft")
        label("图解区", 0.82, 1.76, "red")
        _add_contained_picture(slide, picture_path, 3.0, 1.66, 3.42, 1.9, align="right")
    elif not drawn:
        # 无图时绘制形状插画，避免只放一个“图”字
        label("图解区", 0.82, 1.76, "red")
        icon_kind = _pick_icon(deck_meta, data)
        _draw_icon(slide, icon_kind, 0.92, 2.16, 1.1, color="green")
        visual_size = 10.5 if len(visual) <= 70 else 9.2 if len(visual) <= 110 else 8.2
        body(visual, 2.3, 2.04, 4.0, 1.42, visual_size, "ink_soft")

    # 右侧：做一做 / 想一想
    _card(slide, x=6.74, y=1.62, w=2.66, h=0.98, shadow=True)
    label("做一做", 6.94, 1.74)
    activity_size = 10.5 if len(activity) <= 36 else 9.4 if len(activity) <= 56 else 8.6
    body(activity, 6.94, 2.0, 2.26, 0.54, activity_size)

    _card(slide, x=6.74, y=2.72, w=2.66, h=0.88, shadow=True)
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=6.74,
        y=2.72,
        w=0.06,
        h=0.88,
        fill="red",
        radius=0.4,
    )
    label("想一想", 6.94, 2.84, "red")
    body(f"「{question}」", 6.94, 3.08, 2.26, 0.44, 11.0, "ink", True)

    # 底部：说一说 + 口诀 / 板书
    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=0.6,
        y=3.74,
        w=5.92,
        h=0.86,
        fill="green_soft",
        radius=0.08,
    )
    label("说一说", 0.82, 3.86)
    body(conclusion, 0.82, 4.1, 5.5, 0.42, 12.5, "green_deep", True)

    _add_shape(
        slide,
        MSO_SHAPE.ROUNDED_RECTANGLE,
        x=6.74,
        y=3.74,
        w=2.66,
        h=0.86,
        fill="gold_faint",
        radius=0.08,
    )
    label("口诀 / 板书", 6.94, 3.86, "red")
    body(mnemonic, 6.94, 4.1, 2.26, 0.42, 9.5, "green_deep", True)
    return picture


def _render_summary(slide, bullets: list[str]) -> None:
    items = [item for item in bullets if item.strip()]
    if not items:
        return
    if len(items) > 3:
        _render_card_list(slide, items, dark=True, accent="gold", cols=2, shadow=True)
        return
    gap = GAP_M
    card_w = (8.8 - gap * 2) / 3
    card_h = 2.6
    top = 1.78
    for index, item in enumerate(items):
        cx = 0.6 + index * (card_w + gap)
        _card(slide, x=cx, y=top, w=card_w, h=card_h, dark=True, shadow=True)
        _add_shape(
            slide,
            MSO_SHAPE.ROUNDED_RECTANGLE,
            x=cx,
            y=top,
            w=card_w,
            h=0.07,
            fill="gold",
            radius=0.5,
        )
        dot = 0.36
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx + 0.26,
            y=top + 0.3,
            w=dot,
            h=dot,
            fill="gold",
        )
        _add_text(
            slide,
            f"0{index + 1}",
            x=cx + 0.26,
            y=top + 0.31,
            w=dot,
            h=dot,
            size=9,
            color="green_deep",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            name=FONT_NUM,
        )
        _add_text(
            slide,
            item,
            x=cx + 0.26,
            y=top + 0.86,
            w=card_w - 0.52,
            h=card_h - 1.04,
            size=12.5 if len(item) <= 24 else 11.5,
            color="chalk",
            line_spacing=1.4,
            anchor=MSO_ANCHOR.MIDDLE,
        )


# ---------------------------------------------------------------------------
# 新增版式：bignum / timeline / compare / quote
# ---------------------------------------------------------------------------

def _render_bignum(slide, data: dict[str, Any]) -> None:
    number = str(data.get("bigNumber") or "").strip()
    label = str(data.get("bigLabel") or "").strip()
    bullets = [b for b in (data.get("bullets") or []) if b.strip()][:4]
    if not number and not label:
        _render_card_list(slide, data.get("bullets") or [])
        return
    # 左侧大数字
    _add_text(
        slide,
        number,
        x=0.7,
        y=1.5,
        w=3.9,
        h=2.4,
        size=120 if len(number) <= 3 else 88 if len(number) <= 5 else 64,
        color="green",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
        name=FONT_NUM,
    )
    # 数字下方装饰线
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=1.35, y=4.02, w=2.6, h=0.04, fill="gold")
    # 右侧标签 + bullets
    if label:
        _add_text(
            slide,
            label,
            x=4.95,
            y=1.62,
            w=4.4,
            h=0.7,
            size=22 if len(label) <= 12 else 18,
            color="ink",
            bold=True,
            name=FONT_TITLE,
            line_spacing=1.2,
        )
    if bullets:
        _add_text(
            slide,
            bullets,
            x=4.98,
            y=2.42,
            w=4.32,
            h=2.0,
            size=12,
            color="ink_soft",
            line_spacing=1.55,
            space_after=4,
        )


def _render_timeline(slide, data: dict[str, Any]) -> None:
    bullets = [b for b in (data.get("bullets") or []) if b.strip()][:6]
    if not bullets:
        return
    labels = data.get("timelineLabels") or []
    n = len(bullets)
    axis_y = 3.02
    left = 0.82
    right = 9.18
    span = right - left
    step = span / max(1, n - 1) if n > 1 else span
    # 轴线
    _add_shape(slide, MSO_SHAPE.RECTANGLE, x=left, y=axis_y - 0.012, w=span, h=0.024, fill="gold")
    # 两端圆头
    _add_shape(slide, MSO_SHAPE.OVAL, x=left - 0.06, y=axis_y - 0.06, w=0.12, h=0.12, fill="gold")
    _add_shape(slide, MSO_SHAPE.OVAL, x=right - 0.06, y=axis_y - 0.06, w=0.12, h=0.12, fill="gold")

    for i, text in enumerate(bullets):
        cx = left + step * i if n > 1 else left + span / 2
        # 节点
        _add_shape(
            slide,
            MSO_SHAPE.OVAL,
            x=cx - 0.15,
            y=axis_y - 0.15,
            w=0.3,
            h=0.3,
            fill="green",
            line="gold",
            line_width=1.6,
            shadow=True,
            shadow_alpha=12,
        )
        _add_text(
            slide,
            f"{i + 1:02d}",
            x=cx - 0.15,
            y=axis_y - 0.14,
            w=0.3,
            h=0.3,
            size=9,
            color="cream",
            bold=True,
            align=PP_ALIGN.CENTER,
            anchor=MSO_ANCHOR.MIDDLE,
            name=FONT_NUM,
        )
        label = str(labels[i]) if i < len(labels) else ""
        card_w = min(2.3, span / max(1, n) * 0.92)
        card_h = 1.22
        if i % 2 == 0:
            card_y = axis_y - 1.42
        else:
            card_y = axis_y + 0.22
        card_x = cx - card_w / 2
        if card_x < 0.5:
            card_x = 0.5
        if card_x + card_w > 9.5:
            card_x = 9.5 - card_w
        # 连接短线
        if i % 2 == 0:
            _add_shape(slide, MSO_SHAPE.RECTANGLE, x=cx - 0.005, y=card_y + card_h, w=0.01, h=axis_y - (card_y + card_h) - 0.15, fill="green_mid")
        else:
            _add_shape(slide, MSO_SHAPE.RECTANGLE, x=cx - 0.005, y=axis_y + 0.15, w=0.01, h=card_y - (axis_y + 0.15), fill="green_mid")
        _card(slide, x=card_x, y=card_y, w=card_w, h=card_h, shadow=True)
        if label:
            _add_text(
                slide,
                label,
                x=card_x + 0.14,
                y=card_y + 0.1,
                w=card_w - 0.28,
                h=0.26,
                size=9,
                color="red",
                bold=True,
                char_spacing=1,
            )
        _add_text(
            slide,
            text,
            x=card_x + 0.14,
            y=card_y + (0.4 if label else 0.14),
            w=card_w - 0.28,
            h=card_h - (0.52 if label else 0.26),
            size=11 if len(text) <= 28 else 10,
            color="ink",
            line_spacing=1.35,
            anchor=MSO_ANCHOR.TOP,
        )


def _render_compare(slide, data: dict[str, Any]) -> None:
    left_title = str(data.get("leftTitle") or "对比 A")
    right_title = str(data.get("rightTitle") or "对比 B")
    left_bullets = [b for b in (data.get("leftBullets") or []) if b.strip()][:4]
    right_bullets = [b for b in (data.get("rightBullets") or []) if b.strip()][:4]
    if not left_bullets and not right_bullets:
        _render_card_list(slide, data.get("bullets") or [], cols=2)
        return
    card_w = 4.12
    card_h = 3.28
    top = 1.72
    # 左卡
    _card(slide, x=0.6, y=top, w=card_w, h=card_h, shadow=True)
    _add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x=0.6, y=top, w=card_w, h=0.07, fill="green", radius=0.5)
    _add_text(
        slide,
        left_title,
        x=0.82,
        y=top + 0.22,
        w=card_w - 0.44,
        h=0.4,
        size=15,
        color="green",
        bold=True,
        name=FONT_TITLE,
    )
    if left_bullets:
        _add_text(
            slide,
            ["· " + b for b in left_bullets],
            x=0.86,
            y=top + 0.78,
            w=card_w - 0.52,
            h=card_h - 1.02,
            size=11.5 if all(len(b) <= 22 for b in left_bullets) else 10.5,
            color="ink",
            line_spacing=1.55,
            space_after=4,
        )
    # 右卡
    right_x = 5.28
    _card(slide, x=right_x, y=top, w=card_w, h=card_h, shadow=True)
    _add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, x=right_x, y=top, w=card_w, h=0.07, fill="gold", radius=0.5)
    _add_text(
        slide,
        right_title,
        x=right_x + 0.22,
        y=top + 0.22,
        w=card_w - 0.44,
        h=0.4,
        size=15,
        color="red",
        bold=True,
        name=FONT_TITLE,
    )
    if right_bullets:
        _add_text(
            slide,
            ["· " + b for b in right_bullets],
            x=right_x + 0.26,
            y=top + 0.78,
            w=card_w - 0.52,
            h=card_h - 1.02,
            size=11.5 if all(len(b) <= 22 for b in right_bullets) else 10.5,
            color="ink",
            line_spacing=1.55,
            space_after=4,
        )
    # 中间 VS 徽章
    vs_d = 0.6
    vs_x = 5.0 - vs_d / 2
    vs_y = top + card_h / 2 - vs_d / 2
    _add_shape(
        slide,
        MSO_SHAPE.OVAL,
        x=vs_x,
        y=vs_y,
        w=vs_d,
        h=vs_d,
        fill="gold",
        line="green_deep",
        line_width=1.4,
        shadow=True,
        shadow_alpha=15,
    )
    _add_text(
        slide,
        "VS",
        x=vs_x,
        y=vs_y + 0.01,
        w=vs_d,
        h=vs_d,
        size=13,
        color="green_deep",
        bold=True,
        align=PP_ALIGN.CENTER,
        anchor=MSO_ANCHOR.MIDDLE,
        name=FONT_NUM,
    )


def _render_quote(slide, data: dict[str, Any]) -> None:
    quote = str(data.get("quote") or data.get("title") or "").strip()
    author = str(data.get("quoteAuthor") or data.get("note") or "").strip()
    if not quote:
        return
    # 大引号
    _add_text(
        slide,
        "“",
        x=0.55,
        y=0.55,
        w=2.0,
        h=1.6,
        size=160,
        color="gold_pale",
        bold=True,
        name=FONT_TITLE,
    )
    # 引言
    _add_text(
        slide,
        quote,
        x=1.1,
        y=1.72,
        w=7.8,
        h=1.75,
        size=23 if len(quote) <= 40 else 19 if len(quote) <= 64 else 16,
        color="cream",
        bold=True,
        align=PP_ALIGN.CENTER,
        line_spacing=1.55,
        anchor=MSO_ANCHOR.MIDDLE,
        name=FONT_TITLE,
    )
    # 作者
    if author:
        _add_shape(slide, MSO_SHAPE.RECTANGLE, x=4.5, y=3.92, w=1.0, h=0.03, fill="gold")
        _add_text(
            slide,
            f"—— {author}",
            x=1.2,
            y=4.08,
            w=7.6,
            h=0.4,
            size=12,
            color="note",
            align=PP_ALIGN.CENTER,
            char_spacing=0.6,
        )


# ---------------------------------------------------------------------------
# 页面分发
# ---------------------------------------------------------------------------

def _render_rich_page(
    slide,
    data: dict[str, Any],
    index: int,
    total: int,
    title: str,
    deck_meta: dict[str, Any] | None = None,
) -> None:
    kind = data.get("kind")
    bullets = data.get("bullets") or []
    dark = kind in ("summary", "quote")
    picture = None

    if dark:
        _gradient_bg(slide, "green_deep", "green_mid", 135)
    else:
        _paint_background(slide, "paper")
    _render_header(slide, data, index, dark=dark)

    if kind == "objectives":
        _render_objectives(slide, bullets)
    elif kind == "scenario":
        _render_scenario(slide, bullets)
    elif kind == "case":
        _render_case(slide, bullets)
    elif kind in ("agenda", "teaching"):
        _render_agenda(slide, bullets)
    elif kind == "lesson":
        hint_text = str(data.get("visual_hint") or "")
        scene_text = " ".join(
            [str((deck_meta or {}).get("lesson") or ""), str(data.get("title") or ""), hint_text]
        )
        # 有可画的配图要求时优先出图解；纯文字页（课时边界、时间安排）仍用卡片列表
        drawable = (
            bool(_parse_hint_figures(hint_text))
            or any(_scene_flags(scene_text).values())
            or any(word in hint_text for word in ("圆", "正方", "长方", "三角", "等分", "平均分", "涂", "折", "格"))
        )
        if bullets and not drawable:
            _render_card_list(slide, bullets, accent="green")
        else:
            picture = _render_lesson_flow(slide, data, deck_meta)
    elif kind == "bignum":
        _render_bignum(slide, data)
    elif kind == "timeline":
        _render_timeline(slide, data)
    elif kind == "compare":
        _render_compare(slide, data)
    elif kind == "quote":
        _render_quote(slide, data)
    elif kind == "summary":
        _render_summary(slide, bullets)
    else:
        accent = "gold" if kind in ("practice", "homework") else "green"
        _render_card_list(slide, bullets, accent=accent)

    note = data.get("note")
    if note and kind not in ("summary", "quote"):
        _add_text(
            slide,
            note,
            x=0.6,
            y=4.88,
            w=8.8,
            h=0.22,
            size=8.5,
            color="muted",
        )

    # 教师备注（答案 / 易错 / 时间）写入讲者备注，不投屏
    note_lines: list[str] = []
    if data.get("teacher_note"):
        note_lines.append(str(data["teacher_note"]))
    if data.get("visual_hint"):
        note_lines.append(f"配图建议：{data['visual_hint']}")
    if picture:
        _path, picture_title, picture_source, picture_link = picture
        note_lines.append(
            f"图解素材：{picture_title}（{picture_source}）{picture_link}".strip()
        )
    plan = data.get("visual_plan") or {}
    if plan:
        note_lines.extend(_visual_plan_note(plan))
    if note_lines:
        slide.notes_slide.notes_text_frame.text = "\n".join(note_lines)

    _render_footer(slide, title=title, index=index, total=total, dark=dark)


def _normalize_deck(deck: Any) -> dict[str, Any]:
    if not isinstance(deck, dict):
        raise ValueError("deck 必须是对象")
    slides = deck.get("slides")
    if not isinstance(slides, list) or not slides:
        raise ValueError("deck.slides 不能为空")
    if len(slides) > MAX_SLIDES:
        raise ValueError(f"页数不能超过 {MAX_SLIDES}")
    normalized = []
    for slide in slides:
        if not isinstance(slide, dict):
            raise ValueError("幻灯片必须是对象")
        bullets = slide.get("bullets") or []
        if not isinstance(bullets, list):
            bullets = [str(bullets)]
        normalized.append(
            {
                "kind": str(slide.get("kind") or "concept"),
                "kicker": slide.get("kicker"),
                "title": str(slide.get("title") or ""),
                "bullets": [str(item) for item in bullets if str(item).strip()],
                "note": slide.get("note"),
                "activity": str(slide.get("activity") or ""),
                "question": str(slide.get("question") or ""),
                "conclusion": str(slide.get("conclusion") or ""),
                "teacher_note": str(slide.get("teacherNote") or ""),
                "visual_hint": str(slide.get("visualHint") or ""),
                "visual_plan": slide.get("visualPlan")
                if isinstance(slide.get("visualPlan"), dict)
                else {},
                "mnemonic": str(slide.get("mnemonic") or ""),
                "minutes": slide.get("minutes"),
                # 新增版式字段
                "bigNumber": str(slide.get("bigNumber") or ""),
                "bigLabel": str(slide.get("bigLabel") or ""),
                "timelineLabels": [
                    str(x) for x in (slide.get("timelineLabels") or [])
                    if str(x).strip()
                ],
                "leftTitle": str(slide.get("leftTitle") or ""),
                "leftBullets": [
                    str(x) for x in (slide.get("leftBullets") or [])
                    if str(x).strip()
                ],
                "rightTitle": str(slide.get("rightTitle") or ""),
                "rightBullets": [
                    str(x) for x in (slide.get("rightBullets") or [])
                    if str(x).strip()
                ],
                "quote": str(slide.get("quote") or ""),
                "quoteAuthor": str(slide.get("quoteAuthor") or ""),
            }
        )
    meta = deck.get("meta") if isinstance(deck.get("meta"), dict) else {}
    return {
        "title": str(deck.get("title") or "课件"),
        "subtitle": str(deck.get("subtitle") or ""),
        "author": str(deck.get("author") or ""),
        "school": str(deck.get("school") or ""),
        "meta": meta,
        "slides": normalized,
    }


def build_pptx(deck: Any) -> bytes:
    data = _normalize_deck(deck)
    prs, _ = _new_presentation()
    prs.core_properties.author = "乡课"
    prs.core_properties.title = data["title"]
    prs.core_properties.subject = data["subtitle"]
    prs.core_properties.comments = "乡课 · 乡村教师 AI 备课"

    layout = _blank_layout(prs)
    slides = data["slides"]
    total = len(slides)
    deck_meta = dict(data.get("meta") or {})
    if not deck_meta.get("lesson"):
        deck_meta["lesson"] = data["title"]
    if not deck_meta.get("subject"):
        matched = re.search(
            r"(语文|数学|英语|科学|道德与法治|音乐|美术|体育)", data["subtitle"]
        )
        deck_meta["subject"] = matched.group(1) if matched else ""
    for index, slide_data in enumerate(slides):
        slide = prs.slides.add_slide(layout)
        kind = slide_data["kind"]
        if kind == "cover":
            _render_cover(slide, slide_data)
        elif kind == "closing":
            _render_closing(slide, slide_data)
        else:
            _render_rich_page(slide, slide_data, index, total, data["title"], deck_meta)

    buffer = io.BytesIO()
    prs.save(buffer)
    return buffer.getvalue()
