import { findCurated } from "./lessonContent";
import { generatePptDeck } from "./pptEngine";
import { generateQuiz } from "./quiz";
import type {
  LessonContent,
  LessonMeta,
  LessonStage,
  LessonType,
  RuralConditions,
  Teacher,
  GenerateInput,
  Plan,
} from "./types";

export function uid(prefix = "id"): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);
}

/** 将环节时长按目标课时等比缩放，保证总分钟数精确。 */
function scaleMinutes(stages: LessonStage[], target: number): LessonStage[] {
  const total = stages.reduce((sum, stage) => sum + stage.minutes, 0);
  if (total === target) return stages;
  const raw = stages.map((stage) => (stage.minutes / total) * target);
  const floors = raw.map((value) => Math.max(2, Math.floor(value)));
  let diff = target - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  let cursor = 0;
  while (diff !== 0 && order.length > 0) {
    const item = order[cursor % order.length];
    if (diff > 0) {
      floors[item.index] += 1;
      diff -= 1;
    } else if (floors[item.index] > 2) {
      floors[item.index] -= 1;
      diff += 1;
    }
    cursor += 1;
    if (cursor > 400) break;
  }
  return stages.map((stage, index) => ({ ...stage, minutes: floors[index] }));
}

function conditionSummary(conditions: RuralConditions): string {
  return `${conditions.media} · ${conditions.aids === "无" ? "无教具" : conditions.aids} · ${conditions.classType} · ${conditions.minutes} 分钟 · 学情${conditions.level}`;
}

