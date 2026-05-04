/** Local problem statements stay as practice seeds; activity/ranking/social datasets stay empty until API-backed data ships. */

export const navItems = [
  { label: "Problems", labelKey: "nav.problems" as const, href: "/problems" },
  { label: "Favorites", labelKey: "nav.favorites" as const, href: "/favorites" },
  { label: "Problem Sets", labelKey: "nav.problemsets" as const, href: "/problemsets" },
  { label: "Contests", labelKey: "nav.contests" as const, href: "/contests" },
  { label: "Status", labelKey: "nav.status" as const, href: "/status" },
  { label: "Ranking", labelKey: "nav.ranking" as const, href: "/ranking" },
  { label: "Discuss", labelKey: "nav.discuss" as const, href: "/discuss" },
];

export type MockProblem = {
  id: string;
  title: string;
  titleZh: string;
  difficulty: string;
  tags: string[];
  accepted: string;
  submissions: string;
  timeLimit: string;
  memoryLimit: string;
  statement: string;
  statementZh: string;
  input: string;
  output: string;
};

export const problems: MockProblem[] = [
  {
    id: "P1001",
    title: "A + B Warmup",
    titleZh: "A+B 热身",
    difficulty: "Easy",
    tags: ["io", "math"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given two integers a and b, output their sum. This is the first checkpoint for making sure input and output are wired correctly.",
    statementZh: "给定两个整数 a 和 b，输出它们的和。这是确认输入输出流程正常的第一道热身题。",
    input: "3 4\n",
    output: "7\n",
  },
  {
    id: "P1002",
    title: "Rin's Score Gate",
    titleZh: "Rin 的成绩门槛",
    difficulty: "Easy",
    tags: ["condition"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Read one integer score. Print PASS if it is at least 60, otherwise print FAIL.",
    statementZh: "读入一个整数成绩。如果成绩不小于 60，输出 PASS；否则输出 FAIL。",
    input: "72\n",
    output: "PASS\n",
  },
  {
    id: "P1003",
    title: "Cherry Blossom Counter",
    titleZh: "樱花计数器",
    difficulty: "Easy",
    tags: ["loop", "math"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given n, compute 1 + 2 + ... + n. n can be large enough that a loop or formula is needed instead of manual addition.",
    statementZh: "给定 n，计算 1 + 2 + ... + n。n 可能较大，请使用循环或公式完成计算。",
    input: "10\n",
    output: "55\n",
  },
  {
    id: "P1004",
    title: "Highest Training Score",
    titleZh: "最高训练分",
    difficulty: "Easy",
    tags: ["array"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given n scores, output the maximum score. The scores are integers and may appear in any order.",
    statementZh: "给定 n 个训练分数，输出其中的最大值。分数均为整数，顺序不固定。",
    input: "5\n17 42 9 88 63\n",
    output: "88\n",
  },
  {
    id: "P1005",
    title: "Palindrome Badge",
    titleZh: "回文徽章",
    difficulty: "Medium",
    tags: ["string"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given a lowercase string, determine whether it reads the same forward and backward. Print YES or NO.",
    statementZh: "给定一个小写字符串，判断它正着读和反着读是否完全相同。输出 YES 或 NO。",
    input: "level\n",
    output: "YES\n",
  },
  {
    id: "P1006",
    title: "Snack Prefix Sum",
    titleZh: "零食前缀和",
    difficulty: "Medium",
    tags: ["prefix", "array"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "There are n snack prices and q range queries. For each query l r, output the sum of prices from l to r, using 1-based indices.",
    statementZh: "有 n 个零食价格和 q 次区间询问。每次给出 l r，输出第 l 到第 r 个价格之和，下标从 1 开始。",
    input: "5 3\n2 4 6 8 10\n1 3\n2 5\n4 4\n",
    output: "12\n28\n8\n",
  },
  {
    id: "P1007",
    title: "Festival Queue",
    titleZh: "祭典排队",
    difficulty: "Medium",
    tags: ["greedy"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given n task durations and a time limit T, choose as many tasks as possible without exceeding T. You may reorder tasks.",
    statementZh: "给定 n 个任务耗时和总时间 T，请选择尽可能多的任务，要求总耗时不超过 T。任务可以重新排序。",
    input: "5 10\n6 2 3 8 1\n",
    output: "3\n",
  },
  {
    id: "P1008",
    title: "Tiny Graph Walk",
    titleZh: "小图漫步",
    difficulty: "Hard",
    tags: ["graph"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "2s",
    memoryLimit: "256MB",
    statement: "Given an undirected unweighted graph and two vertices s and t, output the length of the shortest path from s to t, or -1 if unreachable.",
    statementZh: "给定一张无向无权图以及两个点 s、t，输出从 s 到 t 的最短路长度；若不可达，输出 -1。",
    input: "5 4 1 5\n1 2\n2 3\n3 4\n4 5\n",
    output: "4\n",
  },
  {
    id: "P1009",
    title: "Top K Crystals",
    titleZh: "前 K 颗水晶",
    difficulty: "Hard",
    tags: ["heap", "array"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "2s",
    memoryLimit: "256MB",
    statement: "Given n crystal values, output the k largest values in descending order. If values are equal, keep all of them.",
    statementZh: "给定 n 颗水晶的价值，按从大到小输出其中最大的 k 个值。相同价值也需要保留。",
    input: "6 3\n5 1 9 9 2 7\n",
    output: "9 9 7\n",
  },
  {
    id: "P1010",
    title: "Rectangle Meeting Point",
    titleZh: "矩形相交点",
    difficulty: "Expert",
    tags: ["geometry", "condition"],
    accepted: "0%",
    submissions: "0",
    timeLimit: "1s",
    memoryLimit: "256MB",
    statement: "Given two axis-aligned rectangles, determine whether their areas overlap. Touching at an edge or a point is not considered overlap.",
    statementZh: "给定两个边与坐标轴平行的矩形，判断它们的面积是否有重叠。仅边界或顶点相接不算重叠。",
    input: "0 0 3 3\n2 2 5 5\n",
    output: "YES\n",
  },
];

export type MockContest = {
  id: string;
  title: string;
  titleZh: string;
  mode: string;
  time: string;
  timeZh: string;
  registered: number;
  status: string;
};

export const contests: MockContest[] = [];

export type MockContestProblem = { contestId: string; problemId: string; alias: string; points: number };

export const contestProblems: MockContestProblem[] = [];

export type MockContestStanding = { contestId: string; rank: number; user: string; solved: number; penalty: number; score: number };

export const contestStandings: MockContestStanding[] = [];

export type JudgementSeed = {
  when: string;
  whenZh: string;
  user: string;
  problem: string;
  lang: string;
  verdict: string;
  time: string;
  memory: string;
};

export const judgements: JudgementSeed[] = [];

export type MockRatingRow = { rank: number; name: string; rating: number; solved: number; motto: string };

export const ratingRows: MockRatingRow[] = [];

export type MockDiscussPost = {
  id: string;
  type: string;
  title: string;
  titleEn: string;
  author: string;
  problemId: string;
  createdAt: string;
  createdAtZh: string;
  replies: number;
  likes: number;
  excerpt: string;
  excerptEn: string;
  body: string;
};

export const discussPosts: MockDiscussPost[] = [];

export type MockUserProfile = {
  username: string;
  displayName: string;
  title: string;
  titleZh: string;
  rating: number;
  solved: number;
  followers: number;
  streak: number;
  signature: string;
  signatureZh: string;
  badges: string[];
  heatmap: number[];
  /** Optional demo flag for seeded profiles (session-based admin uses accountRole). */
  showAdminTag?: boolean;
};

export const userProfiles: MockUserProfile[] = [];
