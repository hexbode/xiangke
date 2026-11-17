"""DeepSeek 课件生成：把课题信息交给大模型编排成课件 JSON。

设计要点：
- 只生成「课件结构」，最终 .pptx 仍由 python-pptx 渲染，版式与配图能力保持一致；
- API Key 只存在后端环境变量里，前端不接触密钥；
- 未配置 Key 或调用失败时抛出明确错误，前端可回退本地规则生成。

环境变量：
  DEEPSEEK_API_KEY   必填，DeepSeek API Key
  DEEPSEEK_BASE_URL  可选，默认 https://api.deepseek.com
  DEEPSEEK_MODEL     可选，默认 deepseek-chat
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"
REQUEST_TIMEOUT = 60


def _load_dotenv() -> None:
    """读取项目根目录 .env（已在 .gitignore 中忽略），避免密钥写进代码或命令行。"""
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()

ALLOWED_KINDS = {
    "cover",
    "lesson",
    "practice",
    "summary",
    "closing",
    "objectives",
    "agenda",
    "scenario",
    "case",
    "homework",
}


class AiDeckError(RuntimeError):
    """外部接口调用或返回内容不合法时抛出。"""


def _config() -> tuple[str, str, str]:
    return (
        (os.environ.get("DEEPSEEK_API_KEY") or "").strip(),
        (os.environ.get("DEEPSEEK_BASE_URL") or DEFAULT_BASE_URL).strip(),
        (os.environ.get("DEEPSEEK_MODEL") or DEFAULT_MODEL).strip(),
    )


def available() -> bool:
    """是否已配置 DeepSeek Key。"""
    return bool(_config()[0])


def model_name() -> str:
    return _config()[2]


# ---------------------------------------------------------------------------
# 提示词：约束页面结构、乡村课堂语境与配图写法
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """你是中国乡村小学的资深教研员，擅长把一节课拆成可以直接照着上的课件。
请根据给定的课题信息，输出严格合法的 JSON（不要 Markdown 代码块、不要解释文字）。

输出结构：
{
  "slides": [
    {
      "kind": "cover",
      "kicker": "人教版 · 三年级上册 · 新授课 · 第 1/2 课时 · 40 分钟",
      "title": "三年级数学 · 分数的初步认识（第 1 课时）",
      "bullets": ["授课教师：张三", "学情：基础一般 · 教具：纸、彩笔"],
      "note": "乡课 · 教学设计"
    },
    {
      "kind": "lesson",
      "kicker": "课时边界",
      "title": "本课时只学这一小步",
      "bullets": ["本课时只教：……", "本课时不教：……"],
      "activity": "学生具体做什么（折/涂/说/比/评）",
      "question": "本页唯一的教师核心提问",
      "conclusion": "学生要得出的结论，一句话",
      "teacherNote": "答案、易错点、时间提示",
      "visualHint": "配图：具体到图形、颜色、数量与动作",
      "mnemonic": "口诀或板书结论",
      "minutes": 3
    }
  ]
}

硬性要求：
1. 共 8-12 页；第一页 kind=cover，最后一页 kind=closing。
2. 中间以 kind=lesson 为主，可包含 1 页 kind=practice、1 页 kind=summary。
3. 必须有一页「课时边界」：只教什么、不教什么；再有一页「教学环节与时间」，minutes 合计等于课时总时长。
4. 每页 lesson 只能有 1 个 question；activity 必须是学生动作；conclusion 控制在 30 字内。
5. 屏幕正文不超过 3 行；bullets 最多 3 条，每条不超过 40 字。
6. teacherNote 写答案、易错点和大致时间，供教师看，不显示在学生页上。
7. 每页 lesson 必须有 visualHint，写法二选一：
   - 几何：配图：正方形四等分，左上 1 格涂绿色，其余 3 格留白；下方写 1/4。
   - 场景：配图：秋天的雨，银杏树落叶，地面有积水。