/** 把乡村条件写入教案：显式适配，而不是让老师事后自己改。 */
export function adaptContent(
  base: LessonContent,
  meta: LessonMeta,
  conditions: RuralConditions,
): LessonContent {
  const content = clone(base);
  content.adaptations = [...(content.adaptations ?? [])];

  content.adaptations.unshift(
    `本教案按「${conditionSummary(conditions)}」生成，${meta.grade}${meta.subject}《${meta.lesson}》的全部环节均已按此条件调整。`,
  );

  if (conditions.classType === "复式班" && !content.process.some((stage) => stage.stage.includes("复式"))) {
    content.process.unshift({
      stage: "复式班任务布置",
      minutes: 4,
      teacher:
        "先给同教室的低年级布置独立任务单（复习旧知 + 基础练习），说明完成标准与互批方式；再转向本年级开始新授。",
      student: "低年级安静独立完成任务单；本年级准备好学具，进入学习状态。",
      fallback: "无多媒体：任务单抄在小黑板上，避免占用主板书。",
    });
  }

  if (conditions.media === "无设备") {
    content.adaptations.push(
      "无投影设计：所有视觉信息由板书、实物和学生作品承担，不依赖任何播放设备。",
    );
    const stage = content.process.find((item) => !item.fallback);
    if (stage) {
      stage.fallback = "无多媒体：把关键图例提前画在黑板上，用彩色粉笔分步呈现。";
    }
  } else if (conditions.media === "仅电视") {
    content.adaptations.push(
      "仅电视：关键画面只播放一次，播放后立即转为板书复述，避免学生依赖屏幕。",
    );
    content.process.forEach((stage) => {
      if (stage.fallback) {
        stage.fallback = stage.fallback
          .replace(/无投影[:：]/g, "电视不可用时：")
          .replace(/无多媒体[:：]/g, "设备不可用时：")
          .replace(/无音频设备[:：]/g, "无音响设备时：");
      }
    });
  } else {
    content.adaptations.push("有白板：白板用于呈现结构图，纸笔操作与板书仍作为主要学习活动。");
    content.process.forEach((stage) => {
      if (stage.fallback) {
        stage.fallback = stage.fallback
          .replace(/无投影[:：]/g, "白板故障时：")
          .replace(/无多媒体[:：]/g, "设备故障时：")
          .replace(/无音频设备[:：]/g, "无音响设备时：");
      }
    });
  }

  if (conditions.aids === "无") {
    content.adaptations.push(
      "无教具：所有需要教具的环节均给出生活化替代方案（纸张、瓶盖、玉米粒、枝条等）。",
    );
  } else if (conditions.aids === "可自备") {
    content.adaptations.push("可自备：材料清单提前一天告知学生，按小组自备低成本物品。");
    content.process.forEach((stage) => {
      if (stage.fallback) {
        stage.fallback = stage.fallback.replace(/^无[^：:]{0,12}教具[：:]/, "教具不足时：");
      }
    });
  } else {
    content.adaptations.push("有限教具箱：按小组轮换使用，课前清点数量并指定保管员。");
    content.process.forEach((stage) => {
      if (stage.fallback) {
        stage.fallback = stage.fallback.replace(/^无[^：:]{0,12}教具[：:]/, "教具不足时：");
      }
    });
  }

  if (conditions.classType === "复式班") {
    content.adaptations.push(
      "复式班：采用「先布置、后讲授、再回流」的动静交替结构，附分年级任务单与独立完成标准。",
    );
  } else if (conditions.classType === "小班") {
    content.adaptations.push("小班：增加人人上台展示与个别指导的机会，尽量让每个学生都被看见。");
  } else {
    content.adaptations.push("大班额：采用同桌互批 + 小老师制，减少个别辅导压力，明确小组分工。");
  }

  if (conditions.minutes === 30) {
    content.adaptations.push("30 分钟课时：压缩练习与小结，保留导入、核心探究和当堂反馈三个关键环节。");
  }

  if (conditions.level === "待补基础") {
    content.adaptations.push("学情待补基础：新课前增加 3 分钟旧知复习，作业以基础层为准，提升题选做。");
    if (!content.homework.basic.some((item) => item.includes("复习"))) {
      content.homework.basic.unshift("先复习上一课的核心内容，再做本课基础练习。");
    }
  } else if (conditions.level === "学有余力") {
    content.adaptations.push("学有余力：基础题快速过关，重点完成提升与拓展任务，鼓励学生讲给同伴听。");
    content.homework.extended.push("挑战：把本课学到的方法讲给一位同学听，并记录他提出的一个问题。");
  }

  content.process = scaleMinutes(content.process, conditions.minutes);

  if (conditions.aids === "无" && content.materialSubstitutes.length === 0) {
    content.materialSubstitutes.push("一切教具 → 纸张、粉笔、学生身边可收集的自然物");
  }

  return content;
}

