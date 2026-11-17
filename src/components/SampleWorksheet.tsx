const ROWS = [
  { q: "1. 3/4 + 1/4 =", a: "4/8", wrong: true },
  { q: "2. 1 - 2/5 =", a: "3/5", wrong: false },
  { q: "3. 一根绳子平均分成 8 段，每段是全长的（　）。", a: "1/8", wrong: false },
  { q: "4. 比较大小：3/5 ○ 2/5", a: "3/5 < 2/5", wrong: true },
  { q: "5. 2/6 + 3/6 =", a: "5/6", wrong: false },
  { q: "6. 一杯水喝了 1/4，还剩（　）。", a: "3/4", wrong: false },
  { q: "7. 5/7 - 2/7 =", a: "3/0", wrong: true },
  { q: "8. 判断：所有分数都小于 1。（　）", a: "对", wrong: true },
];

export function SampleWorksheet() {
  return (
    <div className="worksheet-wrap">
      <div className="worksheet" aria-label="示例学生作业：分数单元小测">
        <span className="privacy-mask" aria-hidden="true" />
        <div className="worksheet-head">
          <span className="worksheet-title">分数单元随堂小测</span>
          <span>姓名：■■■</span>
        </div>
        {ROWS.map((row) => (
          <div className={`ws-row ${row.wrong ? "ws-row--wrong" : ""}`} key={row.q}>
            <span>{row.q}</span>
            <span className="ws-answer">{row.a}</span>
            <span className="ws-check" aria-hidden="true">
              {row.wrong ? "✗" : "✓"}
            </span>
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            paddingTop: 6,
            borderTop: "1px dashed #ded6c2",
            fontSize: 9.5,
            color: "#8a8271",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>云岭县白石乡中心小学 三年级</span>
          <span>示例作业 · 姓名已打码</span>
        </div>
      </div>
    </div>
  );
}