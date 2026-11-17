import type {
  LessonMeta,
  Quiz,
  QuizDifficulty,
  QuizQuestion,
  QuizSettings,
  QuizType,
  Subject,
} from "./types";
import { QUIZ_TYPES } from "./types";

const LETTERS = ["A", "B", "C", "D"];

function pick<T>(items: readonly T[], index: number): T {
  return items[((index % items.length) + items.length) % items.length];
}

function fractionText(numerator: number, denominator: number): string {
  if (numerator === 0) return "0";
  if (numerator === denominator) return "1";
  return `${numerator}/${denominator}`;
}

function makeChoice(args: {
  stem: string;
  correct: string;
  distractors: string[];
  explanation: string;
  knowledge: string;
  difficulty: QuizDifficulty;
  index: number;
}): QuizQuestion {
  const unique = Array.from(new Set([args.correct, ...args.distractors]));
  const fillers = ["以上都不对", "无法确定", "都不符合", "没有正确答案"];
  let cursor = 0;
  while (unique.length < 4) {
    const filler = fillers[cursor % fillers.length];
    if (!unique.includes(filler)) unique.push(filler);
    cursor += 1;
  }
  const start = (args.index + Math.floor(args.index / 4)) % unique.length;
  const options = [...unique.slice(start), ...unique.slice(0, start)];
  const correctIndex = Math.max(0, options.indexOf(args.correct));
  return {
    no: 0,
    type: "选择",
    difficulty: args.difficulty,
    knowledge: args.knowledge,
    stem: args.stem,
    options: options.map((text, index) => `${LETTERS[index]}. ${text}`),
    answer: `${LETTERS[correctIndex]}. ${args.correct}`,
    explanation: args.explanation,
  };
}

