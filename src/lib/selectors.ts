import { GRADES } from "./types";
import type { AppState, Plan, RuralConditions, Subject, Grade, School } from "./types";

export function getPlan(state: AppState, id: string): Plan | undefined {
  return state.plans.find((plan) => plan.id === id);
}

export function publicPlans(state: AppState): Plan[] {
  return state.plans
    .filter((plan) => plan.status === "original" || plan.status === "certified")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function teacherPlans(state: AppState): Plan[] {
  // 教研员与教师都能看到全部已生成教案（含私有），用于跨校互看
  return [...state.plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function myPlans(state: AppState): Plan[] {
  return state.plans
    .filter((plan) => plan.authorId === state.teacher.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function avgRating(plan: Pick<Plan, "ratingSum" | "ratingCount">): number {
  if (!plan.ratingCount) return 0;
  return Math.round((plan.ratingSum / plan.ratingCount) * 10) / 10;
}

export function conditionLabels(conditions: RuralConditions): string[] {
  const media =
    conditions.media === "无设备" ? "无投影" : conditions.media === "仅电视" ? "仅电视" : "有白板";
  const aids =
    conditions.aids === "无" ? "无教具" : conditions.aids === "可自备" ? "教具自备" : "教具箱";
  const level =
    conditions.level === "待补基础" ? "基础待补" : conditions.level === "学有余力" ? "学有余力" : "学情正常";
  return [media, aids, conditions.classType, `${conditions.minutes}分钟`, level];
}

export interface Chain {
  lineage: Plan[];
  forks: Plan[];
}

export function chainFor(state: AppState, planId: string): Chain {
  const map = new Map(state.plans.map((plan) => [plan.id, plan]));
  const lineage: Plan[] = [];
  let cursor = map.get(planId);
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    lineage.unshift(cursor);
    cursor = cursor.sourcePlanId ? map.get(cursor.sourcePlanId) : undefined;
  }
  const forks = state.plans
    .filter((plan) => plan.sourcePlanId === planId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { lineage, forks };
}

export interface ProvinceCoverage {
  province: string;
  plans: number;
  reuse: number;
  schools: number;
}

export interface NationalStats {
  total: number;
  certifiedCount: number;
  originalCount: number;
  reuseTotal: number;
  reuseRate: number;
  schools: number;
  provinces: number;
  teachers: number;
  students: number;
  avg: number;
  subjectGrade: { subject: Subject; grade: Grade; count: number }[];
  subjects: Subject[];
  grades: Grade[];
  topPlans: Plan[];
  provinceCoverage: ProvinceCoverage[];
}

const SUBJECT_ORDER: Subject[] = ["语文", "数学", "科学", "道德与法治", "英语"];
const GRADE_ORDER: Grade[] = [...GRADES];

export function nationalStats(state: AppState): NationalStats {
  const published = state.plans.filter(
    (plan) => plan.status === "original" || plan.status === "certified",
  );
  const certifiedCount = published.filter((plan) => plan.status === "certified").length;
  const originalCount = published.length - certifiedCount;
  const reuseTotal = published.reduce((sum, plan) => sum + plan.reuseCount, 0);
  const reused = published.filter((plan) => plan.reuseCount > 0).length;
  const ratingCount = published.reduce((sum, plan) => sum + plan.ratingCount, 0);
  const ratingSum = published.reduce((sum, plan) => sum + plan.ratingSum, 0);

  const schoolMap = new Map<string, School>(state.schools.map((school) => [school.id, school]));
  const coveredSchoolIds = new Set(published.map((plan) => plan.schoolId));
  const schools = coveredSchoolIds.size;
  const provinces = new Set(published.map((plan) => plan.province)).size;
  const teachers = new Set(published.map((plan) => plan.authorId)).size;
  const students = Array.from(coveredSchoolIds).reduce(
    (sum, id) => sum + (schoolMap.get(id)?.students ?? 0),
    0,
  );

  const cells: NationalStats["subjectGrade"] = [];
  for (const subject of SUBJECT_ORDER) {
    for (const grade of GRADE_ORDER) {
      const matched = published.filter(
        (plan) => plan.meta.subject === subject && plan.meta.grade === grade,
      );
      cells.push({
        subject,
        grade,
        count: matched.reduce((sum, plan) => sum + plan.reuseCount + 1, 0),
      });
    }
  }

  const provinceMap = new Map<string, { plans: number; reuse: number; schoolIds: Set<string> }>();
  published.forEach((plan) => {
    const entry = provinceMap.get(plan.province) ?? {
      plans: 0,
      reuse: 0,
      schoolIds: new Set<string>(),
    };
    entry.plans += 1;
    entry.reuse += plan.reuseCount;
    entry.schoolIds.add(plan.schoolId);
    provinceMap.set(plan.province, entry);
  });

  const provinceCoverage: ProvinceCoverage[] = Array.from(provinceMap.entries())
    .map(([province, entry]) => ({
      province,
      plans: entry.plans,
      reuse: entry.reuse,
      schools: entry.schoolIds.size,
    }))
    .sort((a, b) => b.plans - a.plans || b.reuse - a.reuse);

  return {
    total: published.length,
    certifiedCount,
    originalCount,
    reuseTotal,
    reuseRate: published.length ? Math.round((reused / published.length) * 100) : 0,
    schools,
    provinces,
    teachers,
    students,
    avg: ratingCount ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0,
    subjectGrade: cells,
    subjects: SUBJECT_ORDER,
    grades: GRADE_ORDER,
    topPlans: [...published].sort((a, b) => b.reuseCount - a.reuseCount).slice(0, 5),
    provinceCoverage,
  };
}