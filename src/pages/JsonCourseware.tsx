import { useEffect, useState } from "react";
import { Download, FileJson, Loader2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { JsonSlideRenderer } from "@/components/course-json/JsonSlideRenderer";
import { useToast } from "@/components/Toast";
import {
  buildLocalCourseJson,
  COURSE_JSON_CONTRACT,
  normalizeCourseJson,
  type JsonCourse,
} from "@/lib/courseJson";
import { exportJsonPpt } from "@/lib/jsonPpt";
import { GRADES } from "@/lib/types";

const STORAGE_KEY = "xiangke.jsoncourse.v1";

function loadCourse(): JsonCourse {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeCourseJson(JSON.parse(raw));
  } catch {
    // 本地数据损坏时退回示例
  }
  return buildLocalCourseJson("一年级", "10的加减法");
}

export function JsonCoursewarePage() {
  const toast = useToast();
  const [course, setCourse] = useState<JsonCourse>(loadCourse);
  const [grade, setGrade] = useState(() => course.grade || "一年级");
  const [topic, setTopic] = useState(() => course.courseName || "10的加减法");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(course, null, 2));
  const [showJson, setShowJson] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setJsonText(JSON.stringify(course, null, 2));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(course));
    } catch {
      // 存储空间不足时忽略，页面仍可继续
    }
  }, [course]);

  const generate = () => {
    const next = buildLocalCourseJson(grade, topic);
    setCourse(next);
    toast(`已用本地模板生成《${next.courseName}》`);
  };

  const applyJson = () => {
    try {
      const next = normalizeCourseJson(JSON.parse(jsonText));
      setCourse(next);
      setGrade(next.grade || grade);
      setTopic(next.courseName);
      toast("已应用 JSON 修改");
    } catch (error) {
      console.error(error);
      toast("JSON 格式不正确，已保留原课件", "error");
    }
  };

  const download = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const fileName = await exportJsonPpt(course);
      toast(`已导出 ${fileName}`);
    } catch (error) {
      console.error(error);
      toast("PPTX 导出失败，请重试", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <PageHeader title="JSON 课件" subtitle="本地模板生成 · 未接 AI · 屏幕极简" />
      <div className="card">
        <div className="chip-wrap" style={{ marginBottom: 10 }}>
          <span className="chip chip--active">本地模板</span>
          <span className="chip">JSON 契约</span>
          <span className="chip">pptxgenjs 导出</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label className="field">
            <span className="field-label">年级</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)}>
              {GRADES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">课题</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="例如：10的加减法"
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" className="btn btn-sm" onClick={generate}>
            <Sparkles size={14} /> 生成课件
          </button>
          <button type="button" className="btn btn-outline btn-sm" onClick={download} disabled={exporting}>
            {exporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
            {exporting ? "正在导出…" : "下载 PPTX"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowJson((value) => !value)}
          >
            <FileJson size={14} /> {showJson ? "收起 JSON" : "查看 / 编辑 JSON"}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setCourse(buildLocalCourseJson("一年级", "10的加减法"));
              setGrade("一年级");
              setTopic("10的加减法");
              toast("已恢复示例课件");
            }}
          >
            <Trash2 size={14} /> 恢复示例
          </button>
        </div>
      </div>

      {showJson && (
        <div className="card">
          <div className="field-label">课件 JSON（可直接修改后应用）</div>
          <textarea
            className="json-editor"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-sm" onClick={applyJson}>
              应用 JSON 修改
            </button>
          </div>
          <details className="json-contract">
            <summary>未来接入大模型时使用的 JSON 契约</summary>
            <pre>{COURSE_JSON_CONTRACT}</pre>
          </details>
        </div>
      )}

      <div className="json-rail">
        {course.slides.map((slide) => (
          <section key={slide.id} className="json-preview-card">
            <JsonSlideRenderer slide={slide} />
            {slide.note && (
              <div className="json-preview-note">
                <strong>教师备注（不投屏）</strong>
                <span>{slide.note}</span>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