8. 面向乡村学校：默认无投影、无网络，教具只用纸、彩笔、课本等低成本材料；语言朴实、可操作。
9. 如果用户给了「额外要求」，在不违反上述硬性要求的前提下优先满足；冲突时以上述要求为准。"""


def _user_prompt(
    meta: dict[str, Any],
    brief: dict[str, Any],
    author: str,
    school: str,
    requirement: str = "",
) -> str:
    payload = {
        "课题信息": meta,
        "课时信息": brief,
        "授课教师": author or "乡课教师",
        "学校": school or "",
    }
    if requirement:
        payload["额外要求"] = requirement
    return "请为下面这节课生成课件 JSON：\n" + json.dumps(payload, ensure_ascii=False)


# ---------------------------------------------------------------------------
# 调用与解析
# ---------------------------------------------------------------------------

def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str]) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise AiDeckError(f"DeepSeek 返回 {error.code}：{detail}") from error
    except urllib.error.URLError as error:
        raise AiDeckError(f"无法连接 DeepSeek：{error.reason}") from error
    except json.JSONDecodeError as error:
        raise AiDeckError("DeepSeek 返回的不是合法 JSON") from error


def _extract_json(content: str) -> dict[str, Any]:
    """去掉可能出现的 Markdown 代码块，再解析 JSON。"""
    text = content.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        raise AiDeckError("模型输出无法解析为 JSON") from error
    if not isinstance(parsed, dict):
        raise AiDeckError("模型输出的顶层结构不是对象")
    return parsed


# ---------------------------------------------------------------------------
# 清洗与校验
# ---------------------------------------------------------------------------

def _text(value: Any, limit: int) -> str:
    if value is None:
        return ""
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text[:limit]


def _bullets(value: Any, limit: int = 6) -> list[str]:
    if isinstance(value, str):
        value = [value]
    if not isinstance(value, list):
        return []
    cleaned = [_text(item, 80) for item in value if str(item).strip()]
    return cleaned[:limit]


def _clean_slide(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    kind = _text(raw.get("kind"), 20)
    if kind not in ALLOWED_KINDS:
        kind = "lesson"
    title = _text(raw.get("title"), 48)
    if not title:
        return None
    slide: dict[str, Any] = {
        "kind": kind,
        "title": title,
        "bullets": _bullets(raw.get("bullets")),
    }
    for key, limit in (
        ("kicker", 60),
        ("note", 60),
        ("activity", 80),
        ("question", 60),
        ("conclusion", 60),
        ("teacherNote", 120),
        ("visualHint", 160),
        ("mnemonic", 60),
    ):
        text = _text(raw.get(key), limit)
        if text:
            slide[key] = text
    try:
        minutes = int(raw.get("minutes"))
    except (TypeError, ValueError):
        minutes = 0
    if 1 <= minutes <= 90:
        slide["minutes"] = minutes
    return slide


def _cover(meta: dict[str, Any], brief: dict[str, Any], author: str, school: str) -> dict[str, Any]:
    textbook = _text(meta.get("textbook"), 20) or "人教版"
    grade = _text(meta.get("grade"), 20)
    subject = _text(meta.get("subject"), 20)
    lesson = _text(meta.get("lesson"), 40)
    volume = _text(brief.get("volume"), 10)
    period = brief.get("period") or 1
    total = brief.get("totalPeriods") or 1
    minutes = brief.get("minutes") or 40
    type_label = {"new": "新授课", "practice": "练习课", "review": "复习课"}.get(
        str(brief.get("courseType") or "new"), "新授课"
    )
    bullets = [f"授课教师：{author or '乡课教师'}"]
    level = _text(brief.get("level"), 20)
    aids = brief.get("aids") if isinstance(brief.get("aids"), list) else []
    aids_text = "、".join(_text(item, 12) for item in aids[:4] if str(item).strip())
    parts = [part for part in (level, f"教具：{aids_text}" if aids_text else "") if part]
    if parts:
        bullets.append(" · ".join(parts))
    if school:
        bullets.append(f"学校：{_text(school, 30)}")
    return {
        "kind": "cover",
        "kicker": f"{textbook} · {grade}{volume} · {type_label} · 第 {period}/{total} 课时 · {minutes} 分钟",
        "title": f"{grade}{subject} · {lesson}（第 {period} 课时）",
        "bullets": bullets,
        "note": "乡课 · 教学设计",
    }


def _closing() -> dict[str, Any]:
    return {
        "kind": "closing",
        "title": "下课",
        "bullets": ["把这一小步讲扎实，下一课时再往前走。"],
        "note": "乡课",
    }


def _balance_minutes(slides: list[dict[str, Any]], target: int) -> None:
    """把各页 minutes 配平到课时总时长，避免模型算错加总。"""
    timed = [slide for slide in slides if int(slide.get("minutes") or 0) > 0]
    total = sum(int(slide.get("minutes") or 0) for slide in timed)
    if not timed or total <= 0 or total == target:
        return
    for slide in timed:
        slide["minutes"] = max(1, round(int(slide["minutes"]) * target / total))
    # 四舍五入可能仍有 1-2 分钟误差，补到最长的一页上
    for _ in range(20):
        diff = target - sum(int(slide.get("minutes") or 0) for slide in timed)
        if diff == 0:
            break
        longest = max(timed, key=lambda item: int(item.get("minutes") or 0))
        longest["minutes"] = max(1, int(longest["minutes"]) + (1 if diff > 0 else -1))


def _checks(deck: dict[str, Any]) -> list[dict[str, Any]]:
    slides = deck["slides"]
    lessons = [slide for slide in slides if slide.get("kind") in ("lesson", "practice")]
    timed = [slide for slide in slides if int(slide.get("minutes") or 0) > 0]
    total_minutes = sum(int(slide.get("minutes") or 0) for slide in timed)
    target = deck.get("brief", {}).get("minutes") or 40
    checks = [
        {"label": "页数 8-12 页", "ok": 8 <= len(slides) <= 12, "hint": f"当前 {len(slides)} 页"},
        {
            "label": "每页一个核心提问",
            "ok": all(slide.get("question") for slide in lessons),
            "hint": "核心活动页需要 1 个问题",
        },
        {
            "label": "每页有配图要求",
            "ok": all(slide.get("visualHint") for slide in lessons),
            "hint": "配图要具体到图形与动作",
        },
        {
            "label": f"环节时间 = {target} 分钟",
            "ok": total_minutes == target,
            "hint": f"当前合计 {total_minutes} 分钟",
        },
    ]
    return checks


def generate_deck(
    *,
    meta: dict[str, Any],
    brief: dict[str, Any],
    author: str = "",
    school: str = "",
    requirement: str = "",
) -> dict[str, Any]:
    """调用 DeepSeek 生成并校验课件 deck。"""
    api_key, base_url, model = _config()
    if not api_key:
        raise AiDeckError("未配置 DEEPSEEK_API_KEY")

    lesson = _text(meta.get("lesson"), 40)
    if not lesson:
        raise AiDeckError("缺少课题名称")

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(meta, brief, author, school, requirement)},
        ],
        "temperature": 0.6,
        "max_tokens": 4096,
        "response_format": {"type": "json_object"},
        "stream": False,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    response = _post_json(f"{base_url.rstrip('/')}/chat/completions", payload, headers)
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise AiDeckError("DeepSeek 响应缺少 choices[0].message.content") from error

    parsed = _extract_json(str(content))
    raw_slides = parsed.get("slides")
    if not isinstance(raw_slides, list):
        raise AiDeckError("模型输出缺少 slides 数组")
    slides = [slide for slide in (_clean_slide(item) for item in raw_slides) if slide]
    if len(slides) < 6:
        raise AiDeckError("模型输出的有效页面少于 6 页")

    if slides[0].get("kind") != "cover":
        slides.insert(0, _cover(meta, brief, author, school))
    if slides[-1].get("kind") != "closing":
        slides.append(_closing())
    slides = slides[:14]
    try:
        target_minutes = int(brief.get("minutes") or 40)
    except (TypeError, ValueError):
        target_minutes = 40
    _balance_minutes(slides, target_minutes)

    grade = _text(meta.get("grade"), 20)
    subject = _text(meta.get("subject"), 20)
    textbook = _text(meta.get("textbook"), 20) or "人教版"
    volume = _text(brief.get("volume"), 10)
    period = brief.get("period") or 1
    deck: dict[str, Any] = {
        "title": lesson,
        "subtitle": f"{grade}{subject} · {textbook}{volume} · 第 {period} 课时",
        "author": author or "乡课教师",
        "school": school or "",
        "meta": {
            "subject": subject,
            "grade": grade,
            "lesson": lesson,
        },
        "brief": brief,
        "slides": slides,
    }
    deck["checks"] = _checks(deck)
    return deck
