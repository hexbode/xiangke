import { ArrowRight, Check, GraduationCap, HeartHandshake, ShieldCheck } from "lucide-react";
import { PageHeader, SectionHead, Tag } from "@/components/ui";
import { navigate } from "@/lib/router";

const ROWS = [
  ["多媒体条件", "无设备 / 仅电视 / 有白板", "无设备时全课改为板书 + 纸笔 + 口述"],
  ["教具条件", "无 / 可自备 / 有限教具箱", "给出纸条、瓶盖、玉米粒等生活化替代"],
  ["班级规模", "复式班 / 小班 / 大班", "复式班生成同课题分年级任务单"],
  ["课时长度", "40 分钟 / 30 分钟", "重排环节时长，保留核心探究与反馈"],
  ["学情基础", "待补基础 / 正常 / 学有余力", "作业按基础、提升、拓展三层给"],
];

const METRICS = [
  ["单节课备课耗时", "从打开到教案可用，试点前后对比"],
  ["教案可直接上课率", "教师 1–5 星评分，目标 ≥ 80%"],
  ["全国资源复用率", "被复用 ≥ 1 次的全国公开教案占比"],
  ["覆盖学科与年级", "全国库覆盖的学科 × 年级组合"],
  ["受益学生数", "按复用教案覆盖的班级学生数推算"],
];

