import type { LessonMeta, LessonType, Subject } from "./types";

export interface TopicSections {
  objectives: string[];
  intro: { title: string; bullets: string[] };
  concepts: { title: string; bullets: string[] }[];
  example: { title: string; bullets: string[] };
  practice: { title: string; bullets: string[] };
  summary: string[];
  homework: string[];
}

const FRACTIONS: TopicSections = {
  objectives: [
    "理解平均分和几分之一的含义。",
    "会读、写简单分数，认识分子、分母和分数线。",
    "能比较同分母分数的大小，用分数描述生活现象。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["一张纸对折两次，每份是它的几分之几？", "生活中，你见过 1/2、1/4 这样的数吗？"],
  },
  concepts: [
    {
      title: "平均分是前提",
      bullets: ["每份大小必须相同。", "分成几份，分母就是几。", "取其中几份，分子就是几。"],
    },
    {
      title: "认识分数",
      bullets: ["1/2 读作「二分之一」。", "分数线、分母、分子各有名称。", "先写分数线，再写分母，最后写分子。"],
    },
    {
      title: "比较同分母分数",
      bullets: ["分母相同，分子大的分数大。", "同一张纸，分的份数越多，每份越小。", "3/5 > 2/5：3 个 1/5 比 2 个多。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: [
      "把一个西瓜平均分成 8 份，每份是 1/8，3 份是 3/8。",
      "同样大的纸：1/2 > 1/4。",
      "3/5 和 2/5 比大小：3/5 > 2/5。",
    ],
  },
  practice: {
    title: "课堂练习",
    bullets: [
      "折一折：用作业纸折出 1/4 并涂色。",
      "说一说：5/7 的分子、分母各是几？怎么读？",
      "比一比：3/8 ○ 5/8，并说明理由。",
    ],
  },
  summary: ["平均分是分数的前提。", "先分后取：分母是分的份数，分子是取的份数。", "同分母分数比较：分子大的分数大。"],
  homework: [
    "用一张纸折出 1/2、1/4、1/8，按大小排一排。",
    "和家长分一个水果，说说每份是几分之几。",
    "找一找生活中的分数，记录两个例子。",
  ],
};

const FRACTIONS_REVIEW: TopicSections = {
  objectives: [
    "梳理分数单元的知识网络。",
    "辨析同分母加减、比较大小和概念理解中的易错点。",
    "在综合情境中灵活运用分数知识。",
  ],
  intro: {
    title: "单元回顾",
    bullets: ["本单元我们学习了哪些分数知识？", "先看一道典型错题，你能发现错在哪里吗？"],
  },
  concepts: [
    {
      title: "知识网络",
      bullets: [
        "平均分 → 几分之一 → 几分之几。",
        "同分母比较、同分母加减。",
        "分数与生活中的分物、测量。",
      ],
    },
    {
      title: "易错点清单",
      bullets: ["同分母加减：分母不变，只算分子。", "不能把「任意分」当成「平均分」。", "分数不一定都小于 1。"],
    },
    {
      title: "解题策略",
      bullets: ["先画图或折纸，再列式。", "同分母比分子，分母大的反而小。", "算完用纸条或图形验证。"],
    },
  ],
  example: {
    title: "典型例题",
    bullets: [
      "3/4 + 1/4 = 1：分母不变，3+1=4，4/4=1。",
      "3/5 < 2/5 错：同分母比分子，3/5 > 2/5。",
      "一杯水喝了 2/6，还剩 4/6。",
    ],
  },
  practice: {
    title: "分层练习",
    bullets: [
      "计算：2/9 + 5/9、7/8 - 3/8。",
      "判断：所有分数都小于 1，并说明理由。",
      "一根绳子平均分成 10 段，用去 3 段，用去几分之几？",
    ],
  },
  summary: ["同分母加减：分母不变，分子相加减。", "同分母比较：分子大的分数大。", "错题不可怕：画图验证，回到「平均分」。"],
  homework: ["整理本单元 3 道错题，写出错因。", "完成配套试题中的基础题。", "用分数记录今天的一件小事。"],
};

const AUTUMN: TopicSections = {
  objectives: [
    "认识本课生字词，正确、流利、有感情地朗读课文。",
    "抓住颜色、气味、声音，体会秋雨带来的美。",
    "学习总分结构和比喻、拟人，尝试仿写句子。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["秋雨落下来，你看到了什么？闻到了什么？", "课题《秋天的雨》给你什么感觉？"],
  },
  concepts: [
    {
      title: "课文脉络",
      bullets: ["秋雨像一把钥匙，打开秋天的大门。", "颜色 → 气味 → 声音。", "最后汇成丰收、欢乐的歌。"],
    },
    {
      title: "词语品读",
      bullets: ["五彩缤纷、你挤我碰、频频点头。", "黄黄的叶子像一把把小扇子。", "联系上下文和生活理解词语。"],
    },
    {
      title: "写法发现",
      bullets: ["第二自然段是总分结构。", "比喻、拟人让景物更生动。", "开头和结尾互相呼应。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: [
      "读第二自然段，圈出表示颜色的词。",
      "用「秋天的雨，把___给了___」说句子。",
      "读好「黄黄的叶子像一把把小扇子」，读出画面。",
    ],
  },
  practice: {
    title: "课堂练习",
    bullets: ["给生字注音、组词。", "仿写一句：秋天的雨，把______给了______。", "有感情地朗读第二自然段。"],
  },
  summary: ["抓颜色、气味、声音读课文。", "边读边想象画面。", "仿写要联系自己的生活观察。"],
  homework: ["有感情地朗读课文给家人听。", "抄写本课生字词。", "观察上学路上的秋天，写两句话。"],
};

const DECIMALS: TopicSections = {
  objectives: [
    "理解十分之几可以用一位小数表示。",
    "会读、写小数，知道小数点、整数部分和小数部分。",
    "能用米尺、人民币解释小数，建立数感。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["门宽 8 分米，用「米」作单位怎么写？", "1 角是多少元？"],
  },
  concepts: [
    {
      title: "1 米 = 10 分米",
      bullets: ["1 分米 = 1/10 米 = 0.1 米。", "3 分米 = 3/10 米 = 0.3 米。", "平均分成 10 份，取几份就是几个 0.1。"],
    },
    {
      title: "认识小数",
      bullets: ["小数由整数部分、小数点、小数部分组成。", "0.3 读作「零点三」。", "小数点要写在整数部分的右下角。"],
    },
    {
      title: "人民币中的小数",
      bullets: ["1 元 = 10 角。", "1 角 = 1/10 元 = 0.1 元。", "7 角 = 0.7 元。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["8 分米 = 8/10 米 = 0.8 米。", "7 角 = 7/10 元 = 0.7 元。", "0.5 = 5/10，表示十分之五。"],
  },
  practice: {
    title: "课堂练习",
    bullets: ["填一填：7/10 =（　）；0.6 =（　）/10。", "在米尺上找出 0.4 米的位置。", "用小数说出三件物品的价格。"],
  },
  summary: ["十分之几写成零点几。", "小数点左边是整数部分，右边是小数部分。", "小数和分数可以互相表示。"],
  homework: ["记录家里三件物品的价格，用小数表示。", "用小数表示几角，并读给家长听。", "画一条 10 格小条，涂出 0.6。"],
};

const SEEDS: TopicSections = {
  objectives: [
    "能提出种子发芽需要什么条件的问题和猜想。",
    "会设计只改变一个条件的对比实验。",
    "坚持连续观察，用记录支持结论。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["一把绿豆种下去就会发芽吗？", "种子发芽可能需要哪些条件？"],
  },
  concepts: [
    {
      title: "猜想条件",
      bullets: ["水、空气、温度、阳光。", "把猜想分类，选一个最想研究的。", "猜想需要用实验检验。"],
    },
    {
      title: "对比实验",
      bullets: ["只改变一个条件，其余条件相同。", "两瓶种子，一瓶有水一瓶无水。", "两瓶都放在同一窗台，光照和温度相同。"],
    },
    {
      title: "记录证据",
      bullets: ["记录日期、条件、变化。", "连续观察 7 天。", "结论要用记录说话。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["研究「水」：一瓶湿纸巾，一瓶干纸巾。", "相同条件：同一地点、同一种子、同样数量。", "不同条件：一瓶有水，一瓶无水。"],
  },
  practice: {
    title: "课堂练习",
    bullets: ["设计「种子发芽需要空气吗」的对比实验。", "画一张 7 天观察记录表。", "说出实验中的相同条件和不同条件。"],
  },
  summary: ["提出问题—作出猜想—设计实验—记录证据—得出结论。", "对比实验只改变一个条件。", "实验结论要靠证据说话。"],
  homework: ["每天观察记录本组种子。", "向家长介绍实验方案。", "预测 7 天后的结果并说明理由。"],
};

const RIGHTS: TopicSections = {
  objectives: [
    "知道宪法规定了公民的基本权利。",
    "能举例说明受教育权、人身自由等权利。",
    "初步形成权利与义务相统一的意识。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["学校图书角被个别同学长期占用，其他同学无法借阅。", "这侵犯了同学们的什么？"],
  },
  concepts: [
    {
      title: "宪法保障权利",
      bullets: ["受教育权、人身自由。", "通信秘密、隐私权。", "宪法是公民权利的保障书。"],
    },
    {
      title: "权利有边界",
      bullets: ["行使权利不能损害他人和社会。", "权利和义务相统一。", "享受权利也要履行义务。"],
    },
    {
      title: "依法维权",
      bullets: ["先制止侵权，说明理由。", "告诉老师或家长。", "必要时通过法律途径维权。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["私拆信件：侵犯通信秘密和隐私。", "辍学打工：侵犯受教育权。", "限制人身自由：侵犯人身自由权。"],
  },
  practice: {
    title: "课堂练习",
    bullets: ["判断三个情境是否侵权，并说明理由。", "说出至少两条维权途径。", "制作一张「权利—义务」对照表。"],
  },
  summary: ["宪法是公民权利的保障书。", "权利和义务相统一。", "遇到侵权要依法维权。"],
  homework: ["采访家长：他（她）最看重哪项权利？", "制作权利小贴士。", "小组合作起草班级权利公约。"],
};

const MULTIPLICATION: TopicSections = {
  objectives: [
    "理解乘法的意义：求几个相同加数的和。",
    "认识乘号，会读写乘法算式。",
    "能把相同加数的连加算式改写成乘法。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["每筐有 3 个玉米，4 筐一共多少个？", "3+3+3+3 有没有更简便的写法？"],
  },
  concepts: [
    {
      title: "相同加数",
      bullets: ["3+3+3+3 表示 4 个 3。", "加数相同才能直接写乘法。", "数一数有几个几。"],
    },
    {
      title: "乘法算式",
      bullets: ["3×4=12，读作 3 乘 4 等于 12。", "认识乘号「×」。", "乘法是加法的简便运算。"],
    },
    {
      title: "几个几",
      bullets: ["5 个 2 可以写 2×5 或 5×2。", "两个因数交换位置，积不变。", "说清每道算式表示几个几。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["3+3+3+3=12 → 3×4=12。", "4+4+3 不能直接写成乘法。", "6+6+6=18 → 6×3=18。"],
  },
  practice: {
    title: "课堂练习",
    bullets: ["用瓶盖摆 5 组，每组 2 个，写算式。", "把 6+6+6 改写成乘法。", "判断：4+4+3 能写成 4×3 吗？"],
  },
  summary: ["乘法是求几个相同加数和的简便运算。", "先看加数是否相同，再数个数。", "读算式要说清「几个几」。"],
  homework: ["用 12 个瓶盖摆出几个几，写算式。", "读乘法算式给家长听。", "找一找生活中的乘法。"],
};

const RUNTU: TopicSections = {
  objectives: [
    "理清课文写了闰土的哪几件事。",
    "通过外貌、动作、语言描写体会人物形象。",
    "理解「我」对闰土的羡慕与怀念。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["月下瓜地里，闰土在做什么？", "闰土是一个怎样的少年？"],
  },
  concepts: [
    {
      title: "四件事",
      bullets: ["雪地捕鸟。", "海边拾贝、看跳鱼儿。", "看瓜刺猹。"],
    },
    {
      title: "人物描写",
      bullets: ["动作：捏、走、刺。", "语言：滔滔不绝。", "外貌：紫色圆脸、银项圈。"],
    },
    {
      title: "对比与情感",
      bullets: ["闰土见多识广。", "「我」只看见四角的天空。", "表达羡慕、向往与怀念。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["品读「看瓜刺猹」，圈出动作词。", "分角色朗读对话，读出闰土的自信。", "联系「四角的天空」体会「我」的感受。"],
  },
  practice: {
    title: "课堂练习",
    bullets: ["给四件事拟小标题。", "仿写一个动作片段。", "摘抄一处细节描写并批注。"],
  },
  summary: ["具体事例 + 细节描写刻画人物。", "动作、语言、外貌都能表现特点。", "对比让情感更鲜明。"],
  homework: ["有感情地朗读课文。", "仿写一个熟悉的人的动作片段。", "阅读《故乡》中中年闰土的片段。"],
};

const MY_SCHOOL: TopicSections = {
  objectives: [
    "能听、说、读 classroom、library、playground、teachers' office。",
    "能用 This is my school. This is the... 介绍学校。",
    "在指认校园中增强对学校的热爱。",
  ],
  intro: {
    title: "情境导入",
    bullets: ["我们的学校有哪些场所？", "用英语怎么向别人介绍学校？"],
  },
  concepts: [
    {
      title: "场所单词",
      bullets: ["classroom / library。", "playground / teachers' office。", "注意 teachers' office 的读音。"],
    },
    {
      title: "介绍句型",
      bullets: ["This is my school.", "This is the library.", "This is the playground."],
    },
    {
      title: "校园实践",
      bullets: ["指一指：教室、图书角、操场。", "说一说：用英语介绍场所。", "走一走：轻声有序，注意安全。"],
    },
  ],
  example: {
    title: "例题精讲",
    bullets: ["This is my school.", "This is the playground. We play here.", "This is the library. We read here."],
  },
  practice: {
    title: "课堂练习",
    bullets: ["开火车读四个场所单词。", "同桌用「This is the...」互相介绍。", "画一张校园图，用英语标注。"],
  },
  summary: ["四个场所单词要会读。", "This is the... 介绍场所。", "大胆开口，发音清楚。"],
  homework: ["跟读单词五遍。", "用三句英语介绍学校。", "制作一张英文校园图。"],
};

const PARALLELOGRAM: TopicSections = {
  objectives: ["理解平行四边形面积公式的推导过程。", "会用「底×高」计算面积。", "能解决简单的实际问题。"],
  intro: { title: "情境导入", bullets: ["两块地看起来一样大，怎样比较它们的面积？", "长方形的面积怎样计算？"] },
  concepts: [
    { title: "转化成长方形", bullets: ["沿高剪开，平移拼接。", "面积不变。", "把新图形转化成学过的长方形。"] },
    { title: "面积公式", bullets: ["平行四边形面积 = 底 × 高。", "S = a × h。", "高必须与所选的底对应。"] },
  ],
  example: { title: "例题精讲", bullets: ["底 6 厘米、高 4 厘米：6×4=24 平方厘米。", "底 5 米、高 3 米：5×3=15 平方米。", "不能用斜边乘高。"] },
  practice: { title: "课堂练习", bullets: ["计算两块地的面积。", "找出对应的底和高。", "判断：斜边×高能求面积吗？"] },
  summary: ["剪拼转化，面积不变。", "面积 = 底 × 高。", "底和高必须对应。"],
  homework: ["完成课本练习。", "测量一块平行四边形菜地并计算面积。", "用纸剪拼验证公式。"],
};

const CIRCLE: TopicSections = {
  objectives: ["理解圆的周长和圆周率。", "掌握 C=πd、C=2πr。", "能解决测量与计算问题。"],
  intro: { title: "情境导入", bullets: ["车轮滚一圈，走了多远？", "怎样量一个圆的周长？"] },
  concepts: [
    { title: "测量周长", bullets: ["绕绳法：绳子绕圆一周再拉直。", "滚动法：圆滚一周量距离。", "周长与直径的比值大约是 3.14。"] },
    { title: "周长公式", bullets: ["C = πd。", "C = 2πr。", "π 取 3.14 计算。"] },
  ],
  example: { title: "例题精讲", bullets: ["直径 10 厘米：C=3.14×10=31.4 厘米。", "半径 3 米：C=2×3.14×3=18.84 米。", "已知周长可求直径。"] },
  practice: { title: "课堂练习", bullets: ["计算三个圆的周长。", "已知 C=62.8 厘米，求直径。", "判断：圆的周长是直径的 3.14 倍。"] },
  summary: ["周长是围成圆的曲线长。", "C=πd=2πr。", "测量时注意单位。"],
  homework: ["量一枚硬币的周长。", "完成练习册基础题。", "计算家里圆桌的周长。"],
};

const ANGLE: TopicSections = {
  objectives: ["认识量角器，知道角的单位「度」。", "会用量角器量角、画角。", "能比较角的大小。"],
  intro: { title: "情境导入", bullets: ["两个角哪个大？大多少？", "用什么工具量角？"] },
  concepts: [
    { title: "认识量角器", bullets: ["半圆平均分成 180 份。", "1 份所对的角是 1 度，记作 1°。", "有内圈和外圈刻度。"] },
    { title: "量角与画角", bullets: ["中心对顶点，0 刻度对一边。", "看另一边落在哪个刻度上。", "画角先画一条边，再找刻度连线。"] },
  ],
  example: { title: "例题精讲", bullets: ["量出 60° 的角：顶点对齐中心。", "画一个 45° 的角。", "比较 30°、60°、90° 的大小。"] },
  practice: { title: "课堂练习", bullets: ["量出三个角的度数。", "画出 30°、75° 的角。", "同桌互查量角步骤。"] },
  summary: ["度是角的计量单位。", "量角：中心对顶点，0 刻度对一边。", "读刻度分清内圈和外圈。"],
  homework: ["量出三角尺各角的度数。", "画一个 120° 的角。", "找一找生活中的角并估一估。"],
};

const BOAT: TopicSections = {
  objectives: ["认识本课生字，读准字音。", "正确、流利地朗读儿歌。", "想象星空，感受儿歌的美。"],
  intro: { title: "情境导入", bullets: ["夜晚的月亮像什么？", "闭上眼睛，想象坐在月亮船上。"] },
  concepts: [
    { title: "读准生字", bullets: ["船、月、坐、看、见、闪、星、蓝。", "注意后鼻音：船、星、蓝。", "借助拼音读通儿歌。"] },
    { title: "发现叠词", bullets: ["弯弯的月儿、小小的船。", "闪闪的星星、蓝蓝的天。", "叠词让句子更有画面感。"] },
  ],
  example: { title: "例题精讲", bullets: ["读「弯弯的月儿小小的船」。", "想一想：月亮还像什么？", "学着说「___的___」。"] },
  practice: { title: "课堂练习", bullets: ["开火车读生字。", "有感情地朗读儿歌。", "仿说：弯弯的（　　）。"] },
  summary: ["读准生字，读通儿歌。", "叠词让画面更美。", "边读边想象星空。"],
  homework: ["朗读儿歌给家人听。", "抄写生字。", "画一幅月亮船。"],
};

const FOX: TopicSections = {
  objectives: ["认识生字，读通课文。", "分角色朗读，体会人物语气。", "理解寓言寓意。"],
  intro: { title: "情境导入", bullets: ["老虎和狐狸谁更厉害？", "如果狐狸被老虎抓住，它会怎么办？"] },
  concepts: [
    { title: "故事脉络", bullets: ["老虎捉住狐狸。", "狐狸借老天爷的名义吓唬老虎。", "百兽逃跑，老虎受骗。"] },
    { title: "词语与寓意", bullets: ["神气活现、摇头摆尾。", "半信半疑、东张西望。", "寓意：借他人威势吓唬人。"] },
  ],
  example: { title: "例题精讲", bullets: ["分角色读老虎和狐狸的对话。", "演一演狐狸「神气活现」的样子。", "说一说百兽为什么逃跑。"] },
  practice: { title: "课堂练习", bullets: ["给生字组词。", "画出狐狸说的话。", "用自己的话讲这个故事。"] },
  summary: ["狐狸借老虎的威风。", "人物语气能帮助理解。", "不能借他人威势吓唬人。"],
  homework: ["把故事讲给家人听。", "抄写生字词。", "续编一个小结尾。"],
};

const IVY: TopicSections = {
  objectives: ["了解爬山虎脚的形态和攀爬过程。", "学习作者细致、连续的观察。", "体会观察与表达的关系。"],
  intro: { title: "情境导入", bullets: ["爬山虎为什么能爬墙？", "它的脚长在哪里？"] },
  concepts: [
    { title: "脚的形态", bullets: ["长在茎上长叶柄的地方。", "枝状，像蜗牛的触角。", "颜色嫩红。"] },
    { title: "攀爬过程", bullets: ["触着墙：长出小圆片。", "巴住墙：细丝变成小圆片。", "拉、贴：一步一步往上爬。"] },
  ],
  example: { title: "例题精讲", bullets: ["找出写脚的位置、形状、颜色的句子。", "圈出「触、巴、拉、贴」等动词。", "画一画爬山虎的脚。"], },
  practice: { title: "课堂练习", bullets: ["填一填脚的形态。", "按顺序复述攀爬过程。", "观察校园里的一种植物并记录。"], },
  summary: ["观察要细致。", "观察要连续。", "动作词让过程更清楚。"],
  homework: ["观察一种植物的变化，写观察日记。", "抄写本课词语。", "画一张爬山虎攀爬示意图。"],
};

const BRIDGE: TopicSections = {
  objectives: ["理清小说情节。", "通过环境、动作、语言体会人物形象。", "理解结尾的悲壮与崇高。"],
  intro: { title: "情境导入", bullets: ["洪水来了，人们怎样逃生？", "窄窄的木桥为什么成了生命桥？"] },
  concepts: [
    { title: "情节推进", bullets: ["山洪暴发，村民惊慌。", "老汉指挥过桥，先人后己。", "桥塌，父子牺牲。"] },
    { title: "人物与环境", bullets: ["环境描写推动紧张感。", "老汉的动作、语言表现镇定。", "结尾点明父子关系，震撼人心。"] },
  ],
  example: { title: "例题精讲", bullets: ["画出描写洪水的句子。", "读老汉的语言，体会语气。", "讨论：为什么以「桥」为题？"] },
  practice: { title: "课堂练习", bullets: ["用小标题概括情节。", "摘抄一处环境描写并批注。", "分角色朗读。"], },
  summary: ["环境描写烘托气氛。", "人物描写表现品质。", "结尾让主题升华。"],
  homework: ["有感情地朗读课文。", "写一段环境描写。", "阅读作者的其他作品。"],
};

const AIR: TopicSections = {
  objectives: ["知道空气看不见但占据空间。", "会设计简单实验验证猜想。", "如实记录实验现象。"],
  intro: { title: "情境导入", bullets: ["空杯子里真的有「空」吗？", "把杯子倒扣入水中，纸会湿吗？"] },
  concepts: [
    { title: "空气占据空间", bullets: ["空气看不见、摸不着。", "空气占据一定的空间。", "杯子倒扣入水，纸团不湿。"] },
    { title: "实验方法", bullets: ["控制条件，只改变一个因素。", "观察现象并记录。", "用证据解释结果。"] },
  ],
  example: { title: "例题精讲", bullets: ["杯底塞纸，倒扣入水。", "纸不湿，说明空气占据空间。", "倾斜杯子，空气跑出，水进入。"] },
  practice: { title: "课堂练习", bullets: ["设计「空气占据空间」实验。", "记录现象。", "解释生活中的相关现象。"], },
  summary: ["空气占据空间。", "实验要控制条件。", "结论要有证据。"],
  homework: ["用塑料袋收集空气。", "向家人演示实验。", "记录一个生活中的空气现象。"],
};

const CIRCUIT: TopicSections = {
  objectives: ["认识简单电路的组成。", "会排查常见电路故障。", "树立安全用电意识。"],
  intro: { title: "情境导入", bullets: ["手电筒为什么不亮了？", "可能是哪里出了问题？"] },
  concepts: [
    { title: "电路组成", bullets: ["电源、导线、用电器、开关。", "形成闭合回路，灯泡才会亮。", "画电路示意图。"] },
    { title: "故障排查", bullets: ["先查灯泡，再查导线。", "换电池试试，检查开关。", "一次只改变一个因素。"] },
  ],
  example: { title: "例题精讲", bullets: ["灯泡不亮：检查是否接触不良。", "换一节电池后灯亮，说明电池没电。", "用替换法逐项排查。"] },
  practice: { title: "课堂练习", bullets: ["连接一个简单电路。", "用替换法找出故障。", "画出电路示意图。"], },
  summary: ["闭合回路是点亮灯泡的条件。", "排查故障要按顺序。", "安全用电，不用湿手操作。"],
  homework: ["检查家里的手电筒。", "画一个电路图。", "记录一条安全用电提示。"],
};

const EARTH: TopicSections = {
  objectives: ["了解人类认识地球形状的过程。", "能用证据解释地球是球体。", "体会科学认识的发展。"],
  intro: { title: "情境导入", bullets: ["古人认为地球是什么形状？", "今天我们怎样知道地球是球体？"] },
  concepts: [
    { title: "从猜想到证据", bullets: ["天圆地方的猜想。", "帆船进港先见桅杆。", "月食阴影是圆弧。"] },
    { title: "环球航行与卫星", bullets: ["麦哲伦船队环球航行。", "卫星照片直观显示地球。", "地球是一个球体。"] },
  ],
  example: { title: "例题精讲", bullets: ["观察帆船模型进港过程。", "用地球仪解释月食。", "比较不同证据的说服力。"], },
  practice: { title: "课堂练习", bullets: ["排序人类认识地球的过程。", "选择支持地球是球体的证据。", "画一张证据卡。"], },
  summary: ["认识来自观察与证据。", "技术进步推动认识发展。", "地球是球体。"],
  homework: ["收集一种地球形状的证据。", "制作证据小卡片。", "给低年级同学讲一讲。"],
};

const LIGHT: TopicSections = {
  objectives: ["知道光沿直线传播。", "能用实验验证。", "解释影子和相关现象。"],
  intro: { title: "情境导入", bullets: ["为什么会有影子？", "光是怎样从光源到物体的？"] },
  concepts: [
    { title: "光沿直线传播", bullets: ["光在同种均匀介质中沿直线传播。", "三张卡纸小孔对齐才能看到光。", "移动一张卡纸，光被挡住。"] },
    { title: "生活中的现象", bullets: ["影子形成。", "小孔成像。", "排队看齐、激光准直。"] },
  ],
  example: { title: "例题精讲", bullets: ["三张卡纸实验：只对齐小孔。", "移动中间卡纸，光斑消失。", "说明光沿直线传播。"] },
  practice: { title: "课堂练习", bullets: ["画出光从光源到物体的路径。", "解释影子形成。", "设计一个验证实验。"], },
  summary: ["光沿直线传播。", "影子是光被挡住形成的。", "实验要控制条件。"],
  homework: ["观察一天中影子的变化。", "做一次小孔成像。", "记录一条光线直行的例子。"],
};

const SAFETY: TopicSections = {
  objectives: ["识别生活中的安全隐患。", "掌握求助与自护方法。", "形成安全第一的意识。"],
  intro: { title: "情境导入", bullets: ["上学路上有哪些危险？", "遇到危险应该先做什么？"] },
  concepts: [
    { title: "常见隐患", bullets: ["交通：横穿马路、乘车不系安全带。", "用电：湿手碰插座。", "溺水：私自下河游泳。"] },
    { title: "求助与自护", bullets: ["110 报警、120 急救、119 火警。", "记住家长和老师电话。", "先保证自身安全，再求助。"] },
  ],
  example: { title: "例题精讲", bullets: ["情境：同学落水怎么办？", "不贸然下水，大声呼救并报警。", "情境：电器着火先断电。"], },
  practice: { title: "课堂练习", bullets: ["判断三种做法是否安全。", "模拟拨打求助电话。", "制作一张安全提示卡。"], },
  summary: ["识别隐患是第一步。", "记住求助电话。", "先自护，再施救。"],
  homework: ["和家长排查家中隐患。", "制作安全小报。", "背熟三个求助电话。"],
};

const CLASS_MASTER: TopicSections = {
  objectives: ["认识班级自治的意义。", "学会参与班级事务。", "增强责任意识。"],
  intro: { title: "情境导入", bullets: ["班级规则是谁制定的？", "遇到班级问题，应该听谁的？"] },
  concepts: [
    { title: "共同制定规则", bullets: ["人人参与讨论。", "规则要具体、可执行。", "少数服从多数，尊重不同意见。"] },
    { title: "分工与合作", bullets: ["班干部各负其责。", "同学互相配合。", "人人都是班级主人。"] },
  ],
  example: { title: "例题精讲", bullets: ["讨论：图书角怎样管理？", "制定借阅规则和值日表。", "一周后检查执行情况。"], },
  practice: { title: "课堂练习", bullets: ["提出一个班级问题。", "小组制定解决方案。", "全班投票。"], },
  summary: ["班级事务人人有责。", "规则共同制定、共同遵守。", "在合作中成长。"],
  homework: ["采访一位班干部。", "为班级做一件小事。", "写一条班级公约建议。"],
};

const COLOURS: TopicSections = {
  objectives: ["能听、说、读颜色单词。", "会用 What colour is it? It's... 问答。", "能描述身边物品的颜色。"],
  intro: { title: "情境导入", bullets: ["Look! What colour is it?", "说说教室里你看到的颜色。"] },
  concepts: [
    { title: "Colour words", bullets: ["red, yellow, blue。", "green, black, white。", "注意 red 和 green 的发音。"] },
    { title: "Ask and answer", bullets: ["What colour is it?", "It's red.", "同桌指着物品问答。"] },
  ],
  example: { title: "例题精讲", bullets: ["T: What colour is it?", "S: It's blue.", "教师指不同物品，学生快速回答。"] },
  practice: { title: "课堂练习", bullets: ["开火车读颜色单词。", "给文具涂色并说颜色。", "小组问答比赛。"], },
  summary: ["颜色单词要会读。", "What colour is it? It's...", "大胆开口说完整句子。"],
  homework: ["跟读单词五遍。", "给家里的三件物品说颜色。", "制作一张颜色卡。"],
};

const MY_WEEK: TopicSections = {
  objectives: ["能听、说、读星期单词。", "会用 What do you have on...? 问答。", "介绍自己一周的活动安排。"],
  intro: { title: "情境导入", bullets: ["What day is it today?", "What do you have on Mondays?"] },
  concepts: [
    { title: "Days of the week", bullets: ["Monday, Tuesday, Wednesday。", "Thursday, Friday, Saturday, Sunday。", "注意 Wednesday 的拼写。"] },
    { title: "Talk about the week", bullets: ["What do you have on Mondays?", "I have maths and English.", "介绍一周活动安排。"] },
  ],
  example: { title: "例题精讲", bullets: ["T: What do you have on Mondays?", "S: I have Chinese and maths.", "两人一组互相问答。"] },
  practice: { title: "课堂练习", bullets: ["按顺序读星期单词。", "填一填自己的课程表。", "小组介绍一周活动。"], },
  summary: ["星期单词按顺序记。", "What do you have on...?", "用完整句子回答。"],
  homework: ["跟读星期单词。", "制作英文课程表。", "介绍自己的周末安排。"],
};

function genericNew(meta: LessonMeta): TopicSections {
  const lesson = meta.lesson;
  const subject: Subject = meta.subject;
  if (subject === "语文") {
    return {
      objectives: [
        `认识《${lesson}》中的生字新词，读通课文。`,
        "抓住关键词句理解内容，体会表达方法。",
        "联系生活表达感受，积累语言。",
      ],
      intro: {
        title: "情境导入",
        bullets: [`看到课题《${lesson}》，你想知道什么？`, "先带着问题读一遍课文。"],
      },
      concepts: [
        { title: "读通课文", bullets: ["读准字音，圈出生字词。", "标出自然段，读通长句子。", "同桌互查朗读。"] },
        { title: "品味语言", bullets: ["找出最打动你的句子。", "联系上下文理解关键词。", "说说作者是怎样写的。"] },
        { title: "表达迁移", bullets: ["联系自己的生活说一说。", "尝试用上本课的一种写法。", "和同伴互评、修改。"] },
      ],
      example: {
        title: "例题精讲",
        bullets: [`默读《${lesson}》，画出关键句。`, "说一说这句话好在哪里。", "有感情地朗读，读出体会。"],
      },
      practice: {
        title: "课堂练习",
        bullets: ["生字注音、组词。", "摘抄一处好句子。", "仿写一小段话。"],
      },
      summary: ["读通课文是基础。", "抓关键语句理解内容与写法。", "把学到的表达用到自己的话里。"],
      homework: ["朗读课文给家人听。", "抄写生字词。", "完成一段生活观察小练笔。"],
    };
  }
  if (subject === "数学") {
    return {
      objectives: [`理解《${lesson}》的核心概念与方法。`, "能运用所学解决简单问题。", "在操作与交流中说明思考过程。"],
      intro: {
        title: "情境导入",
        bullets: [`今天学习《${lesson}》。`, "先观察一个与课题有关的情境，提出数学问题。"],
      },
      concepts: [
        { title: "观察与发现", bullets: ["找出情境中的数学信息。", "用画图、操作或举例表示。", "和同伴说一说你的发现。"] },
        { title: "方法探究", bullets: ["先读懂题意，再选择方法。", "按步骤计算或推理。", "用另一种方法检验结果。"] },
        { title: "易错提醒", bullets: ["注意单位和运算顺序。", "书写规范，步骤完整。", "错题要回到概念找原因。"] },
      ],
      example: {
        title: "例题精讲",
        bullets: ["出示课本例题，先独立尝试。", "交流不同的解题方法。", "比较哪种方法更简便。"],
      },
      practice: {
        title: "课堂练习",
        bullets: ["完成课本「做一做」。", "用两种方法解决同一道题。", "同桌互讲一道题，说清思路。"],
      },
      summary: ["说清概念、方法和检验过程。", "遇到难题先画图再分析。", "错题整理是提分的关键。"],
      homework: ["完成课本练习。", "整理一道错题并写清原因。", "找一找生活中的相关数学问题。"],
    };
  }
  if (subject === "科学") {
    return {
      objectives: [`围绕《${lesson}》提出可探究的问题。`, "设计简单实验并如实记录。", "用证据支持自己的结论。"],
      intro: {
        title: "情境导入",
        bullets: [`观察与《${lesson}》有关的现象。`, "你能提出一个可以研究的问题吗？"],
      },
      concepts: [
        { title: "提出问题与猜想", bullets: ["观察现象，描述特征。", "提出可以验证的问题。", "作出自己的猜想。"] },
        { title: "设计实验", bullets: ["选择需要的材料。", "只改变一个条件。", "想清楚怎样记录。"] },
        { title: "记录与结论", bullets: ["如实记录现象和数据。", "连续观察，不急着下结论。", "用证据解释结果。"] },
      ],
      example: {
        title: "例题精讲",
        bullets: ["围绕课题设计两组对比。", "列出相同条件和不同条件。", "画出记录表，说明观察方法。"],
      },
      practice: {
        title: "课堂练习",
        bullets: ["设计一个对比实验。", "完成记录表。", "和同伴交流你的猜想与证据。"],
      },
      summary: ["问题—猜想—实验—记录—结论。", "对比实验只改变一个条件。", "科学结论要用证据说话。"],
      homework: ["完成观察记录。", "向家人介绍实验。", "提出一个新的可探究问题。"],
    };
  }
  if (subject === "英语") {
    return {
      objectives: [`能听、说、读《${lesson}》的核心单词。`, "能运用目标句型交流。", "敢于开口，注意语音语调。"],
      intro: {
        title: "情境导入",
        bullets: ["Look and say: 你看到了什么？", "用英语试着说一说。"],
      },
      concepts: [
        { title: "Words", bullets: ["看图认读核心单词。", "跟读、开火车读。", "注意发音和重音。"] },
        { title: "Sentences", bullets: ["跟读目标句型。", "同桌问答操练。", "把句子说完整。"] },
        { title: "Practice", bullets: ["在情境中运用句型。", "小组合作表演。", "大胆开口，不怕出错。"] },
      ],
      example: {
        title: "例题精讲",
        bullets: ["教师示范问答。", "同桌模仿练习。", "请两组展示并评价。"],
      },
      practice: {
        title: "课堂练习",
        bullets: ["读单词并连线。", "用目标句型说两句话。", "小组准备一个短对话。"],
      },
      summary: ["核心单词会认读。", "目标句型会说会用。", "多听、多读、大胆说。"],
      homework: ["跟读单词五遍。", "用目标句型说两句话。", "制作一张英语小卡片。"],
    };
  }
  return {
    objectives: [`结合生活理解《${lesson}》的核心观点。`, "能在情境中作出判断并说明理由。", "把课堂所学落实到行动中。"],
    intro: {
      title: "情境导入",
      bullets: [`看一看与《${lesson}》有关的生活情境。`, "如果是你，会怎么做？"],
    },
    concepts: [
      { title: "理解观点", bullets: ["读一读材料，圈出关键词。", "联系班级和家庭生活举例。", "说清观点和理由。"] },
      { title: "情境辨析", bullets: ["分析不同做法的后果。", "听取同伴的不同意见。", "形成合理的价值判断。"] },
      { title: "行动落实", bullets: ["制定可执行的行动清单。", "从小事做起。", "一周后回顾坚持情况。"] },
    ],
    example: {
      title: "例题精讲",
      bullets: ["出示一个两难情境。", "小组讨论：怎么做？为什么？", "全班交流并形成共识。"],
    },
    practice: {
      title: "课堂练习",
      bullets: ["判断三种做法是否合适。", "写出两条行动建议。", "和同桌互相补充。"],
    },
    summary: ["观点要联系生活理解。", "判断要说清理由。", "把认识落实到行动。"],
    homework: ["完成练习册基础题。", "记录一件做到的小事。", "和家长交流本课观点。"],
  };
}

function genericReview(meta: LessonMeta, knowledgeRange: string): TopicSections {
  const range = knowledgeRange || `${meta.lesson}所在单元`;
  return {
    objectives: [
      `梳理「${range}」的知识网络。`,
      "针对易错点查漏补缺。",
      "在综合情境中迁移运用。",
    ],
    intro: {
      title: "单元回顾",
      bullets: [`本单元学习了「${range}」的哪些内容？`, "先看一道典型错题，找出错因。"],
    },
    concepts: [
      {
        title: "知识网络",
        bullets: ["按目录梳理概念、方法、应用。", "用箭头连接知识之间的前后联系。", "标出自己最不熟悉的一处。"],
      },
      {
        title: "易错点清单",
        bullets: ["从错题中找共同原因。", "把易错点写成一句话提醒。", "用红笔标注改正方法。"],
      },
      {
        title: "复习方法",
        bullets: ["先回顾概念，再练基础题。", "做变式题检验是否真正掌握。", "最后用错题本复盘。"],
      },
    ],
    example: {
      title: "典型例题",
      bullets: ["选择一道覆盖核心方法的例题。", "读题、画图、列式、检验。", "比较不同解法，选出更简便的一种。"],
    },
    practice: {
      title: "分层练习",
      bullets: ["完成基础题，人人过关。", "选做一道变式题。", "把错题抄进错题本并写清原因。"],
    },
    summary: ["复习不是重复，而是把知识连成网。", "错题是最好的复习材料。", "用练习检验，用反思改进。"],
    homework: ["整理本单元错题。", "完成配套试题基础题。", "给同伴讲清一个知识点。"],
  };
}

const SPECS: Record<string, TopicSections> = {
  分数的初步认识: FRACTIONS,
  分数单元复习: FRACTIONS_REVIEW,
  秋天的雨: AUTUMN,
  小数的意义: DECIMALS,
  种子发芽实验: SEEDS,
  公民的基本权利: RIGHTS,
  "表内乘法（一）": MULTIPLICATION,
  少年闰土: RUNTU,
  "My School": MY_SCHOOL,
  平行四边形的面积: PARALLELOGRAM,
  圆的周长: CIRCLE,
  角的度量: ANGLE,
  小小的船: BOAT,
  狐假虎威: FOX,
  爬山虎的脚: IVY,
  桥: BRIDGE,
  空气占据空间吗: AIR,
  电路出故障了: CIRCUIT,
  地球的形状: EARTH,
  光的传播: LIGHT,
  安全记心上: SAFETY,
  我们是班级的主人: CLASS_MASTER,
  Colours: COLOURS,
  "My Week": MY_WEEK,
};

const HINTS: { test: RegExp; key: string }[] = [
  { test: /分数/, key: "分数的初步认识" },
  { test: /秋天|秋雨/, key: "秋天的雨" },
  { test: /小数/, key: "小数的意义" },
  { test: /种子|发芽/, key: "种子发芽实验" },
  { test: /权利|宪法/, key: "公民的基本权利" },
  { test: /乘法/, key: "表内乘法（一）" },
  { test: /闰土/, key: "少年闰土" },
  { test: /平行四边形/, key: "平行四边形的面积" },
  { test: /圆的周长|周长/, key: "圆的周长" },
  { test: /角的度量|量角/, key: "角的度量" },
  { test: /小小的船/, key: "小小的船" },
  { test: /狐假虎威/, key: "狐假虎威" },
  { test: /爬山虎/, key: "爬山虎的脚" },
  { test: /桥/, key: "桥" },
  { test: /空气/, key: "空气占据空间吗" },
  { test: /电路/, key: "电路出故障了" },
  { test: /地球/, key: "地球的形状" },
  { test: /光的传播|光/, key: "光的传播" },
  { test: /安全记心上|安全/, key: "安全记心上" },
  { test: /班级的主人|班级/, key: "我们是班级的主人" },
  { test: /colours|colors|颜色/i, key: "Colours" },
  { test: /my week|week/i, key: "My Week" },
  { test: /school|学校/i, key: "My School" },
];

export function buildTopicSections(
  meta: LessonMeta,
  lessonType: LessonType | undefined,
  knowledgeRange: string | undefined,
): TopicSections {
  if (lessonType === "review") {
    if (/分数/.test(meta.lesson)) return FRACTIONS_REVIEW;
    return genericReview(meta, knowledgeRange ?? "");
  }

  const normalized = meta.lesson.replace(/[\s（）()《》·、，,。:：-]/g, "").toLowerCase();
  const direct = Object.keys(SPECS).find(
    (key) => key.replace(/[\s（）()《》·、，,。:：-]/g, "").toLowerCase() === normalized,
  );
  if (direct) return SPECS[direct];
  for (const hint of HINTS) {
    if (hint.test.test(meta.lesson)) return SPECS[hint.key];
  }
  return genericNew(meta);
}