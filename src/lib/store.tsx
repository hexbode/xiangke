import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPlan, generateContent, uid } from "./engine";
import { generatePptDeck } from "./pptEngine";
import { buildVisualPlan } from "./visualPlan";
import { createSeedState, makeLocalPlanId } from "./seed";
import type {
  AppState,
  LessonMeta,
  LessonType,
  LoginProfile,
  Plan,
  QuizSettings,
  Role,
  RuralConditions,
  ScanResult,
} from "./types";
import { STATE_VERSION } from "./types";

const STORAGE_KEY = "xiangke.state.v1";

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (
        parsed &&
        parsed.version === STATE_VERSION &&
        Array.isArray(parsed.plans) &&
        parsed.teacher?.province
      ) {
        // 旧课件迁移：带试题但练题页还没有闯关情境时，自动重建一次
        const plans = parsed.plans.map((plan) => {
          const hasGameQuiz = plan.ppt?.slides.some((slide) =>
            (slide.kicker ?? "").includes("答对得星"),
          );
          if (plan.quiz && plan.ppt && !hasGameQuiz) {
            return {
              ...plan,
              ppt: generatePptDeck({
                meta: plan.meta,
                author: plan.authorName,
                school: plan.school,
                lessonType: plan.lessonType,
                knowledgeRange: plan.knowledgeRange,
                quiz: plan.quiz,
              }),
            };
          }
          return plan;
        });
        // 旧课件补齐配图方案：不重建内容，只为流程页补上 Mermaid / 代码 / 提示词
        const enriched = plans.map((plan) => {
          if (!plan.ppt) return plan;
          let changed = false;
          const slides = plan.ppt.slides.map((slide) => {
            if (
              slide.visualPlan ||
              slide.kind !== "lesson" ||
              !slide.activity ||
              !slide.visualHint ||
              slide.bullets.length > 0 ||
              (slide.kicker ?? "").includes("答对得星")
            ) {
              return slide;
            }
            changed = true;
            return {
              ...slide,
              visualPlan: buildVisualPlan({
                hint: slide.visualHint,
                title: slide.title,
                lesson: plan.meta.lesson,
                subject: plan.meta.subject,
                grade: plan.meta.grade,
                question: slide.question,
                conclusion: slide.conclusion,
              }),
            };
          });
          return changed ? { ...plan, ppt: { ...plan.ppt, slides } } : plan;
        });
        return { ...parsed, plans: enriched };
      }
    }
  } catch {
    // 存储不可用时退回种子数据，应用仍可演示。
  }
  return createSeedState();
}

interface GenerateOptions {
  lessonType?: LessonType;
  knowledgeRange?: string;
  quizSettings?: QuizSettings;
  pptEnabled?: boolean;
  pptPageCount?: number;
}

