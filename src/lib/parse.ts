import type { Grade, LessonMeta, RuralConditions, Subject, Textbook } from "./types";

export interface ParsedUtterance {
  meta: LessonMeta;
  conditions: RuralConditions;
  understood: string[];
  missing: string[];
}

const LESSON_HINTS: { test: RegExp; lesson: string }[] = [
  { test: /分数/, lesson: "分数的初步认识" },
  { test: /小数/, lesson: "小数的意义" },
  { test: /乘法/, lesson: "表内乘法（一）" },
  { test: /进位加法|20以内/, lesson: "20以内的进位加法" },
  { test: /平行四边形/, lesson: "平行四边形的面积" },
  { test: /圆的周长|周长/, lesson: "圆的周长" },
  { test: /角的度量|量角/, lesson: "角的度量" },
  { test: /年月日|年、月、日/, lesson: "年、月、日" },
  { test: /扇形统计图/, lesson: "扇形统计图" },
  { test: /秋天|秋雨/, lesson: "秋天的雨" },
  { test: /小小的船/, lesson: "小小的船" },
  { test: /狐假虎威/, lesson: "狐假虎威" },
  { test: /爬山虎/, lesson: "爬山虎的脚" },
  { test: /少年闰土|闰土/, lesson: "少年闰土" },
  { test: /桥/, lesson: "桥" },
  { test: /种子|发芽/, lesson: "种子发芽实验" },
  { test: /空气/, lesson: "空气占据空间吗" },
  { test: /电路/, lesson: "电路出故障了" },
  { test: /地球/, lesson: "地球的形状" },
  { test: /光的传播|光/, lesson: "光的传播" },
  { test: /权利|宪法/, lesson: "公民的基本权利" },
  { test: /安全/, lesson: "安全记心上" },
  { test: /班级/, lesson: "我们是班级的主人" },
  { test: /colours|colors/i, lesson: "Colours" },
  { test: /my week|week/i, lesson: "My Week" },
  { test: /my school|school/i, lesson: "My School" },
];

const GRADE_MAP: { test: RegExp; grade: Grade }[] = [
  { test: /一年级|[一1]年级/, grade: "一年级" },
  { test: /二年级|[二2]年级/, grade: "二年级" },
  { test: /三年级|[三3]年级/, grade: "三年级" },
  { test: /四年级|[四4]年级/, grade: "四年级" },
  { test: /五年级|[五5]年级/, grade: "五年级" },
  { test: /六年级|[六6]年级/, grade: "六年级" },
  { test: /七年级|初一|[七7]年级/, grade: "七年级" },
  { test: /八年级|初二|[八8]年级/, grade: "八年级" },
  { test: /九年级|初三|[九9]年级/, grade: "九年级" },
];

function defaultTextbook(subject: Subject): Textbook {
  if (subject === "语文" || subject === "道德与法治") return "统编版";
  if (subject === "科学") return "教科版";
  return "人教版";
}

export function parseUtterance(text: string, defaults: RuralConditions): ParsedUtterance {
  const raw = text.trim();
  const understood: string[] = [];
  const missing: string[] = [];

  let subject: Subject | null = null;
  if (/道德与法治|道法|品德/.test(raw)) subject = "道德与法治";
  else if (/英语|english/i.test(raw)) subject = "英语";
  else if (/科学/.test(raw)) subject = "科学";
  else if (/数学/.test(raw)) subject = "数学";
  else if (/语文|课文/.test(raw)) subject = "语文";
  if (subject) understood.push(subject);
  else missing.push("学科");

  let grade: Grade | null = null;
  for (const item of GRADE_MAP) {
    if (item.test.test(raw)) {
      grade = item.grade;
      break;
    }
  }
  if (grade) understood.push(grade);
  else missing.push("年级");

  let textbook: Textbook;
  if (/统编|部编/.test(raw)) textbook = "统编版";
  else if (/北师大/.test(raw)) textbook = "北师大版";
  else if (/苏教/.test(raw)) textbook = "苏教版";
  else if (/教科版/.test(raw)) textbook = "教科版";
  else if (/人教版/.test(raw)) textbook = "人教版";
  else textbook = defaultTextbook(subject ?? "数学");
  if (/统编|部编|北师大|苏教|教科版|人教版/.test(raw)) understood.push(textbook);

  let lesson = "";
  for (const hint of LESSON_HINTS) {
    if (hint.test.test(raw)) {
      lesson = hint.lesson;
      break;
    }
  }
  if (!lesson) {
    const residual = raw
      .replace(/道德与法治|道法|品德|英语|english|科学|数学|语文|课文/gi, " ")
      .replace(/一年级|二年级|三年级|四年级|五年级|六年级|七年级|八年级|九年级|初一|初二|初三|[一二三四五六七八九1-9]年级/g, " ")
      .replace(/统编版|部编版|人教版|北师大版|苏教版|教科版|统编|部编/g, " ")
      .replace(/没有投影|没投影|无投影|没多媒体|无多媒体|没有多媒体|没有设备|没设备|无设备/g, " ")
      .replace(/只有电视|仅电视|电视|有白板|白板/g, " ")
      .replace(/没有教具|没教具|无教具|可自备|自带|自备|教具箱/g, " ")
      .replace(/复式班|复式|大班额|大班|小班/g, " ")
      .replace(/三十分钟|30分钟|四十分钟|40分钟/g, " ")
      .replace(/基础差|待补基础|待补|学有余力|尖子/g, " ")
      .replace(/[，。,.、；;：:\s]/g, "");
    lesson = residual.slice(0, 18);
  }
  if (!lesson) missing.push("课题");
  else understood.push(`课题《${lesson}》`);

  const conditions: RuralConditions = { ...defaults };
  if (/没有投影|没投影|无投影|没多媒体|无多媒体|没有多媒体|没有设备|没设备|无设备/.test(raw)) {
    conditions.media = "无设备";
    understood.push("无投影设备");
  } else if (/只有电视|仅电视|电视/.test(raw)) {
    conditions.media = "仅电视";
    understood.push("仅电视");
  } else if (/有白板|白板/.test(raw)) {
    conditions.media = "有白板";
    understood.push("有白板");
  }

  if (/没有教具|没教具|无教具/.test(raw)) {
    conditions.aids = "无";
    understood.push("无教具");
  } else if (/教具箱/.test(raw)) {
    conditions.aids = "有限教具箱";
    understood.push("有限教具箱");
  } else if (/可自备|自带|自备/.test(raw)) {
    conditions.aids = "可自备";
    understood.push("教具可自备");
  }

  if (/复式/.test(raw)) {
    conditions.classType = "复式班";
    understood.push("复式班");
  } else if (/大班额|大班/.test(raw)) {
    conditions.classType = "大班";
    understood.push("大班");
  } else if (/小班/.test(raw)) {
    conditions.classType = "小班";
    understood.push("小班");
  }

  if (/三十分钟|30分钟/.test(raw)) {
    conditions.minutes = 30;
    understood.push("30 分钟课时");
  } else if (/四十分钟|40分钟/.test(raw)) {
    conditions.minutes = 40;
    understood.push("40 分钟课时");
  }

  if (/基础差|待补基础|待补|底子薄/.test(raw)) {
    conditions.level = "待补基础";
    understood.push("学情待补基础");
  } else if (/学有余力|尖子/.test(raw)) {
    conditions.level = "学有余力";
    understood.push("学有余力");
  }

  return {
    meta: {
      subject: subject ?? "数学",
      grade: grade ?? "三年级",
      textbook,
      lesson: lesson || "新授课",
    },
    conditions,
    understood,
    missing,
  };
}