function genericContent(meta: LessonMeta, conditions: RuralConditions): LessonContent {
  const { subject, lesson, grade } = meta;
  if (subject === "语文") {
    return {
      objectives: [
        `认识《${lesson}》中的生字新词，能正确、流利、有感情地朗读课文。`,
        "抓住关键词句梳理课文内容，初步体会作者的表达方法。",
        "联系乡村生活经验表达自己的感受，积累语言。",
      ],
      keyPoints: ["通过朗读和理解关键词句把握课文主要内容。", "积累并尝试运用文中的表达方式。"],
      difficulties: ["把课文语言转化为自己的表达。"],
      process: [
        {
          stage: "情境导入",
          minutes: 5,
          teacher: `出示课题《${lesson}》，从学生熟悉的生活场景切入，读题质疑：看到课题你想知道什么？`,
          student: "齐读课题，提出自己的问题，带着问题进入课文。",
          fallback: "无多媒体：不用图片视频，用教师口述生活场景 + 黑板简笔画导入。",
        },
        {
          stage: "初读识字",
          minutes: 10,
          teacher: "范读或领读课文，板书易错生字；巡视指导朗读，纠正字音。",
          student: "自由读课文，圈出生字词，标自然段；同桌互查读音。",
          fallback: "无生字卡片：难字直接写在黑板上，配拼音和简笔画。",
        },
        {
          stage: "精读品悟",
          minutes: 12,
          teacher: `围绕课后问题引导学生找出关键句：课文写了什么？哪些词句写得最打动你？组织品读交流。`,
          student: "默读批注，画出关键句，小组交流后全班汇报。",
          fallback: "无投影：关键句提前抄在黑板两侧，学生上台指读。",
        },
        {
          stage: "表达迁移",
          minutes: 8,
          teacher: "创设表达任务：联系本村本校的生活，仿照课文说一段话或写几句话。",
          student: "独立练写，同桌互读互评，推荐代表全班分享。",
        },
        {
          stage: "总结回顾",
          minutes: 3,
          teacher: "回顾本课学到的读书方法与语言积累，布置分层作业。",
          student: "复述学习方法，记录作业。",
        },
        {
          stage: "布置作业",
          minutes: 2,
          teacher: "说明基础、提升、拓展三层作业要求。",
          student: "记录作业，提出疑问。",
        },
      ],
      boardDesign: [
        `标题：${lesson}`,
        "内容梳理：起因 → 经过 → 结果（或：景 → 情）",
        "关键词句：学生找到的重点词写在对应位置",
        "表达支架：先……接着……最后……",
      ],
      questions: {
        basic: [`《${lesson}》主要写了什么？用两三句话概括。`, "画出文中你最喜欢的一句话，说说喜欢的理由。"],
        advanced: [`作者是怎样把内容写清楚的？找出一个例子说明。`, "联系你的生活，说说你对课文中哪一处最有共鸣。"],
      },
      homework: {
        basic: [
          "抄写本课生字词，每个生字组两个词。",
          "正确、流利地朗读课文，读给家人或同桌听。",
          "完成练习册本课基础题。",
        ],
        advanced: ["摘抄一处写得好的句子并作简单批注。", "仿照课文写一段话，写出你熟悉的一个生活场景。"],
        extended: [`搜集与《${lesson}》相关的资料或故事，准备三分钟课前分享。`, "把课文改编成一个小故事，讲给低年级同学听。"],
      },
      materialSubstitutes: [
        "课文插图 → 黑板简笔画 + 学生生活观察",
        "朗读音频 → 教师范读 + 分角色朗读",
        "生字卡片 → 硬纸板自制",
        "多媒体课件 → 板书提纲 + 关键词卡片",
      ],
      reflectionPrompts: [
        "学生读通课文了吗？字音错误集中在哪些字？",
        "精读环节有多少学生能说出自己的理解，而不是重复教参？",
        "表达迁移是否联系了学生的真实生活？",
      ],
      adaptations: [],
    };
  }

  if (subject === "数学") {
    return {
      objectives: [
        `理解《${lesson}》中的核心概念与方法，能正确进行相关计算或推理。`,
        "能运用所学知识解决简单的实际问题，说明自己的思考过程。",
        "在操作、观察与交流中积累数学活动经验，建立数感与符号意识。",
      ],
      keyPoints: [`理解《${lesson}》的基本算理或概念。`, "能正确、规范地完成相关练习。"],
      difficulties: ["从具体操作走向抽象表达，说清「为什么这样算」。"],
      process: [
        {
          stage: "复习导入",
          minutes: 5,
          teacher: "设计两道口算或旧知复习题，用小黑板出示；从旧知自然过渡到新问题。",
          student: "口算抢答，说出上一课学到的关键方法。",
          fallback: "无多媒体：口算题写在小黑板上，开火车报答案。",
        },
        {
          stage: "探究新知",
          minutes: 13,
          teacher: `创设本村生活情境（分粮食、量土地、赶集购物等），引导学生动手操作，板书《${lesson}》的核心算理，追问「为什么」。`,
          student: "动手摆一摆、画一画，尝试列式，同桌互说思考过程。",
          fallback: "无教具：用瓶盖、玉米粒、粉笔头或作业纸折痕替代学具。",
        },
        {
          stage: "分层练习",
          minutes: 12,
          teacher: "出示基础题、变式题、易错题各一组，巡视批改，重点辅导学困生。",
          student: "独立练习，同桌互批，把错题抄到错题本并说明原因。",
        },
        {
          stage: "交流质疑",
          minutes: 6,
          teacher: "请学生上台讲解一道题，组织质疑：还有不同的方法吗？哪里容易错？",
          student: "上台板演并讲解，其他同学提问、补充。",
        },
        {
          stage: "课堂小结",
          minutes: 4,
          teacher: "引导学生用一句话概括本课方法，形成板书结构。",
          student: "齐说方法，指名复述关键步骤。",
        },
      ],
      boardDesign: [
        `标题：${lesson}`,
        "核心方法：例 1 板书 → 算理说明",
        "易错点：用红粉笔标注",
        "练习：基础题 → 变式题 → 易错题",
        "小结：先……再……",
      ],
      questions: {
        basic: [`用一句话说出《${lesson}》的方法。`, "完成黑板上的基础题，并说出每一步的意思。"],
        advanced: ["为什么可以这样算？换一个数字还成立吗？", "生活中哪里能用到今天的方法？举一个例子。"],
      },
      homework: {
        basic: [
          "完成课本本课「做一做」和练习册基础题。",
          "把例题重新做一遍，边做边说出思考过程。",
          "用身边的物品摆一摆今天学到的数学现象。",
        ],
        advanced: ["完成练习册提升题，选择一道题写清解题思路。", "自编一道与本课有关的应用题，明天和同桌交换解答。"],
        extended: ["调查家里或村里与本课有关的数据，用今天的方法算一算。", "挑战：用两种不同的方法解决同一个问题，比较哪种更简便。"],
      },
      materialSubstitutes: [
        "学具盒 → 瓶盖、玉米粒、小棒、粉笔头",
        "情境挂图 → 本村真实场景（分粮食、赶集、量地）",
        "课件演示 → 黑板分步板演 + 学生操作",
        "练习纸 → 作业本或小黑板",
      ],
      reflectionPrompts: [
        "学生能否说清算理，而不只是会算？",
        "分层练习中，学困生卡在哪一步？当堂是否解决？",
        "情境是否真正贴近本村生活？",
      ],
      adaptations: [],
    };
  }

  if (subject === "科学") {
    return {
      objectives: [
        `围绕《${lesson}》提出可探究的问题，作出自己的猜想。`,
        "能设计简单的观察或对比实验，如实记录实验现象。",
        "用证据支持结论，体会科学探究需要重复与验证。",
      ],
      keyPoints: ["提出猜想并设计验证方案。", "如实观察和记录。"],
      difficulties: ["区分猜想与证据，理解控制变量的意义。"],
      process: [
        {
          stage: "提出问题",
          minutes: 5,
          teacher: `出示生活现象或实物，引出《${lesson}》的问题：你观察到了什么？想知道什么？`,
          student: "观察并描述现象，提出问题，作出猜想。",
          fallback: "无多媒体：教师现场演示现象，学生围圈观察。",
        },
        {
          stage: "设计探究",
          minutes: 12,
          teacher: "引导学生讨论：怎样验证猜想？需要哪些材料？哪些条件要保持相同？",
          student: "小组设计探究方案，用作业纸画出装置简图。",
          fallback: "无教具：用玻璃瓶、塑料盒、湿纸巾等生活材料替代。",
        },
        {
          stage: "动手实验",
          minutes: 12,
          teacher: "示范操作要点与安全事项，巡视指导，提醒如实记录。",
          student: "分组动手实验，记录现象和数量变化。",
        },
        {
          stage: "交流结论",
          minutes: 6,
          teacher: "组织各组汇报，追问：你的证据是什么？实验结果和猜想一样吗？",
          student: "汇报记录，倾听质疑，修正自己的解释。",
        },
        {
          stage: "小结延伸",
          minutes: 5,
          teacher: "小结探究方法与结论，布置课后观察任务。",
          student: "复述方法，记录观察任务。",
        },
      ],
      boardDesign: [
        `标题：${lesson}`,
        "问题：……",
        "猜想：……",
        "材料与步骤：1. 2. 3.",
        "记录表：时间 | 现象 | 我的发现",
        "结论：证据 → 解释",
      ],
      questions: {
        basic: [`《${lesson}》探究的问题是什么？我们的猜想是什么？`, "实验中要观察和记录哪些现象？"],
        advanced: ["你的结论有哪些证据支持？还有别的解释吗？", "如果再做一次实验，你会改变什么？为什么？"],
      },
      homework: {
        basic: ["完成本课实验记录表，如实写下观察到的现象。", "用两三句话写出本课的结论和证据。", "向家人介绍今天做的实验。"],
        advanced: ["设计一个新的相关问题，写出探究方案。", "查找一种与本课有关的自然现象，记录下来。"],
        extended: ["连续一周观察校园或家里的一种自然现象，完成观察日记。", "用身边的材料改进本课实验装置，画出改进图。"],
      },
      materialSubstitutes: [
        "实验器材 → 玻璃瓶、塑料盒、湿纸巾等生活材料",
        "放大镜不足 → 小组轮换使用",
        "实验记录单 → 作业本手绘表格",
        "课件视频 → 教师现场演示 + 学生动手",
      ],
      reflectionPrompts: [
        "学生能否区分猜想与证据？",
        "实验材料不足时，小组分工是否人人参与？",
        "安全提醒是否到位？",
      ],
      adaptations: [],
    };
  }

  if (subject === "道德与法治") {
    return {
      objectives: [
        `结合生活实例理解《${lesson}》中的核心观点，能作出正确的价值判断。`,
        "能在具体情境中分析问题，提出可行的行动方案。",
        "把课堂所学落实到校园与家庭生活中的具体行动。",
      ],
      keyPoints: ["联系真实生活理解课文观点。"],
      difficulties: ["把观点转化为可坚持的日常行动。"],
      process: [
        {
          stage: "情境导入",
          minutes: 5,
          teacher: `用本班本校的真实小故事引出《${lesson}》，提问：如果你遇到这种情况，会怎么做？`,
          student: "自由发言，说出自己的第一反应。",
          fallback: "无多媒体：不用视频，请学生现场演绎情境。",
        },
        {
          stage: "探究观点",
          minutes: 12,
          teacher: "引导学生阅读课文材料，提炼关键观点，结合班级实际举例说明。",
          student: "小组讨论、圈画关键词，把观点写在卡片上贴到黑板。",
          fallback: "材料不足：每组一张摘录卡，其余内容教师板书。",
        },
        {
          stage: "案例辨析",
          minutes: 10,
          teacher: "出示两难情境，组织正反方辨析，引导学生说出理由。",
          student: "小组辩论，倾听不同意见，尝试达成共识。",
        },
        {
          stage: "行动落实",
          minutes: 8,
          teacher: "引导学生制定一份可执行的班级行动清单，明确做到的标准。",
          student: "小组制定行动清单，全班表决通过。",
        },
        {
          stage: "总结提升",
          minutes: 3,
          teacher: "小结本课观点，鼓励学生从今天做起、从小事做起。",
          student: "齐读行动倡议，记录作业。",
        },
        {
          stage: "布置作业",
          minutes: 2,
          teacher: "布置观察、采访与实践类作业。",
          student: "记录作业。",
        },
      ],
      boardDesign: [
        `标题：${lesson}`,
        "核心观点：……",
        "情境一 → 怎么做 → 为什么",
        "情境二 → 怎么做 → 为什么",
        "我们的行动清单：1. 2. 3.",
      ],
      questions: {
        basic: [`《${lesson}》告诉我们应该怎么做？`, "说说你身边符合本课观点的一个小例子。"],
        advanced: ["如果两种做法都有道理，你会怎样选择？说说理由。", "怎样让全班同学都坚持做到？设计一个办法。"],
      },
      homework: {
        basic: ["完成练习册本课基础题。", "把本课观点说给家人听，并请家长举一个例子。", "记录自己今天做到的一件小事。"],
        advanced: ["观察校园里与本课有关的现象，写三条建议。", "采访一位长辈，记录他（她）对这件事的看法。"],
        extended: ["和同学合作开展一次班级微行动，一周后汇报效果。", "制作一张宣传小报，向低年级同学宣传本课观点。"],
      },
      materialSubstitutes: [
        "视频案例 → 学生现场演绎 + 教师口述",
        "课件图片 → 黑板情境简笔画",
        "读本不足 → 每组一张摘录卡",
        "小报纸张 → 作业纸背面制作",
      ],
      reflectionPrompts: [
        "学生说的是真心话，还是猜测的标准答案？",
        "行动清单是否具体到可以检查？",
        "课后有多少学生真正落实了行动？",
      ],
      adaptations: [],
    };
  }

  return {
    objectives: [
      `能听、说、读、写《${lesson}》中的核心单词与句型。`,
      "能在简单情境中运用所学句型进行交流。",
      "在说唱、游戏中建立英语学习兴趣，敢于开口。",
    ],
    keyPoints: ["核心单词的认读。", "目标句型的口头运用。"],
    difficulties: ["单词发音与完整句子的表达。"],
    process: [
      {
        stage: "Warm-up 热身",
        minutes: 5,
        teacher: "用问候语和动作歌谣带学生热身，复习上一课单词。",
        student: "起立回应，跟做动作，大声跟读。",
        fallback: "无音频：教师领读 + 拍手打节奏。",
      },
      {
        stage: "Presentation 呈现",
        minutes: 10,
        teacher: `用实物、动作和简笔画呈现《${lesson}》的核心单词，慢速领读，纠正发音。`,
        student: "观察、跟读，开火车读单词。",
        fallback: "无课件：黑板简笔画 + 硬纸板单词卡。",
      },
      {
        stage: "Practice 操练",
        minutes: 12,
        teacher: "示范目标句型，组织同桌问答和小组接力，巡视纠正。",
        student: "同桌用句型互相问答，小组接力说句子。",
      },
      {
        stage: "Production 运用",
        minutes: 8,
        teacher: "创设真实小情境（介绍学校、介绍家人等），请学生用所学句型表达。",
        student: "小组准备并展示，其他同学认真听并给星。",
      },
      {
        stage: "Summary 小结",
        minutes: 3,
        teacher: "小结单词与句型，评价课堂表现，布置口头作业。",
        student: "齐读单词，记录作业。",
      },
      {
        stage: "Homework 作业",
        minutes: 2,
        teacher: "说明跟读与运用任务。",
        student: "记录作业。",
      },
    ],
    boardDesign: [
      `标题：${lesson}`,
      "Words: 核心单词 + 简笔画",
      "Sentences: 目标句型",
      "Pair work: A: ...? B: ...",
    ],
    questions: {
      basic: ["看图说出本课单词。", "用目标句型说一句完整的话。"],
      advanced: ["用三句话介绍你熟悉的人或物。", "和同伴编一个两句话的小对话。"],
    },
    homework: {
      basic: ["跟读单词各五遍给家长听。", "抄写本课单词，每个两遍。", "用目标句型说两句话。"],
      advanced: ["画一幅图并用英语标注至少三个单词。", "和同学准备一个一分钟对话，下节课展示。"],
      extended: ["教家人说三个英语单词，并记录他们的反应。", "制作一张英语小卡片，送给你的朋友。"],
    },
    materialSubstitutes: [
      "单词卡 → 硬纸板自制",
      "课件图片 → 黑板简笔画 + 实物指认",
      "录音 → 教师领读 + 学生跟读",
      "多媒体游戏 → 拍手传词、开火车等无设备游戏",
    ],
    reflectionPrompts: [
      "学生的发音问题集中在哪些音？",
      "是否每个学生都有开口的机会？",
      "无设备条件下，操练的趣味性够不够？",
    ],
    adaptations: [],
  };
}

