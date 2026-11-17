// 外部开放资源入口：全部为免登录外链，按课题关键词跳转检索。
// 说明：官方平台当前未提供免授权 API，这里使用稳定深链，避免抓取与版权风险。
export interface OerSource {
  id: string;
  name: string;
  desc: string;
  tag: string;
  url: string;
  search?: (keyword: string) => string;
}

export const OER_SOURCES: OerSource[] = [  {
    id: "smartedu",
    name: "国家中小学智慧教育平台",
    desc: "教育部官方课程教学、教材与教师研修资源",
    tag: "官方",
    url: "https://basic.smartedu.cn/",
  },
  {
    id: "pep",
    name: "人民教育出版社",
    desc: "人教版电子教材与教材目录",
    tag: "教材",
    url: "https://www.pep.com.cn/",
  },
  {
    id: "eduyun",
    name: "国家教育资源公共服务平台",
    desc: "全国中小学教学资源与教研活动",
    tag: "官方",
    url: "https://www.eduyun.cn/",
  },
  {
    id: "bilibili",
    name: "B 站教学视频",
    desc: "按课题搜索课堂实录、微课与实验演示",
    tag: "视频",
    url: "https://search.bilibili.com/all?keyword=",
    search: (keyword) =>
      `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`,
  },
  {
    id: "openverse",
    name: "Openverse 开放图片",
    desc: "CC 授权图片，可用于课件配图",
    tag: "配图",
    url: "https://openverse.org/",
    search: (keyword) =>
      `https://openverse.org/search/image?q=${encodeURIComponent(keyword)}`,
  },
  {
    id: "commons",
    name: "Wikimedia Commons",
    desc: "开放版权图片与示意图",
    tag: "配图",
    url: "https://commons.wikimedia.org/",
    search: (keyword) =>
      `https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(keyword)}`,
  },
];

export interface OerResource {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  license: string;
  creator: string;
  source: string;
}