interface StoreValue {
  state: AppState;
  generatePlan: (meta: LessonMeta, conditions: RuralConditions, options?: GenerateOptions) => Plan;
  forkPlan: (sourceId: string, note: string, readapt: boolean) => Plan | null;
  publishPlan: (planId: string) => void;
  ratePlan: (planId: string, stars: number) => void;
  addFeedback: (planId: string, text: string) => void;
  saveScan: (scan: ScanResult) => ScanResult;
  setRole: (role: Role) => void;
  login: (profile: LoginProfile) => void;
  logout: () => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage 已满或被禁用时静默降级。
    }
  }, [state]);

  const generatePlan = useCallback(
    (meta: LessonMeta, conditions: RuralConditions, options?: GenerateOptions) => {
      const school = state.schools.find((item) => item.id === state.teacher.schoolId);
      const plan = createPlan(
        { meta, conditions, ...options },
        state.teacher,
        {
          id: state.teacher.schoolId,
          name: state.teacher.school,
          province: school?.province ?? state.teacher.province,
          county: school?.county ?? state.teacher.county,
        },
        "original",
      );
      setState((prev) => ({ ...prev, plans: [plan, ...prev.plans] }));
      return plan;
    },
    [state.schools, state.teacher],
  );

  const forkPlan = useCallback(
    (sourceId: string, note: string, readapt: boolean) => {
      const source = state.plans.find((plan) => plan.id === sourceId);
      if (!source) return null;
      const now = new Date().toISOString();
      const school = state.schools.find((item) => item.id === state.teacher.schoolId);
      const conditions = readapt && school ? school.conditions : source.conditions;
      const content = readapt
        ? generateContent(source.meta, conditions, {
            lessonType: source.lessonType,
            knowledgeRange: source.knowledgeRange,
          })
        : structuredClone(source.content);
      const ppt = source.ppt
        ? generatePptDeck({
            meta: source.meta,
            author: state.teacher.name,
            school: state.teacher.school,
            lessonType: source.lessonType,
            knowledgeRange: source.knowledgeRange,
            pageCount: source.quiz ? undefined : source.ppt.slides.length,
            quiz: source.quiz,
          })
        : undefined;
      const copy: Plan = {
        id: makeLocalPlanId(),
        meta: { ...source.meta },
        conditions: { ...conditions },
        content,
        lessonType: source.lessonType,
        knowledgeRange: source.knowledgeRange,
        quiz: source.quiz ? structuredClone(source.quiz) : undefined,
        ppt,
        authorId: state.teacher.id,
        authorName: state.teacher.name,
        schoolId: state.teacher.schoolId,
        school: state.teacher.school,
        province: school?.province ?? state.teacher.province,
        county: school?.county ?? state.teacher.county,
        status: "private",
        sourcePlanId: source.id,
        forkNote: note.trim() || undefined,
        reuseCount: 0,
        ratingSum: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      setState((prev) => ({
        ...prev,
        plans: [
          copy,
          ...prev.plans.map((plan) =>
            plan.id === sourceId
              ? { ...plan, reuseCount: plan.reuseCount + 1, updatedAt: now }
              : plan,
          ),
        ],
      }));
      return copy;
    },
    [state.plans, state.schools, state.teacher],
  );

  const publishPlan = useCallback((planId: string) => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      plans: prev.plans.map((plan) =>
        plan.id === planId && plan.status === "private"
          ? { ...plan, status: "original", updatedAt: now }
          : plan,
      ),
    }));
  }, []);

  const ratePlan = useCallback((planId: string, stars: number) => {
    setState((prev) => {
      const prevStars = prev.myRatings[planId];
      return {
        ...prev,
        myRatings: { ...prev.myRatings, [planId]: stars },
        plans: prev.plans.map((plan) => {
          if (plan.id !== planId) return plan;
          if (prevStars) {
            return { ...plan, ratingSum: plan.ratingSum - prevStars + stars };
          }
          return { ...plan, ratingSum: plan.ratingSum + stars, ratingCount: plan.ratingCount + 1 };
        }),
      };
    });
  }, []);

  const addFeedback = useCallback((planId: string, text: string) => {
    setState((prev) => ({
      ...prev,
      feedbacks: [
        {
          id: uid("fb"),
          planId,
          text: text.trim(),
          at: new Date().toISOString(),
          by: prev.teacher.name,
        },
        ...prev.feedbacks,
      ],
    }));
  }, []);

  const saveScan = useCallback((scan: ScanResult) => {
    setState((prev) => ({ ...prev, scans: [scan, ...prev.scans].slice(0, 20) }));
    return scan;
  }, []);

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, role }));
  }, []);

  const login = useCallback((profile: LoginProfile) => {
    const name = profile.name.trim();
    const province = profile.province.trim();
    const county = profile.county.trim();
    if (!name || !province || !county) return;
    if (profile.role === "reviewer") {
      setState((prev) => ({
        ...prev,
        role: "reviewer",
        profile: { name, province, county, role: "reviewer" },
        reviewerName: name,
        teacher: {
          ...prev.teacher,
          name,
          province,
          county,
          school: "",
          schoolId: "",
          title: "教研员",
        },
      }));
      return;
    }
    setState((prev) => ({
      ...prev,
      role: "teacher",
      profile: { name, province, county, role: "teacher" },
      teacher: {
        ...prev.teacher,
        name,
        province,
        county,
        school: "",
        schoolId: "",
        title: "教师",
      },
    }));
  }, []);

  const logout = useCallback(() => {
    setState((prev) => ({ ...prev, profile: null, role: "teacher" }));
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略存储异常。
    }
    setState(createSeedState());
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      generatePlan,
      forkPlan,
      publishPlan,
      ratePlan,
      addFeedback,
      saveScan,
      setRole,
      login,
      logout,
      resetDemo,
    }),
    [
      state,
      generatePlan,
      forkPlan,
      publishPlan,
      ratePlan,
      addFeedback,
      saveScan,
      setRole,
      login,
      logout,
      resetDemo,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside StoreProvider");
  return value;
}