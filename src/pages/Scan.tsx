import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  LockKeyhole,
  RotateCcw,
  Save,
  ScanLine,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { SampleWorksheet } from "@/components/SampleWorksheet";
import { useToast } from "@/components/Toast";
import { Chip, PageHeader, ScoreRing, SectionHead, Tag } from "@/components/ui";
import { createSampleScan } from "@/lib/scan";
import { navigate } from "@/lib/router";
import { useStore } from "@/lib/store";
import type { ScanResult } from "@/lib/types";

const STEPS = [
  "裁切题目区域，姓名区域打码",
  "识别题目与作答，共 8 题",
  "聚合错因分布与典型错例",
  "生成 10 分钟讲评稿与补救练习",
];

type Phase = "idle" | "ready" | "analyzing" | "done";

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function ScanPage() {
  const { state, saveScan } = useStore();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [source, setSource] = useState<"sample" | "upload">("sample");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const percent = result ? Math.round(((result.total - result.wrong) / result.total) * 100) : 0;
  const fractionPlan = useMemo(
    () => state.plans.find((plan) => plan.id === "seed-fraction"),
    [state.plans],
  );

  const reset = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoUrl(null);
    setPhase("idle");
    setSource("sample");
    setStep(0);
    setResult(null);
    setSaved(false);
    setShowAnswers(false);
    setShowAll(false);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhotoUrl(url);
    setSource("upload");
    setPhase("ready");
    setResult(null);
    setSaved(false);
  };

  const useSample = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPhotoUrl(null);
    setSource("sample");
    setPhase("ready");
    setResult(null);
    setSaved(false);
  };

  const analyze = async () => {
    if (phase === "analyzing") return;
    setPhase("analyzing");
    setStep(0);
    for (let index = 0; index < STEPS.length; index += 1) {
      setStep(index);
      await delay(430);
    }
    setStep(STEPS.length);
    await delay(240);
    setResult(createSampleScan(source));
    setPhase("done");
  };

  const handleSave = () => {
    if (!result || saved) return;
    saveScan(result);
    setSaved(true);
    toast("讲评记录已保存到「我的」");
  };

  const wrongQuestions = result?.questions.filter((question) => !question.correct) ?? [];
  const visibleQuestions = result
    ? showAll
      ? result.questions
      : wrongQuestions
    : [];

  return (
    <>
      <PageHeader
        title="拍照讲评"
        back={false}
        right={<ShieldCheck size={17} className="muted" />}
      />

      <div className="page">
        {phase !== "done" && (
          <>
            <h1
              className="font-display"
              style={{
                fontSize: "calc(23px * var(--site-type))",
                fontWeight: 700,
                lineHeight: 1.4,
                margin: "0 0 4px",
              }}
            >
              拍一张作业，
              <br />
              10 分钟讲评稿自己出来。
            </h1>
            <p className="small muted" style={{ margin: "0 0 14px" }}>
              识别题目与错误分布，按错因生成讲评顺序和补救练习。
            </p>

            <div className="privacy-note" style={{ marginBottom: 12 }}>
              <LockKeyhole size={15} style={{ flex: "none", marginTop: 1 }} aria-hidden="true" />
              <span>
                演示版图片只在本地预览、不上传服务器、不写入本机存储；正式版上传即自动裁切题目区域、姓名打码，7 天后删除，不进公共库。
              </span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              aria-label="选择作业照片"
              onChange={(event) => {
                onFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            <button
              type="button"
              className="shot-frame"
              style={{ width: "100%", border: undefined }}
              onClick={() => inputRef.current?.click()}
              aria-label="拍照或上传作业"
            >
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="待识别的作业照片预览"
                  style={{
                    width: "100%",
                    maxHeight: 330,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              ) : source === "sample" && phase !== "idle" ? (
                <SampleWorksheet />
              ) : (
                <>
                  <span className="shot-icon">
                    <Camera size={24} aria-hidden="true" />
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "calc(14px * var(--site-type))" }}>
                    拍照 / 上传作业
                  </span>
                  <span className="tiny muted">
                    支持手写作业照片 · 建议光线充足、题目拍全
                  </span>
                </>
              )}
            </button>

            {phase === "ready" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => (source === "sample" ? inputRef.current?.click() : useSample())}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  {source === "sample" ? "上传自己的作业" : "改用示例作业"}
                </button>
                <button type="button" className="btn" style={{ flex: 1 }} onClick={analyze}>
                  <ScanLine size={16} aria-hidden="true" />
                  开始识别
                </button>
              </div>
            )}

            {phase === "idle" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={useSample}>
                  先用示例作业试试
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => inputRef.current?.click()}
                >
                  <Camera size={16} aria-hidden="true" />
                  拍照上传
                </button>
              </div>
            )}

            {phase === "analyzing" && (
              <div className="scan-progress" style={{ marginTop: 12 }} role="status" aria-live="polite">
                <div style={{ fontWeight: 700, fontSize: "calc(13px * var(--site-type))" }}>
                  正在识别 · 演示引擎
                </div>
                {STEPS.map((label, index) => (
                  <div
                    className={`scan-step ${
                      index < step ? "scan-step--done" : index === step ? "scan-step--active" : ""
                    }`}
                    key={label}
                  >
                    {index < step ? (
                      <Check size={14} aria-hidden="true" />
                    ) : index === step ? (
                      <span className="ring" aria-hidden="true" />
                    ) : (
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          border: "1px solid var(--site-border)",
                          display: "inline-block",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="site-foot">
              示例作业为虚构学生作答，姓名区域已打码
              <br />
              正式版识别能力接入多模态模型，图片脱敏后 7 天自动清理
            </div>
          </>
        )}

        {phase === "done" && result && (
          <>
            <div className="card card-pad">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <ScoreRing percent={percent} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="eyebrow">识别完成 · 演示引擎</div>
                  <div style={{ fontWeight: 700, marginTop: 3 }}>{result.title}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    共 {result.total} 题 · 错 {result.wrong} 题 · 正确率 {percent}%
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                    <Tag tone="plain">姓名已打码</Tag>
                    <Tag tone="plain">图片未上传</Tag>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 12 }}>
              <SectionHead title="错误分布" eyebrow="按错因聚合" />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.distribution.map((item) => (
                  <div key={item.tag}>
                    <div className="bar-row">
                      <span>{item.tag}</span>
                      <span className="bar-track">
                        <span
                          className="bar-fill"
                          style={{ width: `${(item.count / Math.max(1, result.wrong)) * 100}%` }}
                        />
                      </span>
                      <span className="num tiny" style={{ textAlign: "right" }}>
                        {item.count}
                      </span>
                    </div>
                    <div className="tiny muted" style={{ marginLeft: 104, marginTop: 2 }}>
                      {item.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <SectionHead
                title="典型错例"
                eyebrow={`${wrongQuestions.length} 道错题`}
                action={showAll ? "只看错题" : "查看全部 8 题"}
                onAction={() => setShowAll((prev) => !prev)}
              />
              <div className="stack">
                {visibleQuestions.map((question) => (
                  <div className="question-item" key={question.no}>
                    <div className="q-head">
                      <span>
                        <span className="q-no">{question.no}</span>
                        {question.content}
                      </span>
                      {question.correct ? (
                        <CheckCircle2 size={15} style={{ color: "var(--success)", flex: "none" }} aria-label="正确" />
                      ) : (
                        <XCircle size={15} style={{ color: "var(--danger)", flex: "none" }} aria-label="错误" />
                      )}
                    </div>
                    <div className="q-answer-row">
                      <span>
                        学生作答：<b className={question.correct ? "" : "wrong"}>{question.studentAnswer}</b>
                      </span>
                      <span>
                        正确答案：<b>{question.correctAnswer}</b>
                      </span>
                    </div>
                    {question.errorTag && (
                      <div style={{ marginTop: 6 }}>
                        <Tag tone="danger">{question.errorTag}</Tag>
                      </div>
                    )}
                    {question.errorReason && <div className="q-reason">{question.errorReason}</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 22 }}>
              <SectionHead title="10 分钟讲评稿" eyebrow="按错因排顺序 · 可直接照着讲" />
              <div>
                {result.script.map((item) => (
                  <div className="script-item" key={item.title}>
                    <span className="script-time num">{item.minutes}′</span>
                    <div>
                      <div className="script-title">{item.title}</div>
                      <div className="script-detail">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-pad" style={{ marginTop: 12 }}>
              <div className="section-head">
                <h2 className="section-title">补救练习</h2>
                <button
                  type="button"
                  className="section-action"
                  onClick={() => setShowAnswers((prev) => !prev)}
                >
                  {showAnswers ? "隐藏答案" : "显示答案"}
                </button>
              </div>
              <div className="stack" style={{ gap: 9 }}>
                {result.exercises.map((exercise, index) => (
                  <div key={exercise.question} className="menu-item" style={{ padding: 0, alignItems: "flex-start" }}>
                    <span className="hotspot-rank">{index + 1}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ fontSize: "calc(12.5px * var(--site-type))" }}>{exercise.question}</span>
                      {showAnswers && (
                        <span
                          className="tiny"
                          style={{ display: "block", marginTop: 3, color: "var(--site-accent)" }}
                        >
                          答案：{exercise.answer}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={reset}>
                <RotateCcw size={15} aria-hidden="true" />
                再拍一张
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saved}
              >
                <Save size={15} aria-hidden="true" />
                {saved ? "已保存" : "保存讲评记录"}
              </button>
            </div>

            {fractionPlan && (
              <button
                type="button"
                className="banner banner--green"
                style={{ width: "100%", marginTop: 12, cursor: "pointer", textAlign: "left" }}
                onClick={() => navigate(`/plan/${fractionPlan.id}`)}
              >
                <Sparkles size={16} aria-hidden="true" />
                <span style={{ flex: 1 }}>
                  这次错因集中在分数加减法，打开对应全国教案再备一节巩固课
                </span>
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )}

            <div className="site-foot">
              识别结果来自本地演示引擎；正式版将以多模态模型逐题分析
              <br />
              学生不进产品：讲评稿只给教师使用
            </div>
          </>
        )}
      </div>
    </>
  );
}