function buildReviewContent(
  meta: LessonMeta,
  conditions: RuralConditions,
  knowledgeRange: string,
): LessonContent {
  const range = knowledgeRange || `${meta.lesson}所在单元`;
  return {
    objectives: [
      `梳理「${range}」的核心知识，能用自己的话说清知识之间的联系。`,
      "针对本单元的易错点查漏补缺，正确完成基础题与变式题。",
      "在典型例题与综合应用中提升分析问题、表达思路的能力。",
    ],
    keyPoints: [
      `构建「${range}」的知识网络。`,
      "用典型例题串起概念、方法与易错点。",
    ],
    difficulties: ["把零散知识组织成结构。", "在新情境中迁移运用。"],
    process: [
      {
        stage: "复习导入",
        minutes: 5,
        teacher:
          "出示一道本单元的典型错题（或口述一个生活情境），请学生独立判断，并说一说错在哪里、为什么。",
        student: "独立判断，举手说出自己的理由；同伴补充不同意见。",
        fallback: "无多媒体：把错题抄在小黑板上，学生用作业本作答后集体订正。",
      },
      {
        stage: "知识梳理",
        minutes: 10,
        teacher: `围绕「${range}」带领学生回顾概念、方法与易错点，边问边板书知识网络；追问知识之间的前后联系。`,
        student: "补全知识表或知识树，同桌互查；用一句话说出一个知识点的作用。",
        fallback: "无投影：知识网络用彩色粉笔分步板演，学生照画在作业纸上。",
      },
      {
        stage: "典型例题",
        minutes: 10,
        teacher:
          "选择 2 道覆盖核心方法与易错点的典型题，带领学生读题、画图、列式、检验，讲清每一步的依据。",
        student: "跟着教师口述解题步骤，自己在作业本上完成，标出容易出错的地方。",
        fallback: "无教具：例题提前抄在黑板两侧，学生用纸笔操作替代学具。",
      },
      {
        stage: "分层练习",
        minutes: 8,
        teacher:
          "出示基础题、变式题各一组；基础题要求人人过关，变式题鼓励选做，巡视收集典型错例。",
        student: "先完成基础题并自查，再挑战变式题；把错题抄到错题本上。",
        fallback: "无多媒体：练习题抄在小黑板上，小组轮换批改。",
      },
      {
        stage: "错题讲评",
        minutes: 4,
        teacher:
          "请学生展示典型错例，组织同伴纠错；归纳本单元最常见的两三个错误及改正方法。",
        student: "上台说明自己的错误思路，倾听同伴建议，当场订正。",
      },
      {
        stage: "小结与检测",
        minutes: 3,
        teacher:
          "回看知识网络，小结复习方法与易错点；布置当堂检测或配套试题中的基础题。",
        student: "复述一个最重要的知识联系，记录作业与检测要求。",
      },
    ],
    boardDesign: [
      `标题：${meta.lesson} · 复习课`,
      `知识区间：${range}`,
      "知识网络：概念 → 方法 → 应用（用箭头连接）",
      "典型题步骤：读题 → 画图 → 列式 → 检验",
      "易错点清单：用红粉笔逐条列出并标注改正方法",
    ],
    questions: {
      basic: [
        `用一句话说出「${range}」中最重要的一个知识点。`,
        "本节课的典型例题先做了什么、再做了什么？",
      ],
      advanced: [
        "这个知识点和前面学过的哪部分内容有联系？举例说明。",
        "如果题目换一个条件，解题方法会怎样变化？",
      ],
    },
    homework: {
      basic: [
        "整理本单元的 3 道错题，写出错误原因和正确解法。",
        "完成配套练习中的基础题，边做边说出每一步的依据。",
        "把知识网络补完整，明天带来和同桌互查。",
      ],
      advanced: [
        "选择一道变式题，用两种方法解决并比较哪种更简便。",
        "自编一道本单元的易错题，写出答案和易错点。",
      ],
      extended: [
        `围绕「${range}」制作一张复习小报，包含知识网络、典型题和易错点。`,
        "把本单元的复习方法讲给低年级同学听，记录他们的问题。",
      ],
    },
    materialSubstitutes: [
      "知识网络图 → 黑板分步板书或作业纸手绘",
      "课件例题 → 小黑板抄题 + 学生纸笔操作",
      "练习单 → 作业本或黑板分区练习",
      "学具 → 纸条、瓶盖、玉米粒等生活材料",
    ],
    reflectionPrompts: [
      "学生能否说出知识之间的联系，而不是只报答案？",
      "典型错例是否来自本班学生，讲评是否有针对性？",
      "分层练习中，基础薄弱的学生是否完成了基础题？",
      "配套试题的难度与知识区间是否匹配？",
    ],
    adaptations: [
      "复习课：以知识网络、典型例题和错题讲评为主线，先梳理后练习，避免简单重复新授课。",
      `知识区间：${range}；练习与试题围绕该区间选取。`,
    ],
  };
}