export function AboutPage() {
  return (
    <>
      <PageHeader title="关于乡课" />

      <div className="page">
        <section className="about-hero">
          <div className="about-kicker">HACK4GOOD · 教育与乡村</div>
          <h1 className="about-title">
            把「没有投影仪」
            <br />
            <em>写进教案。</em>
          </h1>
          <p style={{ fontSize: "calc(12.5px * var(--site-type))", lineHeight: 1.7, opacity: 0.82, margin: "10px 0 0" }}>
            乡课是面向乡村小规模学校教师的 AI 备课与全国教研共享工具：让 AI 按真实条件生成能直接上的课，
            让一位老师的备课，变成全国教师的公共资源。
          </p>
          <div className="hero-conditions">
            <span className="hero-chip">教师端</span>
            <span className="hero-chip">学生不进产品</span>
            <span className="hero-chip">全国认证</span>
            <span className="hero-chip">改编链</span>
          </div>
        </section>

        <div className="kpi-strip" style={{ marginTop: 12 }}>
          <div className="kpi-cell">
            <div className="kpi-value num">0</div>
            <div className="kpi-label">学生账号</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">3</div>
            <div className="kpi-label">层资源治理</div>
          </div>
          <div className="kpi-cell">
            <div className="kpi-value num">5</div>
            <div className="kpi-label">类乡村约束</div>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 20 }}>
          <div className="section-head">
            <h2 className="section-title">为什么做教师端</h2>
          </div>
          <ul className="bullet-list">
            <li>学生端会增加屏幕时间，与「双减」和视力保护导向相悖。</li>
            <li>乡村家庭多为祖辈看护，缺少设备管理与学习监督。</li>
            <li>教师是更高杠杆的切入点：一位老师的一节课，直接影响几十个学生。</li>
          </ul>
          <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.65 }}>
            所以乡课不做 AI 家教、不做学生端、不做直播双师，只把力气花在教师备课上。
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="三层能力模型" eyebrow="生成 → 公开 → 复用" />
          <div className="stack">
            {[
              {
                n: "01",
                title: "AI 生成：乡村约束是一等输入",
                desc: "教材、年级、学科、课时之外，把无投影、无教具、复式班、学情基础显式写进生成契约。",
              },
              {
                n: "02",
                title: "教师原创即时公开：无需审批，教研员可查看",
                desc: "教师生成的教案即时以「教师原创」公开到全国资源库，不设通过 / 退回环节；教研员可随时查看全平台教师教案。全国认证作为平台精选标识保留。",
              },
              {
                n: "03",
                title: "改编复用：越用越多，也越用越准",
                desc: "一键复用生成副本，保留原作者与来源教案 ID，改编链全程可追溯。",
              },
            ].map((item) => (
              <div className="card card-pad" key={item.n}>
                <div style={{ display: "flex", gap: 11 }}>
                  <span
                    className="num"
                    style={{
                      fontFamily: '"Songti SC", "STSong", serif',
                      fontSize: "calc(20px * var(--site-type))",
                      fontWeight: 700,
                      color: "var(--site-accent)",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.n}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "calc(13.5px * var(--site-type))" }}>
                      {item.title}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.65 }}>
                      {item.desc}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="乡村约束建模" eyebrow="通用 AI 默认的理想条件，在村小大多不成立" />
          <div className="card card-pad">
            {ROWS.map(([dim, options, effect]) => (
              <div key={dim} style={{ padding: "9px 0", borderBottom: "1px dashed var(--site-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: "calc(12.5px * var(--site-type))" }}>{dim}</span>
                  <span className="tiny muted" style={{ textAlign: "right" }}>
                    {options}
                  </span>
                </div>
                <div className="tiny" style={{ marginTop: 2, color: "var(--site-accent)", lineHeight: 1.55 }}>
                  {effect}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="复习课与配套试题" eyebrow="查漏补缺 · 当堂检测" />
          <div className="card card-pad">
            <ul className="bullet-list">
              <li>复习课按知识网络、典型例题、错题讲评组织，先梳理后练习。</li>
              <li>
                可选择是否生成配套试题，并设置难度（基础 / 适中 / 挑战）、题数（5–15）、题型与知识区间。
              </li>
              <li>试题围绕知识区间生成，含参考答案与解析，随教案保存和打印。</li>
              <li>课件按课时生成：先定课时边界（只教什么、不教什么），再排核心活动、环节时间与每页固定字段（学生做什么 / 教师问什么 / 学生得出 / 教师备注 / 配图建议），生成前自动自检课时、容量与答案；支持全屏演示与导出 .pptx。</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <SectionHead title="社会价值指标" eyebrow="只写能在项目周期内测到的" />
          <div className="card card-pad">
            {METRICS.map(([name, definition]) => (
              <div className="metric-row" key={name}>
                <span>{name}</span>
                <b style={{ fontSize: "calc(11px * var(--site-type))", fontWeight: 500, textAlign: "right" }}>
                  {definition}
                </b>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 22 }}>
          <div className="section-head">
            <h2 className="section-title">边界与合规</h2>
            <Tag tone="plain">不向教师收费</Tag>
          </div>
          <ul className="bullet-list">
            <li>学生不进产品：不收集学生账号、不使用学生人脸与姓名。</li>
            <li>作业图片上传即裁切题目、姓名区域打码，7 天自动删除，不进公共库。</li>
            <li>AI 内容标注生成来源；教师原创即时公开，教研员可查看；一键纠错进入评测集，全国认证为平台精选标识。</li>
            <li>教材版权：只引用目录结构，不复制教材正文。</li>
            <li>B2G 可持续：区域教育局采购 + 公益基金会资助，学校免费给教师使用。</li>
          </ul>
        </div>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div className="section-head">
            <h2 className="section-title">关于这个演示</h2>
          </div>
          <div className="small muted" style={{ lineHeight: 1.7 }}>
            本作品参加 2026 Qoder 高校创造力大赛 Hack4Good 技术向善赛道，提交形态为可公开访问的移动端 Web 应用，
            模拟微信小程序教师端的完整体验。
            <br />
            <br />
            演示版不调用外部大模型：「AI 生成」由本地规则引擎完成，教案内容为精编与模板生成；
            数据保存在浏览器本机，不上传服务器；初始不含演示数据，平台支持全国 34 个省级行政区
            （含港澳台）与一至九年级九年义务教育，教案、课件与统计均由登录教师在本机生成。
            正式版将接入大模型结构化输出、微信内容安全与图片脱敏，并迁移到微信小程序 + 云开发。
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <Tag>结构化教案包</Tag>
            <Tag>全国认证</Tag>
            <Tag>改编链</Tag>
            <Tag tone="plain">本地存储</Tag>
            <Tag tone="plain">本机数据</Tag>
          </div>
        </div>

        <div className="card card-pad" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span className="menu-icon">
              <GraduationCap size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "calc(13px * var(--site-type))" }}>三个记忆点</div>
              <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.7 }}>
                没有投影也能上的教案；
                <br />
                一位老师的备课变成全国的公共资源；
                <br />
                学生不碰屏幕。
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={() => navigate("/prepare")}>
            备一堂能上的课
            <ArrowRight size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: "none" }}
            onClick={() => navigate("/library")}
          >
            <Check size={15} aria-hidden="true" />
            逛全国库
          </button>
        </div>

        <div className="site-foot">
          <HeartHandshake size={12} style={{ verticalAlign: -2 }} aria-hidden="true" /> 技术向善 · 教育与乡村
          <br />
          <ShieldCheck size={11} style={{ verticalAlign: -1 }} aria-hidden="true" /> 教师端 · 学生不碰屏幕
          <br />
          乡课：让村小的老师，也能备一堂好课。
        </div>
      </div>
    </>
  );
}