function fractionQuestion(
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  const n = pick([4, 5, 6, 8, 10, 7, 9, 12, 3], index * 2 + 1);
  const m = 1 + ((index * 3) % Math.max(1, n - 1));
  const second = m === n - 1 ? Math.max(1, m - 1) : m + 1;

  if (type === "选择") {
    if (difficulty === "基础") {
      return makeChoice({
        stem: `把一张纸平均分成 ${n} 份，每份是这张纸的（　）。`,
        correct: `1/${n}`,
        distractors: [`1/${n + 1}`, `${n}`, "1/2"],
        explanation: `平均分成 ${n} 份，每份就是 1/${n}；注意「平均分」是分数的前提。`,
        knowledge,
        difficulty,
        index,
      });
    }
    if (difficulty === "适中") {
      const relation = m < second ? "<" : ">";
      const reversed = m < second ? ">" : "<";
      return makeChoice({
        stem: `比较大小：${m}/${n} ○ ${second}/${n}，正确的是（　）。`,
        correct: `${m}/${n} ${relation} ${second}/${n}`,
        distractors: [
          `${m}/${n} ${reversed} ${second}/${n}`,
          `${m}/${n} = ${second}/${n}`,
          "无法比较",
        ],
        explanation: `同分母分数比较，分子大的分数大。${Math.max(m, second)} 个 1/${n} 比 ${Math.min(m, second)} 个 1/${n} 多。`,
        knowledge,
        difficulty,
        index,
      });
    }
    return makeChoice({
      stem: `同样大的两块饼，一块平均分成 ${n} 份，另一块平均分成 ${n + 2} 份。两块饼中的 1 份相比（　）。`,
      correct: `分成 ${n} 份的那块更大`,
      distractors: [
        `分成 ${n + 2} 份的那块更大`,
        "两块一样大",
        "无法判断",
      ],
      explanation: "同样大的整体，平均分的份数越少，每份越大；份数越多，每份越小。",
      knowledge,
      difficulty,
      index,
    });
  }

  if (type === "填空") {
    if (difficulty === "基础") {
      return {
        no: 0,
        type,
        difficulty,
        knowledge,
        stem: `分数 ${m}/${n} 的分子是（　），分母是（　）。`,
        answer: `${m}；${n}`,
        explanation: "分数线下边是分母，表示平均分成的份数；上边是分子，表示取的份数。",
      };
    }
    if (difficulty === "适中") {
      return {
        no: 0,
        type,
        difficulty,
        knowledge,
        stem: `1 - ${m}/${n} =（　）。`,
        answer: fractionText(n - m, n),
        explanation: `把 1 看作 ${n}/${n}，${n}/${n} - ${m}/${n} = ${fractionText(n - m, n)}。`,
      };
    }
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: `一根绳子平均分成 ${n} 段，用去 ${m} 段，还剩全长的（　）；如果再用去 1 段，还剩（　）。`,
      answer: `${fractionText(n - m, n)}；${fractionText(n - m - 1, n)}`,
      explanation: `总份数不变，用去的份数增加，剩下的份数减少：${n} - ${m} = ${n - m}，再减 1 得 ${n - m - 1}。`,
    };
  }

  if (type === "判断") {
    if (difficulty === "基础") {
      return {
        no: 0,
        type,
        difficulty,
        knowledge,
        stem: `把一根绳子分成 ${n} 份，每份是它的 1/${n}。（　）`,
        answer: "错",
        explanation: "必须先「平均分」，任意分成若干份不能用分数表示每份的大小。",
      };
    }
    if (difficulty === "适中") {
      return {
        no: 0,
        type,
        difficulty,
        knowledge,
        stem: `分数 ${m}/${n} 的分子是 ${n}，分母是 ${m}。（　）`,
        answer: "错",
        explanation: `分子是 ${m}，分母是 ${n}；读作「${n} 分之 ${m}」，先读分母再读分子。`,
      };
    }
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "分子和分母相同的分数都等于 1。（　）",
      answer: "对",
      explanation: "把一个整体平均分成若干份，取走全部份数，就是整个整体，也就是 1。",
    };
  }

  if (difficulty === "基础") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: `妈妈把一个西瓜平均分成 ${n} 份，小明吃了 ${m} 份。小明吃了这个西瓜的几分之几？`,
      answer: `${m}/${n}`,
      explanation: `平均分成 ${n} 份，取其中 ${m} 份，就是 ${m}/${n}。`,
    };
  }
  if (difficulty === "适中") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: `一杯水喝了 ${m}/${n}，还剩几分之几？`,
      answer: fractionText(n - m, n),
      explanation: `把一整杯水看作 ${n}/${n}，${n}/${n} - ${m}/${n} = ${fractionText(n - m, n)}。`,
    };
  }
  const cn = pick([8, 9, 10, 12], index);
  const cm = 1 + (index % Math.max(1, cn - 3));
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `一块巧克力平均分成 ${cn} 小块，先吃掉 ${cm} 块，又吃掉 2 块。一共吃掉这块巧克力的几分之几？还剩几分之几？`,
    answer: `吃掉 ${fractionText(cm + 2, cn)}，还剩 ${fractionText(cn - cm - 2, cn)}`,
    explanation: `一共吃掉 ${cm} + 2 = ${cm + 2} 块，占 ${fractionText(cm + 2, cn)}；剩下 ${cn} - ${cm + 2} = ${cn - cm - 2} 块。`,
  };
}

function mathQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  const a = 12 + ((index * 7) % 80);
  const b = 3 + ((index * 5) % 9);

  if (type === "选择") {
    const sum = a + b;
    return makeChoice({
      stem: `计算：${a} + ${b} =（　）。`,
      correct: `${sum}`,
      distractors: [`${sum + 10}`, `${sum - 10}`, `${sum + 1}`],
      explanation: `按整数加法计算：${a} + ${b} = ${sum}。计算后可以用估算检查结果是否合理。`,
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: `计算：${a} × ${b} =（　）。`,
      answer: `${a * b}`,
      explanation: `用笔算乘法计算：${a} × ${b} = ${a * b}。可以用除法验算。`,
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "0 乘任何数都得 0。（　）",
      answer: "对",
      explanation: "0 表示没有，任何数与 0 相乘，结果都是 0。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `每盒有 ${b} 支笔，${a} 盒一共有多少支笔？`,
    answer: `${a * b} 支`,
    explanation: `求 ${a} 个 ${b} 是多少，用乘法：${b} × ${a} = ${a * b}（支）。`,
  };
}

function chineseQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (type === "选择") {
    if (difficulty === "挑战") {
      return makeChoice({
        stem: `要把《${meta.lesson}》的复习成果迁移到写作中，最合适的做法是（　）。`,
        correct: "联系自己的生活仿写片段，用上本课的一种表达方法",
        distractors: ["只抄写课文原句", "只记住段落序号", "跳过朗读和批注"],
        explanation: "复习的最终目标是迁移运用，联系生活仿写能把阅读经验转化为表达能力。",
        knowledge,
        difficulty,
        index,
      });
    }
    return makeChoice({
      stem: `复习《${meta.lesson}》时，下列做法最合适的是（　）。`,
      correct: "先读通课文，再梳理主要内容与关键语句",
      distractors: ["只看课后答案", "跳过生字直接做题", "只背段落大意"],
      explanation: "读通、梳理、品味是由整体到局部的复习顺序，能帮助形成完整的理解。",
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: `《${meta.lesson}》复习可以按「梳理内容—品味语言—（　）」的顺序进行。`,
      answer: "迁移表达",
      explanation: "复习不仅要理解内容，还要积累语言并尝试运用。",
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "复习课文时，只要背会生字词就够了。（　）",
      answer: "错",
      explanation: "生字词只是基础，还需要理解内容、体会表达方法并积累语言。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `联系生活，仿照《${meta.lesson}》写两句话，注意用上本单元的一种表达方法。`,
    answer: "参考：抓住一个具体的生活场景，用上比喻、拟人或总分结构等写法；言之有理即可。",
    explanation: "评分关注是否联系生活、是否用上本课表达方法、语句是否通顺。",
  };
}

function scienceQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (type === "选择") {
    return makeChoice({
      stem: "设计对比实验时，每次应该改变（　）个条件。",
      correct: "1",
      distractors: ["2", "3", "越多越好"],
      explanation: "对比实验要控制变量，只改变要研究的那个条件，其余条件保持相同。",
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "观察记录要写清日期、（　）和观察到的现象。",
      answer: "条件",
      explanation: "记录实验条件，才能判断现象变化与哪个条件有关。",
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "实验现象与猜想不一致时，应修改记录去迎合猜想。（　）",
      answer: "错",
      explanation: "科学记录必须如实，结论要服从证据，而不是让证据迁就猜想。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `围绕《${meta.lesson}》提出一个可以探究的问题，并写出你的猜想和验证方法。`,
    answer: "参考：提出问题—作出猜想—设计只改变一个条件的对比实验—连续观察记录—用证据得出结论。",
    explanation: "评分关注问题是否可探究、是否控制变量、是否有可观察的记录方案。",
  };
}

function englishQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (type === "选择") {
    return makeChoice({
      stem: "选择正确的句子：This ___ my school.",
      correct: "is",
      distractors: ["are", "am", "be"],
      explanation: "This 是单数，be 动词用 is：This is my school.",
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "用英语写出两个学校场所：________、________。",
      answer: "classroom, library（答案不唯一，如 playground, teachers' office）",
      explanation: "注意单词拼写和单复数形式。",
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "英语句子开头的首字母通常要大写。（　）",
      answer: "对",
      explanation: "句首字母大写是英语书写的基本规则。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `围绕《${meta.lesson}》用三句英语介绍你的学校。`,
    answer: "参考：This is my school. This is the library. I like my school.",
    explanation: "评分关注句型完整、场所单词准确、表达连贯。",
  };
}

function moralQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (type === "选择") {
    return makeChoice({
      stem: "行使权利时，下列做法正确的是（　）。",
      correct: "在行使自己权利时不损害他人和社会的利益",
      distractors: ["想做什么就做什么", "为了自己方便侵犯他人隐私", "只享受权利不履行义务"],
      explanation: "权利和义务是统一的，行使权利不能越过法律和他人的边界。",
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "公民的（　）受法律保护，同时也要履行相应的（　）。",
      answer: "权利；义务",
      explanation: "权利与义务相统一，是公民生活的基本准则。",
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "权利和义务是统一的。（　）",
      answer: "对",
      explanation: "享受权利的同时必须履行义务，二者不可分割。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `结合《${meta.lesson}》，说说遇到同学私拆你的信件时，你会怎样依法维护自己的权利。`,
    answer: "参考：先制止并说明这是侵犯通信秘密和隐私的行为，再告诉老师或家长，必要时通过法律途径维权。",
    explanation: "评分关注是否指出侵权类型、是否选择合理合法的维权途径。",
  };
}

function fallbackQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (type === "选择") {
    return makeChoice({
      stem: `复习《${meta.lesson}》时，最重要的第一步是（　）。`,
      correct: "梳理知识结构，找出自己的薄弱点",
      distractors: ["直接做难题", "只看答案", "跳过基础知识"],
      explanation: "复习应先整体梳理，再根据薄弱点有针对性地练习。",
      knowledge,
      difficulty,
      index,
    });
  }
  if (type === "填空") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "复习时可以按「回顾知识—（　）—查漏补缺」的顺序进行。",
      answer: "典型练习",
      explanation: "通过典型练习检验掌握情况，再针对错题补缺。",
    };
  }
  if (type === "判断") {
    return {
      no: 0,
      type,
      difficulty,
      knowledge,
      stem: "复习时只要多做题，不需要整理错题。（　）",
      answer: "错",
      explanation: "整理错题能发现知识漏洞，是复习的重要环节。",
    };
  }
  return {
    no: 0,
    type,
    difficulty,
    knowledge,
    stem: `围绕《${meta.lesson}》的知识区间，设计一份自己的复习清单，写出三个复习要点。`,
    answer: "参考：按知识结构列出要点，标出自己的易错点，并为每个要点配一道练习题。",
    explanation: "评分关注要点是否覆盖知识区间、是否针对自己的薄弱环节。",
  };
}

function subjectQuestion(
  meta: LessonMeta,
  type: QuizType,
  difficulty: QuizDifficulty,
  index: number,
  knowledge: string,
): QuizQuestion {
  if (/分数/.test(meta.lesson)) {
    return fractionQuestion(type, difficulty, index, knowledge);
  }
  const subject: Subject = meta.subject;
  if (subject === "数学") return mathQuestion(meta, type, difficulty, index, knowledge);
  if (subject === "语文") return chineseQuestion(meta, type, difficulty, index, knowledge);
  if (subject === "科学") return scienceQuestion(meta, type, difficulty, index, knowledge);
  if (subject === "英语") return englishQuestion(meta, type, difficulty, index, knowledge);
  if (subject === "道德与法治") return moralQuestion(meta, type, difficulty, index, knowledge);
  return fallbackQuestion(meta, type, difficulty, index, knowledge);
}

function knowledgePoints(meta: LessonMeta, knowledgeRange: string): string[] {
  if (/分数/.test(meta.lesson) || /分数/.test(knowledgeRange)) {
    return [
      "平均分与几分之一",
      "分数的读写",
      "同分母分数比较",
      "同分母分数加减",
      "分数与生活应用",
    ];
  }
  const parts = knowledgeRange
    .split(/[、，,；;/→]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [meta.lesson];
}

export function generateQuiz(
  meta: LessonMeta,
  knowledgeRange: string,
  settings: QuizSettings,
): Quiz {
  const types = settings.types.length > 0 ? settings.types : [...QUIZ_TYPES];
  const count = Math.min(30, Math.max(1, settings.count));
  const points = knowledgePoints(meta, knowledgeRange);
  const questions: QuizQuestion[] = [];
  for (let index = 0; index < count; index += 1) {
    const type = types[index % types.length];
    const knowledge = pick(points, index);
    const question = subjectQuestion(meta, type, settings.difficulty, index, knowledge);
    questions.push({ ...question, no: index + 1 });
  }
  return {
    title: `${meta.grade}${meta.subject} · ${meta.lesson} 配套试题`,
    knowledgeRange,
    difficulty: settings.difficulty,
    count: questions.length,
    types,
    questions,
  };
}