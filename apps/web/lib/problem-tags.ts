import type { Locale } from "./i18n";

type ProblemTagLabel = {
  en: string;
  zh: string;
};

export const problemTagLabels: Record<string, ProblemTagLabel> = {
  array: { en: "Array", zh: "数组" },
  condition: { en: "Condition", zh: "分支" },
  flow: { en: "Flow", zh: "网络流" },
  geometry: { en: "Geometry", zh: "几何" },
  graph: { en: "Graph", zh: "图论" },
  greedy: { en: "Greedy", zh: "贪心" },
  heap: { en: "Heap", zh: "堆" },
  interactive: { en: "Interactive", zh: "交互" },
  io: { en: "I/O", zh: "输入输出" },
  loop: { en: "Loop", zh: "循环" },
  math: { en: "Math", zh: "数学" },
  prefix: { en: "Prefix Sum", zh: "前缀和" },
  string: { en: "String", zh: "字符串" },
};

export function formatProblemTag(tag: string, locale: Locale) {
  const label = problemTagLabels[tag] ?? { en: tag, zh: tag };
  return locale === "zh-CN" ? `${label.zh} ${label.en}` : `${label.en} ${label.zh}`;
}

export function searchableProblemTagText(tag: string) {
  const label = problemTagLabels[tag] ?? { en: tag, zh: tag };
  return `${tag} ${label.en} ${label.zh}`.toLowerCase();
}