function svgData(body: string): string {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">${body}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

const FONT = "font-family='Microsoft YaHei, sans-serif'";

// 外部图库不可达时的内置图示，可直接用于课件或下载
export const BUILTIN_DIAGRAMS: OerResource[] = [
  {
    id: "builtin-fraction-circle",
    title: "1/4 圆图：四等分涂一份",
    thumbnail: svgData(
      `<rect width="480" height="270" fill="#fbf8ee"/>
       <circle cx="190" cy="135" r="86" fill="#fffdf6" stroke="#2E5A3C" stroke-width="3"/>
       <path d="M190 49 A86 86 0 0 1 276 135 L190 135 Z" fill="#D9AE6A" stroke="#2E5A3C" stroke-width="3"/>
       <line x1="104" y1="135" x2="276" y2="135" stroke="#2E5A3C" stroke-width="3"/>
       <line x1="190" y1="49" x2="190" y2="221" stroke="#2E5A3C" stroke-width="3"/>
       <text x="320" y="130" font-size="46" fill="#2E5A3C" ${FONT}>1/4</text>
       <text x="320" y="170" font-size="17" fill="#7C7460" ${FONT}>平均分 4 份，取 1 份</text>`,
    ),
    url: "",
    license: "本站生成 · 可自由使用",
    creator: "乡课",
    source: "内置图示",
  },
  {
    id: "builtin-fraction-bar",
    title: "3/5 长条图：五等分涂三份",
    thumbnail: svgData(
      `<rect width="480" height="270" fill="#fbf8ee"/>
       <g stroke="#2E5A3C" stroke-width="3">
         <rect x="50" y="100" width="76" height="70" fill="#D9AE6A"/>
         <rect x="126" y="100" width="76" height="70" fill="#D9AE6A"/>
         <rect x="202" y="100" width="76" height="70" fill="#D9AE6A"/>
         <rect x="278" y="100" width="76" height="70" fill="#fffdf6"/>
         <rect x="354" y="100" width="76" height="70" fill="#fffdf6"/>
       </g>
       <text x="190" y="225" font-size="40" fill="#2E5A3C" ${FONT}>3/5</text>`,
    ),
    url: "",
    license: "本站生成 · 可自由使用",
    creator: "乡课",
    source: "内置图示",
  },
  {
    id: "builtin-ten-split",
    title: "10 的分成：6 个绿点 + 4 个红点",
    thumbnail: svgData(
      `<rect width="480" height="270" fill="#fbf8ee"/>
       <g fill="#3E8E5A">
         <circle cx="60" cy="90" r="14"/><circle cx="100" cy="90" r="14"/><circle cx="140" cy="90" r="14"/>
         <circle cx="60" cy="140" r="14"/><circle cx="100" cy="140" r="14"/><circle cx="140" cy="140" r="14"/>
       </g>
       <text x="210" y="135" font-size="54" fill="#2E5A3C" ${FONT}>+</text>
       <g fill="#C0503A">
         <circle cx="300" cy="90" r="14"/><circle cx="340" cy="90" r="14"/>
         <circle cx="300" cy="140" r="14"/><circle cx="340" cy="140" r="14"/>
       </g>
       <text x="380" y="135" font-size="48" fill="#2E5A3C" ${FONT}>=</text>
       <text x="200" y="225" font-size="34" fill="#2E5A3C" ${FONT}>6 + 4 = 10</text>`,
    ),
    url: "",
    license: "本站生成 · 可自由使用",
    creator: "乡课",
    source: "内置图示",
  },
  {
    id: "builtin-number-line",
    title: "0–10 数轴示意图",
    thumbnail: svgData(
      `<rect width="480" height="270" fill="#fbf8ee"/>
       <line x1="50" y1="140" x2="430" y2="140" stroke="#2E5A3C" stroke-width="3"/>
       <g stroke="#2E5A3C" stroke-width="2">
         <line x1="50" y1="130" x2="50" y2="150"/><line x1="84" y1="130" x2="84" y2="150"/>
         <line x1="118" y1="130" x2="118" y2="150"/><line x1="152" y1="130" x2="152" y2="150"/>
         <line x1="186" y1="130" x2="186" y2="150"/><line x1="220" y1="130" x2="220" y2="150"/>
         <line x1="254" y1="130" x2="254" y2="150"/><line x1="288" y1="130" x2="288" y2="150"/>
         <line x1="322" y1="130" x2="322" y2="150"/><line x1="356" y1="130" x2="356" y2="150"/>
         <line x1="390" y1="130" x2="390" y2="150"/><line x1="424" y1="130" x2="424" y2="150"/>
       </g>
       <g font-size="16" fill="#7C7460" ${FONT}>
         <text x="46" y="180">0</text><text x="114" y="180">2</text><text x="182" y="180">4</text>
         <text x="250" y="180">6</text><text x="318" y="180">8</text><text x="380" y="180">10</text>
       </g>`,
    ),
    url: "",
    license: "本站生成 · 可自由使用",
    creator: "乡课",
    source: "内置图示",
  },
].map((item) => ({ ...item, url: item.thumbnail }));

export interface OerSearchResult {
  results: OerResource[];
  fallback: boolean;
  elapsedMs?: number;
  local?: boolean;
}

export async function searchOer(query: string, limit = 8): Promise<OerSearchResult> {
  if (!query.trim()) {
    return { results: BUILTIN_DIAGRAMS, fallback: true };
  }
  try {
    const response = await fetch(
      `/api/oer/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
    if (!response.ok) throw new Error(`oer ${response.status}`);
    const data = (await response.json()) as {
      results?: OerResource[];
      elapsed_ms?: number;
      local?: boolean;
    };
    if (!data.results || data.results.length === 0) throw new Error("empty");
    return {
      results: data.results,
      fallback: false,
      elapsedMs: data.elapsed_ms,
      local: data.local,
    };
  } catch {
    return { results: BUILTIN_DIAGRAMS, fallback: true };
  }
}

export async function fetchHotOer(limit = 8): Promise<OerSearchResult> {
  try {
    const response = await fetch(`/api/oer/hot?limit=${limit}`);
    if (!response.ok) throw new Error(`oer hot ${response.status}`);
    const data = (await response.json()) as { results?: OerResource[] };
    if (!data.results || data.results.length === 0) throw new Error("empty");
    return { results: data.results, fallback: false, elapsedMs: 0, local: true };
  } catch {
    return { results: BUILTIN_DIAGRAMS, fallback: true, elapsedMs: 0, local: true };
  }
}

export interface OerDiagramResult {
  ok: boolean;
  query?: string;
  raster?: boolean;
  asset?: OerResource | null;
}

const diagramCache = new Map<string, Promise<OerResource | null>>();

/** 图解区配图：按课题与页面信息从服务端缓存索引里选一张网络素材。 */
export function fetchDiagramAsset(params: {
  subject?: string;
  lesson?: string;
  title?: string;
  hint?: string;
  grade?: string;
}): Promise<OerResource | null> {
  const key = [
    params.subject ?? "",
    params.lesson ?? "",
    params.title ?? "",
    params.hint ?? "",
    params.grade ?? "",
  ].join("|");
  const cached = diagramCache.get(key);
  if (cached) return cached;
  const task = (async () => {
    try {
      const query = new URLSearchParams({
        subject: params.subject ?? "",
        lesson: params.lesson ?? "",
        title: params.title ?? "",
        hint: params.hint ?? "",
        grade: params.grade ?? "",
      });
      const response = await fetch(`/api/oer/diagram?${query.toString()}`);
      if (!response.ok) return null;
      const data = (await response.json()) as OerDiagramResult;
      return data.asset ?? null;
    } catch {
      return null;
    }
  })();
  diagramCache.set(key, task);
  return task;
}
