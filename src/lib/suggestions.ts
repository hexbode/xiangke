import type { Grade, Subject, Textbook } from "./types";

export interface LessonSuggestion {
  lesson: string;
  grade: Grade;
  textbook: Textbook;
}

export const SUGGESTIONS: Record<Subject, LessonSuggestion[]> = {
  数学: [
    { lesson: "分数的初步认识", grade: "三年级", textbook: "人教版" },
    { lesson: "小数的意义", grade: "四年级", textbook: "人教版" },
    { lesson: "表内乘法（一）", grade: "二年级", textbook: "人教版" },
    { lesson: "平行四边形的面积", grade: "五年级", textbook: "人教版" },
    { lesson: "圆的周长", grade: "六年级", textbook: "人教版" },
    { lesson: "角的度量", grade: "四年级", textbook: "人教版" },
    { lesson: "一元一次方程", grade: "七年级", textbook: "人教版" },
    { lesson: "全等三角形", grade: "八年级", textbook: "人教版" },
    { lesson: "二次函数", grade: "九年级", textbook: "人教版" },
  ],
  语文: [
    { lesson: "秋天的雨", grade: "三年级", textbook: "统编版" },
    { lesson: "少年闰土", grade: "五年级", textbook: "统编版" },
    { lesson: "小小的船", grade: "一年级", textbook: "统编版" },
    { lesson: "狐假虎威", grade: "二年级", textbook: "统编版" },
    { lesson: "爬山虎的脚", grade: "四年级", textbook: "统编版" },
    { lesson: "桥", grade: "六年级", textbook: "统编版" },
    { lesson: "春", grade: "七年级", textbook: "统编版" },
    { lesson: "三峡", grade: "八年级", textbook: "统编版" },
    { lesson: "乡愁", grade: "九年级", textbook: "统编版" },
  ],
  科学: [
    { lesson: "种子发芽实验", grade: "五年级", textbook: "教科版" },
    { lesson: "空气占据空间吗", grade: "三年级", textbook: "教科版" },
    { lesson: "电路出故障了", grade: "四年级", textbook: "教科版" },
    { lesson: "地球的形状", grade: "六年级", textbook: "教科版" },
    { lesson: "光的传播", grade: "五年级", textbook: "教科版" },
    { lesson: "科学探究的方法", grade: "七年级", textbook: "教科版" },
  ],
  道德与法治: [
    { lesson: "公民的基本权利", grade: "六年级", textbook: "统编版" },
    { lesson: "安全记心上", grade: "三年级", textbook: "统编版" },
    { lesson: "我们是班级的主人", grade: "五年级", textbook: "统编版" },
    { lesson: "中学时代", grade: "七年级", textbook: "统编版" },
    { lesson: "遵守社会规则", grade: "八年级", textbook: "统编版" },
    { lesson: "富强与创新", grade: "九年级", textbook: "统编版" },
  ],
  英语: [
    { lesson: "My School", grade: "四年级", textbook: "人教版" },
    { lesson: "Colours", grade: "三年级", textbook: "人教版" },
    { lesson: "My Week", grade: "五年级", textbook: "人教版" },
    { lesson: "My name's Gina", grade: "七年级", textbook: "人教版" },
    { lesson: "How often do you exercise?", grade: "八年级", textbook: "人教版" },
    { lesson: "I like music that I can dance to", grade: "九年级", textbook: "人教版" },
  ],
};