export function generateContent(
  meta: LessonMeta,
  conditions: RuralConditions,
  options?: { lessonType?: LessonType; knowledgeRange?: string },
): LessonContent {
  let base: LessonContent;
  if (options?.lessonType === "review") {
    base = buildReviewContent(meta, conditions, options.knowledgeRange ?? "");
  } else {
    const curated = findCurated(meta.lesson);
    base = curated ? clone(curated) : genericContent(meta, conditions);
  }
  return adaptContent(base, meta, conditions);
}

export function createPlan(
  input: GenerateInput,
  teacher: Teacher,
  school: { id: string; name: string; province: string; county: string },
  status: Plan["status"] = "private",
): Plan {
  const now = new Date().toISOString();
  const lessonType = input.lessonType ?? "new";
  const knowledgeRange =
    input.knowledgeRange?.trim() ||
    (lessonType === "review" ? `${input.meta.lesson}所在单元` : undefined);
  const quiz = input.quizSettings?.enabled
    ? generateQuiz(
        input.meta,
        knowledgeRange ?? `${input.meta.grade}${input.meta.subject} · ${input.meta.lesson}`,
        input.quizSettings,
      )
    : undefined;
  const content = generateContent(input.meta, input.conditions, {
    lessonType,
    knowledgeRange,
  });
  const ppt = input.pptEnabled
    ? generatePptDeck({
        meta: input.meta,
        author: teacher.name,
        school: school.name,
        lessonType,
        knowledgeRange,
        pageCount: input.pptPageCount,
        quiz,
      })
    : undefined;
  return {
    id: uid("plan"),
    meta: input.meta,
    conditions: input.conditions,
    content,
    lessonType,
    knowledgeRange,
    quiz,
    ppt,
    authorId: teacher.id,
    authorName: teacher.name,
    schoolId: school.id,
    school: school.name,
    province: school.province,
    county: school.county,
    status,
    sourcePlanId: input.sourcePlanId,
    forkNote: input.forkNote,
    reuseCount: 0,
    ratingSum: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function planTitle(plan: Pick<Plan, "meta">): string {
  return `${plan.meta.grade}${plan.meta.subject}《${plan.meta.lesson}》`;
}

export function planSubtitle(plan: Pick<Plan, "meta">): string {
  return `${plan.meta.textbook} · ${plan.meta.lesson}`;
}