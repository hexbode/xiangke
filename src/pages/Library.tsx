import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PlanCard } from "@/components/PlanCard";
import { OerHub } from "@/components/OerHub";
import { Chip, EmptyState, PageHeader } from "@/components/ui";
import { avgRating, publicPlans } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { GRADES, PROVINCES, SUBJECTS } from "@/lib/types";
import type { Grade, Subject } from "@/lib/types";

type SortKey = "reuse" | "new" | "rating";
type SourceKey = "all" | "certified" | "original";
type CourseKey = "all" | "new" | "review";

export function LibraryPage() {
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("全部");
  const [source, setSource] = useState<SourceKey>("all");
  const [course, setCourse] = useState<CourseKey>("all");
  const [subject, setSubject] = useState<Subject | "全部">("全部");
  const [grade, setGrade] = useState<Grade | "全部">("全部");
  const [sort, setSort] = useState<SortKey>("reuse");
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [provincePage, setProvincePage] = useState(0);
  const provinceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!provinceOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!provinceRef.current?.contains(event.target as Node)) setProvinceOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProvinceOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [provinceOpen]);

  const published = publicPlans(state);
  const certifiedCount = published.filter((plan) => plan.status === "certified").length;
  const originalCount = published.length - certifiedCount;
  const provinceOrder = PROVINCES as readonly string[];
  const provinceTotals = Array.from(new Set(published.map((plan) => plan.province))).sort(
    (a, b) => provinceOrder.indexOf(a) - provinceOrder.indexOf(b),
  );
  // 省份下拉分页展示，每页 10 个
  const PROVINCE_PAGE_SIZE = 10;
  const provincePageCount = Math.max(1, Math.ceil(provinceTotals.length / PROVINCE_PAGE_SIZE));
  const pageProvinces = provinceTotals.slice(
    provincePage * PROVINCE_PAGE_SIZE,
    provincePage * PROVINCE_PAGE_SIZE + PROVINCE_PAGE_SIZE,
  );

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = published.filter((plan) => {
      if (province !== "全部" && plan.province !== province) return false;
      if (source !== "all" && plan.status !== source) return false;
      if (course !== "all" && (plan.lessonType ?? "new") !== course) return false;
      if (subject !== "全部" && plan.meta.subject !== subject) return false;
      if (grade !== "全部" && plan.meta.grade !== grade) return false;
      if (!keyword) return true;
      return [
        plan.meta.lesson,
        plan.authorName,
        plan.province,
        plan.county,
        plan.meta.subject,
        plan.meta.grade,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
    return filtered.sort((a, b) => {
      if (sort === "new") return b.updatedAt.localeCompare(a.updatedAt);
      if (sort === "rating") return avgRating(b) - avgRating(a) || b.ratingCount - a.ratingCount;
      return b.reuseCount - a.reuseCount;
    });
  }, [published, query, province, source, course, subject, grade, sort]);

  const reset = () => {
    setQuery("");
    setProvince("全部");
    setSource("all");
    setCourse("all");
    setSubject("全部");
    setGrade("全部");
    setSort("reuse");
  };

  return (
    <>
      <PageHeader
        title="全国资源库"
        back={false}
        right={<BookOpen size={17} className="muted" />}
      />

      <div className="page">
        <p className="small muted" style={{ margin: "0 0 12px" }}>
          {published.length} 份全国教案 · {certifiedCount} 份全国认证 ·{" "}
          {originalCount} 份教师原创 · {provinceTotals.length} 个省份
        </p>

        <div className="library-search">
          <Search size={16} className="library-search-icon" aria-hidden="true" />
          <input
            className="input"
            value={query}
            placeholder="搜索课题、教师或省份"
            aria-label="搜索全国资源"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div style={{ marginTop: 12 }} className="stack" role="group" aria-label="筛选条件">
          <div className="filter-row">
            <Chip small active={source === "all"} onClick={() => setSource("all")}>
              全部来源
            </Chip>
            <Chip small active={source === "certified"} onClick={() => setSource("certified")}>
              全国认证
            </Chip>
            <Chip small active={source === "original"} onClick={() => setSource("original")}>
              教师原创
            </Chip>
          </div>
          <div className="filter-row">
            <Chip small active={course === "all"} onClick={() => setCourse("all")}>
              全部课型
            </Chip>
            <Chip small active={course === "new"} onClick={() => setCourse("new")}>
              新授课
            </Chip>
            <Chip small active={course === "review"} onClick={() => setCourse("review")}>
              复习课
            </Chip>
          </div>
          <div className="filter-row" style={{ alignItems: "center" }}>
            <span className="tiny muted" style={{ flex: "none" }}>
              省份
            </span>
            <div ref={provinceRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="input"
                aria-haspopup="listbox"
                aria-expanded={provinceOpen}
                aria-label="按省份筛选"
                onClick={() => setProvinceOpen((prev) => !prev)}
                style={{
                  width: 148,
                  padding: "7px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span>{province === "全部" ? "全部省份" : province}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {provinceOpen && (
                <div
                  role="listbox"
                  aria-label="省份列表"
                  style={{
                    position: "absolute",
                    zIndex: 40,
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: 236,
                    padding: 10,
                    background: "var(--site-surface)",
                    border: "1px solid var(--site-border)",
                    borderRadius: 12,
                    boxShadow: "0 10px 24px rgba(20, 30, 20, 0.16)",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                    {pageProvinces.map((item) => (
                      <Chip
                        key={item}
                        small
                        active={province === item}
                        onClick={() => {
                          setProvince(item);
                          setProvinceOpen(false);
                        }}
                      >
                        {item}
                      </Chip>
                    ))}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px solid var(--site-border)",
                    }}
                  >
                    <button
                      type="button"
                      className="link-btn"
                      style={{ fontSize: "calc(11px * var(--site-type))" }}
                      onClick={() => {
                        setProvince("全部");
                        setProvinceOpen(false);
                      }}
                    >
                      全部省份
                    </button>
                    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="上一页省份"
                        disabled={provincePage === 0}
                        onClick={() => setProvincePage((prev) => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="tiny muted">
                        {provincePage + 1}/{provincePageCount}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="下一页省份"
                        disabled={provincePage >= provincePageCount - 1}
                        onClick={() =>
                          setProvincePage((prev) => Math.min(provincePageCount - 1, prev + 1))
                        }
                      >
                        <ChevronRight size={14} />
                      </button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="filter-row">
            <Chip small active={subject === "全部"} onClick={() => setSubject("全部")}>
              全部学科
            </Chip>
            {SUBJECTS.map((item) => (
              <Chip key={item} small active={subject === item} onClick={() => setSubject(item)}>
                {item}
              </Chip>
            ))}
          </div>
          <div className="filter-row">
            <Chip small active={grade === "全部"} onClick={() => setGrade("全部")}>
              全部年级
            </Chip>
            {GRADES.map((item) => (
              <Chip key={item} small active={grade === item} onClick={() => setGrade(item)}>
                {item}
              </Chip>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            margin: "16px 0 10px",
          }}
        >
          <span className="tiny muted">找到 {results.length} 份</span>
          <div className="filter-row" style={{ padding: 0 }}>
            {(
              [
                ["reuse", "复用最多"],
                ["new", "最新公开"],
                ["rating", "评分最高"],
              ] as [SortKey, string][]
            ).map(([key, label]) => (
              <Chip key={key} small active={sort === key} onClick={() => setSort(key)}>
                {label}
              </Chip>
            ))}
          </div>
        </div>

        {results.length === 0 ? (
          <EmptyState
            icon={<Search size={19} />}
            title="没有匹配的全国资源"
            desc="换个省份或学科试试，也可以自己生成一份，即时公开。"
            action={
              <button type="button" className="btn btn-sm" onClick={reset}>
                清除筛选
              </button>
            }
          />
        ) : (
          <div className="stack">
            {results.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        <OerHub defaultKeyword={query} />

        <div className="site-foot">
          教师生成的教案即时公开为「教师原创」，无需审批，教研员可查看
          <br />
          全国认证是平台精选标识；复用会自动记录改编链
        </div>
      </div>
    </>
  );
}