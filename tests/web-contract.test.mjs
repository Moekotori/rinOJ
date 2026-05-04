import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();

function readRequired(path) {
  const fullPath = join(root, path);
  assert.ok(existsSync(fullPath), `${path} should exist`);
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(file, content, required) {
  for (const token of required) {
    assert.ok(content.includes(token), `${file} should include ${token}`);
  }
}

const webPackage = readRequired("apps/web/package.json");
assertIncludes("apps/web/package.json", webPackage, [
  "next",
  "react",
  "tailwindcss",
  "@tanstack/react-query",
  "zustand",
  "framer-motion",
  "@monaco-editor/react",
  "next-intl",
  "lucide-react",
]);

const page = readRequired("apps/web/app/page.tsx");
assertIncludes("apps/web/app/page.tsx", page, [
  "ProblemIntakePanel",
  "SubmissionPanel",
  "OJShell",
  "useRouter",
  "openRandomProblem",
  "router.push(`/problems/${randomProblem.id}`)",
  "rin-hero-strip",
  "home.heroTitle",
  "home.upcomingContests",
  "home.recentJudgements",
  "home.ratingBoard",
]);

const problemsPage = readRequired("apps/web/app/problems/page.tsx");
assertIncludes("apps/web/app/problems/page.tsx", problemsPage, [
  "OJShell",
  "ProblemTable",
  "problems.allProblems",
  "filteredProblems",
  "problems.difficultyAll",
]);

const problemSetsPage = readRequired("apps/web/app/problemsets/page.tsx");
assertIncludes("apps/web/app/problemsets/page.tsx", problemSetsPage, [
  "ProblemSetsPage",
  "rin-public-problemsets",
  "createProblemSet",
  "writeProblemSets",
  "parseProblemIds",
  "Public Problem Sets",
  "发布公开题单",
  "/problems/${problemId}",
  "localStorage",
]);

const problemTable = readRequired("apps/web/components/problem-table.tsx");
assertIncludes("apps/web/components/problem-table.tsx", problemTable, [
  "pageSize",
  "pageItems",
  "totalPages",
  "setPage",
  "ChevronLeft",
  "ChevronRight",
  "disabled={safePage <= 1}",
  "disabled={safePage >= totalPages}",
]);

const contestsPage = readRequired("apps/web/app/contests/page.tsx");
assertIncludes("apps/web/app/contests/page.tsx", contestsPage, [
  "OJShell",
  "contests.title",
  "contests.register",
  "contests.open",
  "contests",
]);

const contestDetailPage = readRequired("apps/web/app/contests/[contestId]/page.tsx");
assertIncludes("apps/web/app/contests/[contestId]/page.tsx", contestDetailPage, [
  "ContestDetailPage",
  "contest.problemList",
  "contest.standings",
  "contestStandings",
]);

const rankingPage = readRequired("apps/web/app/ranking/page.tsx");
assertIncludes("apps/web/app/ranking/page.tsx", rankingPage, [
  "OJShell",
  "ranking.title",
  "ratingRows",
]);

const registerPage = readRequired("apps/web/app/register/page.tsx");
assertIncludes("apps/web/app/register/page.tsx", registerPage, [
  "RegisterPage",
  "registerUser",
  "setAuthSession",
  "window.location.assign(\"/problems\")",
  "Create account",
  "PostgreSQL",
]);

const loginPage = readRequired("apps/web/app/login/page.tsx");
assertIncludes("apps/web/app/login/page.tsx", loginPage, [
  "LoginPage",
  "loginUser",
  "setAuthSession",
  "useEffect",
  "window.location.assign(\"/problems\")",
  "Sign in",
  "/register",
]);

const discussPage = readRequired("apps/web/app/discuss/page.tsx");
assertIncludes("apps/web/app/discuss/page.tsx", discussPage, [
  "OJShell",
  "discussPosts",
  "renderMarkdownPreview",
  "publishPost",
  "rin-discuss-posts",
  "localStorage",
  "Published. It is now at the top of the board.",
  "Markdown / LaTeX",
  "/problems/${selectedProblemId}",
  "dangerouslySetInnerHTML",
]);

const problemDetailPage = readRequired("apps/web/app/problems/[problemId]/page.tsx");
assertIncludes("apps/web/app/problems/[problemId]/page.tsx", problemDetailPage, [
  "ProblemDetailPage",
  "problem.statement",
  "problem.sampleInput",
  "estimateAcceptedCount",
  "parseCompactCount",
  "problem.submissions",
  "input-output",
  "copySample",
  "navigator.clipboard.writeText",
  "rin-soft-button",
  "MessagesSquare",
  "ListChecks",
  "problem.recentSubmissions",
  "problem.relatedContest",
  "SubmissionPanel",
]);

const userProfilePage = readRequired("apps/web/app/users/[username]/page.tsx");
assertIncludes("apps/web/app/users/[username]/page.tsx", userProfilePage, [
  "UserProfilePage",
  "ProfileAvatar",
  "rin-profile-avatar",
  "setSessionAvatarUrl",
  "FileReader",
  "profile.heatmap",
  "heatmapDateRange",
  "heatmapMonthLabels",
  "weekdayLabels",
  "MarkdownProfileBio",
  "renderProfileMarkdown",
  "localStorage",
  "rin-soft-button",
  "UserPlus",
  "aria-label",
  "profile.recentSubmissions",
  "userProfiles",
  "createDefaultProfile",
  "还没有个人简介",
  "New Solver",
]);

const statusPage = readRequired("apps/web/app/status/page.tsx");
assertIncludes("apps/web/app/status/page.tsx", statusPage, [
  "status.recentSubmissions",
  "VerdictBadge",
  "status.refresh",
  "filteredSubmissions",
  "listSubmissions",
  "status.allVerdicts",
]);

const verdictBadge = readRequired("apps/web/components/verdict-badge.tsx");
assertIncludes("apps/web/components/verdict-badge.tsx", verdictBadge, [
  "AlertTriangle",
  "Clock3",
  "XCircle",
  "border-emerald-100",
]);

const shell = readRequired("apps/web/components/oj-shell.tsx");
assertIncludes("apps/web/components/oj-shell.tsx", shell, [
  "RinMascot",
  "motion.header",
  "LanguageSwitcher",
  "rin-petal-field",
  "shell.tagline",
  "/users/${displayName}",
  "/login",
  "/register",
  "aria-current",
  "usePathname",
  "isAuthenticated",
  "displayName",
  "avatarUrl",
  "rounded-full",
  "Primary navigation",
  "navItems",
]);

const sessionStore = readRequired("apps/web/lib/use-session-store.ts");
assertIncludes("apps/web/lib/use-session-store.ts", sessionStore, [
  "setAuthSession",
  "rin-session",
  "LooseAuthSessionResponse",
  "access_token",
  "accessToken",
  "refreshToken",
  "setAvatarUrl",
  "avatarUrl",
  "isAuthenticated",
  "localStorage",
]);

const animatedSurface = readRequired("apps/web/components/animated-surface.tsx");
assertIncludes("apps/web/components/animated-surface.tsx", animatedSurface, [
  "framer-motion",
  "AnimatedSurface",
  "filter",
  "blur",
]);

const globals = readRequired("apps/web/app/globals.css");
assertIncludes("apps/web/app/globals.css", globals, [
  "rin-petal",
  "rin-card",
  "rin-workbench-panel",
  "rin-hero-strip",
  "::-webkit-scrollbar",
  "prefers-reduced-motion",
]);

const i18n = readRequired("apps/web/lib/i18n.ts");
assertIncludes("apps/web/lib/i18n.ts", i18n, [
  "zh-CN",
  "en-US",
  "nav.problems",
  "nav.problemsets",
  "shell.tagline",
  "submission.submit",
  "contests.title",
  "contest.problemList",
  "ranking.title",
  "profile.heatmap",
  "profile.heatmapLess",
]);

const localeStore = readRequired("apps/web/lib/use-locale-store.ts");
assertIncludes("apps/web/lib/use-locale-store.ts", localeStore, [
  "useLocaleStore",
  "setLocale",
]);

const mockOJData = readRequired("apps/web/lib/mock-oj-data.ts");
assertIncludes("apps/web/lib/mock-oj-data.ts", mockOJData, [
  "/problems",
  "/problemsets",
  "/contests",
  "/status",
  "/ranking",
  "/discuss",
  "judgements",
  "contestProblems",
  "contestStandings",
  "userProfiles",
  "ratingRows",
  "discussPosts",
]);

const layout = readRequired("apps/web/app/layout.tsx");
assertIncludes("apps/web/app/layout.tsx", layout, [
  "NextIntlClientProvider",
  "Providers",
  "globals.css",
]);

const i18nRequest = readRequired("apps/web/i18n/request.ts");
assertIncludes("apps/web/i18n/request.ts", i18nRequest, ["getRequestConfig", "zh-CN"]);

const nextConfig = readRequired("apps/web/next.config.ts");
assertIncludes("apps/web/next.config.ts", nextConfig, ["output", "standalone"]);

const gateway = readRequired("apps/web/lib/gateway.ts");
assertIncludes("apps/web/lib/gateway.ts", gateway, [
  "NEXT_PUBLIC_RIN_MOCK_SUBMISSIONS",
  "local_",
  "createProblemIntakeUpload",
  "registerUser",
  "loginUser",
  "validateProblemImport",
  "teacherQuickUpload",
  "studentDraftSubmission",
  "createSubmission",
  "createSubmissionEventSocket",
  "submissionEventURL",
]);

const intake = readRequired("apps/web/components/problem-intake-panel.tsx");
assertIncludes("apps/web/components/problem-intake-panel.tsx", intake, [
  "useMutation",
  "intake.teacher",
  "intake.student",
  "intake.preview",
]);

const submission = readRequired("apps/web/components/submission-panel.tsx");
assertIncludes("apps/web/components/submission-panel.tsx", submission, [
  "@monaco-editor/react",
  "judgeLocally",
  "buildLocalJudgeEvents",
  "wrong_answer",
  "Local preview refuses to award AC",
  "Starter template still prints the placeholder output",
  "submission.localJudge",
  "createSubmission",
  "createSubmissionEventSocket",
  "submission.timeline",
  "JudgeProgress",
  "failureStepByStatus",
  "status === \"ready\"",
  "Loader2",
  "copySourceCode",
  "resetStarterCode",
  "insertFastIO",
  "navigator.clipboard.writeText",
  "languageId",
  "supportedLanguages",
]);

const languageOptions = readRequired("apps/web/lib/language-options.ts");
assertIncludes("apps/web/lib/language-options.ts", languageOptions, [
  "cpp17",
  "cpp20",
  "cpp23",
  "c11",
  "java",
  "kotlin",
  "golang",
  "nodejs20",
  "pypy3",
  "php83",
  "ruby33",
]);

const problemTags = readRequired("apps/web/lib/problem-tags.ts");
assertIncludes("apps/web/lib/problem-tags.ts", problemTags, [
  "problemTagLabels",
  "formatProblemTag",
  "searchableProblemTagText",
  "数学",
  "Graph",
]);

const rinUI = readRequired("packages/rin-ui/src/index.ts");
assertIncludes("packages/rin-ui/src/index.ts", rinUI, [
  "rinTokens",
  "RinMascot",
]);

const messages = readRequired("apps/web/messages/zh-CN.json");
assertIncludes("apps/web/messages/zh-CN.json", messages, [
  "problemIntake",
  "submission",
]);

console.log("Web contract passed.");
