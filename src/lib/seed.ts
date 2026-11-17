import { uid } from "./engine";
import { STATE_VERSION } from "./types";
import type { AppState, Teacher } from "./types";

// 应用初始为空：不预置教案、学校、讲评与统计数据，所有内容由登录教师生成。
const EMPTY_TEACHER: Teacher = {
  id: "teacher-me",
  name: "",
  schoolId: "",
  school: "",
  province: "",
  county: "",
  subjects: ["数学", "科学"],
  years: 1,
  points: 0,
  title: "教师",
};

export function createSeedState(): AppState {
  return {
    version: STATE_VERSION,
    role: "teacher",
    teacher: { ...EMPTY_TEACHER },
    reviewerName: "",
    profile: null,
    schools: [],
    plans: [],
    reviews: [],
    scans: [],
    feedbacks: [],
    myRatings: {},
  };
}

export function makeLocalPlanId(): string {
  return uid("plan");
}
