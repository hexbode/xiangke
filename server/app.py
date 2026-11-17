"""乡课 PPT 导出服务。

使用 python-pptx 在服务端构建 .pptx：
- 有 server/templates/template.pptx 时基于模板（保留母版与主题）生成；
- 否则从零构建 16:9 课件。

启动：python server/app.py  （默认 http://127.0.0.1:8001）
接口：
  GET  /api/ppt/health   健康检查
  POST /api/ppt/export   请求体 {"deck": {...}, "fileName": "xxx.pptx"}，返回 pptx 二进制
"""

from __future__ import annotations

import json
import os
import traceback
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

try:  # 兼容 python server/app.py 与 python -m server.app
    from . import ai_deck
    from .ppt_builder import build_pptx, template_available
    from .oer import ASSET_DIR, hot_resources, pick_diagram, search_resources
except ImportError:
    import ai_deck
    from ppt_builder import build_pptx, template_available
    from oer import ASSET_DIR, hot_resources, pick_diagram, search_resources

HOST = os.environ.get("PPT_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("PPT_API_PORT", "8001"))
MAX_BODY = 4 * 1024 * 1024

PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


def _safe_filename(raw: str | None) -> str:
    name = (raw or "乡课-课件.pptx").strip() or "乡课-课件.pptx"
    for char in '\\/:*?"<>|\r\n\t':
        name = name.replace(char, "-")
    if not name.lower().endswith(".pptx"):
        name = f"{name}.pptx"
    return name[:120]


class PptHandler(BaseHTTPRequestHandler):
    server_version = "XiangkePpt/1.0"

    def _cors_headers(self) -> dict[str, str]:
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Cache-Control": "no-store",
        }

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers = {**self._cors_headers(), "Content-Type": "application/json; charset=utf-8"}
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(HTTPStatus.NO_CONTENT)
        for key, value in self._cors_headers().items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        path = parsed.path
        if path in ("/", "/api/health"):
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "service": "xiangke-ppt-oer",
                    "message": "乡课 PPT / 开放资源服务正在运行",
                    "endpoints": {
                        "/api/ppt/health": "GET",
                        "/api/ppt/export": "POST { deck, fileName }",
                        "/api/ppt/generate": "POST { meta, brief, author, school }（DeepSeek）",
                        "/api/oer/health": "GET",
                        "/api/oer/hot": "GET ?limit=8",
                        "/api/oer/search": "GET ?q=分数&limit=8",
                        "/api/oer/diagram": "GET ?subject=数学&lesson=分数的初步认识&title=认识几分之一&hint=配图：...&grade=三年级",
                        "/api/oer/assets/<name>": "GET",
                    },
                },
            )
            return
        if path == "/api/oer/health":
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "sources": ["Bing 图片", "Wikimedia Commons", "Openverse", "Internet Archive"],
                },
            )
            return
        if path == "/api/oer/diagram":
            params = parse_qs(parsed.query)
            self._send_json(
                HTTPStatus.OK,
                pick_diagram(
                    subject=(params.get("subject") or [""])[0],
                    lesson=(params.get("lesson") or [""])[0],
                    title=(params.get("title") or [""])[0],
                    hint=(params.get("hint") or [""])[0],
                    grade=(params.get("grade") or [""])[0],
                ),
            )
            return
        if path == "/api/oer/hot":
            params = parse_qs(parsed.query)
            try:
                limit = int((params.get("limit") or ["8"])[0])
            except ValueError:
                limit = 8
            results = hot_resources(limit)
            self._send_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "results": results,
                    "count": len(results),
                    "license_note": "本地预取索引，引用请标注作者与许可。",
                },
            )
            return
        if path.startswith("/api/oer/assets/"):
            name = os.path.basename(path)
            asset = ASSET_DIR / name
            if not asset.is_file():
                self._send_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "asset_not_found"})
                return
            body = asset.read_bytes()
            mime = {
                ".svg": "image/svg+xml",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".gif": "image/gif",
                ".bmp": "image/bmp",
            }.get(asset.suffix.lower(), "application/octet-stream")
            self.send_response(HTTPStatus.OK)
            for key, value in self._cors_headers().items():
                self.send_header(key, value)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/oer/search":
            params = parse_qs(parsed.query)
            query = (params.get("q") or [""])[0]
            try:
                limit = int((params.get("limit") or ["8"])[0])
            except ValueError:
                limit = 8
            live = (params.get("live") or ["0"])[0] in ("1", "true", "yes")
            try:
                payload = search_resources(query, limit, live=live)
            except ValueError as error:
                self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
                return
            except Exception:  # noqa: BLE001 - 外部站点不可达时返回可回退状态
                self._send_json(
                    HTTPStatus.BAD_GATEWAY,
                    {"ok": False, "error": "upstream_unavailable"},
                )
                return
            self._send_json(HTTPStatus.OK, payload)
            return
        if path != "/api/ppt/health":
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {
                    "ok": False,
                    "error": "not_found",
                    "path": path,
                    "hint": "打开 http://127.0.0.1:8001/ 查看可用接口",
                },
            )
            return
        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "engine": "python-pptx",
                "template": template_available(),
                "ai": ai_deck.available(),
                "ai_model": ai_deck.model_name(),
            },
        )

    def _handle_generate(self) -> None:
        """调用 DeepSeek 生成课件结构，返回前端可直接预览的 deck JSON。"""
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "empty_body"})
            return
        if length > MAX_BODY:
            self._send_json(
                HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
                {"ok": False, "error": "body_too_large"},
            )
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
            return
        if not isinstance(payload, dict):
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_body"})
            return

        meta = payload.get("meta") if isinstance(payload.get("meta"), dict) else {}
        brief = payload.get("brief") if isinstance(payload.get("brief"), dict) else {}
        if not str(meta.get("lesson") or "").strip():
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "missing_lesson"})
            return
        if not ai_deck.available():
            self._send_json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {
                    "ok": False,
                    "error": "ai_not_configured",
                    "hint": "设置环境变量 DEEPSEEK_API_KEY 后重启 PPT 服务",
                },
            )
            return

        try:
            deck = ai_deck.generate_deck(
                meta=meta,
                brief=brief,
                author=str(payload.get("author") or ""),
                school=str(payload.get("school") or ""),
            )
        except ai_deck.AiDeckError as error:
            self._send_json(
                HTTPStatus.BAD_GATEWAY,
                {"ok": False, "error": "ai_failed", "message": str(error)},
            )
            return
        except Exception:  # noqa: BLE001 - 未预期异常打印堆栈，便于排查
            traceback.print_exc()
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "error": "generate_failed"},
            )
            return

        self._send_json(
            HTTPStatus.OK,
            {
                "ok": True,
                "source": "deepseek",
                "model": ai_deck.model_name(),
                "deck": deck,
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        path = self.path.split("?")[0]
        if path == "/api/ppt/generate":
            self._handle_generate()
            return
        if path != "/api/ppt/export":
            self._send_json(
                HTTPStatus.NOT_FOUND,
                {
                    "ok": False,
                    "error": "not_found",
                    "path": self.path.split("?")[0],
                    "hint": "导出接口为 POST /api/ppt/export，请求体 { deck, fileName }",
                },
            )
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            length = 0
        if length <= 0:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "empty_body"})
            return
        if length > MAX_BODY:
            self._send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"ok": False, "error": "body_too_large"})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            deck = payload.get("deck", payload) if isinstance(payload, dict) else payload
            pptx_bytes = build_pptx(deck)
            filename = _safe_filename(payload.get("fileName") if isinstance(payload, dict) else None)
        except ValueError as error:
            self._send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})
            return
        except Exception:  # noqa: BLE001 - 返回 500 并打印堆栈，便于排查
            traceback.print_exc()
            self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": "build_failed"})
            return

        self.send_response(HTTPStatus.OK)
        for key, value in self._cors_headers().items():
            self.send_header(key, value)
        self.send_header("Content-Type", PPTX_MIME)
        self.send_header(
            "Content-Disposition",
            f"attachment; filename=\"presentation.pptx\"; filename*=UTF-8''{quote(filename)}",
        )
        self.send_header("Content-Length", str(len(pptx_bytes)))
        self.end_headers()
        self.wfile.write(pptx_bytes)

    def log_message(self, fmt: str, *args) -> None:  # 保持控制台简洁
        print(f"[ppt-api] {self.address_string()} {fmt % args}")


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), PptHandler)
    mode = "模板" if template_available() else "从零构建"
    print(f"[ppt-api] python-pptx 服务已启动 http://{HOST}:{PORT} · {mode}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ppt-api] 已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
