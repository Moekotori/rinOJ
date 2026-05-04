"use client";

import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, Check, CheckCircle2, Clipboard, Code2, Gauge, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createSubmission, createSubmissionEventSocket, rememberLocalSubmission } from "@/lib/gateway";
import { defaultLanguageId, getSupportedLanguage, starterCodeForLanguage, supportedLanguages } from "@/lib/language-options";
import type { SubmissionEventResponse } from "@/lib/types";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";
import { StatusPill } from "./status-pill";

type StreamState = "idle" | "connecting" | "open" | "closed" | "error";
type Monaco = Parameters<OnMount>[1];
type MonacoEditor = Parameters<OnMount>[0];
type MonacoPosition = { lineNumber: number; column: number };
type MonacoModelWithWords = {
  getWordUntilPosition: (position: MonacoPosition) => {
    startColumn: number;
    endColumn: number;
  };
  getLineContent: (lineNumber: number) => string;
};
type MonacoRange = {
  startLineNumber: number;
  endLineNumber: number;
  startColumn: number;
  endColumn: number;
};
type LocalVerdict = {
  status: "wrong_answer" | "compile_error" | "system_error";
  message: string;
  score: number;
};

let completionDisposables: { dispose: () => void }[] = [];
let conservativeCompletionEnabled = false;

function formatMemory(bytes: number) {
  if (bytes <= 0) {
    return "-";
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MiB`;
}

function verdictTone(status: string) {
  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "wrong_answer" || status === "runtime_error" || status === "compile_error" || status === "system_error") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (status === "time_limit_exceeded" || status === "memory_limit_exceeded") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-sky-200 bg-sky-50 text-sky-800";
}

function isFailedVerdict(status: string) {
  return !["accepted", "queued", "compiling", "running", "ready"].includes(status);
}

function formatCaseLabel(testCaseIndex: number) {
  return testCaseIndex > 0 ? `测试点 #${testCaseIndex}` : "编译阶段";
}

function hasRunnableEntry(languageId: string, normalizedSource: string) {
  if (["python3", "pypy3", "nodejs20", "ruby33", "php83"].includes(languageId)) {
    return normalizedSource.trim().length >= 8;
  }
  if (languageId === "java" || languageId === "java17") {
    return normalizedSource.includes("class main") && normalizedSource.includes("main(");
  }
  if (languageId === "kotlin") {
    return normalizedSource.includes("fun main");
  }
  return normalizedSource.includes("main");
}

function looksLikeInputDrivenAddition(normalizedSource: string) {
  const inputMarkers = [
    "cin",
    "scanf",
    "fmt.scan",
    "fun main",
    "read_to_string",
    "sys.stdin",
    "readfilesync",
    "bufferedreader",
    "readline",
    "stdin.read",
    "stream_get_contents",
    "fastscanner",
  ];

  return normalizedSource.includes("+") && inputMarkers.some((marker) => normalizedSource.includes(marker));
}

function judgeLocally(problemId: string, languageId: string, sourceCode: string): LocalVerdict {
  const normalizedSource = sourceCode.toLowerCase().replace(/\s+/g, " ");

  if (!hasRunnableEntry(languageId, normalizedSource)) {
    return {
      status: "compile_error",
      message: "No runnable entry point was found for the selected language.",
      score: 0,
    };
  }

  if (normalizedSource.includes("rin oj")) {
    return {
      status: "wrong_answer",
      message: "Starter template still prints the placeholder output.",
      score: 0,
    };
  }

  if (problemId === "P1001" && looksLikeInputDrivenAddition(normalizedSource)) {
    return {
      status: "system_error",
      message: "Local preview refuses to award AC. Start gateway + judge-dispatcher + go-judge for real judging.",
      score: 0,
    };
  }

  return {
    status: "wrong_answer",
    message: "Local preview cannot verify this solution. Real judge is required for AC.",
    score: 0,
  };
}

function buildLocalJudgeEvents(submissionId: string, problemId: string, languageId: string, sourceCode: string): SubmissionEventResponse[] {
  const verdict = judgeLocally(problemId, languageId, sourceCode);
  const shouldRunSample = verdict.status !== "compile_error";

  return [
    {
      submissionId,
      status: "queued",
      testCaseIndex: -1,
      message: `Queued for ${problemId}`,
      timeMs: 0,
      memoryBytes: 0,
      final: false,
    },
    {
      submissionId,
      status: "compiling",
      testCaseIndex: -1,
      message: verdict.status === "compile_error" ? verdict.message : "Compiled with local preview profile",
      timeMs: 42,
      memoryBytes: 18 * 1024 * 1024,
      final: verdict.status === "compile_error",
    },
    ...(shouldRunSample
      ? [
          {
            submissionId,
            status: "running",
            testCaseIndex: 1,
            message: "Local preview finished without AC authority",
            timeMs: 8,
            memoryBytes: 6 * 1024 * 1024,
            final: false,
          },
          {
            submissionId,
            status: verdict.status,
            testCaseIndex: -1,
            message: `${verdict.message} Score: ${verdict.score}`,
            timeMs: 12,
            memoryBytes: 7 * 1024 * 1024,
            final: true,
          },
        ]
      : []),
  ] satisfies SubmissionEventResponse[];
}

function basicCompletion(label: string, detail: string, monaco: Monaco, range: MonacoRange, kind = monaco.languages.CompletionItemKind.Keyword, sortText = `20-${label}`) {
  return {
    label,
    filterText: label,
    kind,
    detail,
    documentation: detail,
    insertText: label,
    range,
    sortText,
  };
}

function completionRange(model: MonacoModelWithWords, position: MonacoPosition) {
  const word = model.getWordUntilPosition(position);
  return {
    startLineNumber: position.lineNumber,
    endLineNumber: position.lineNumber,
    startColumn: word.startColumn,
    endColumn: word.endColumn,
  };
}

function shouldOfferConservativeCompletion(model: MonacoModelWithWords, position: MonacoPosition, range: MonacoRange) {
  if (!conservativeCompletionEnabled) {
    return false;
  }

  const lineBeforeCursor = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  const currentWord = lineBeforeCursor.slice(Math.max(0, range.startColumn - 1)).trim();
  const lastCharacter = lineBeforeCursor.at(-1);

  return currentWord.length >= 2 || lastCharacter === "." || lastCharacter === ":" || lastCharacter === "#" || lastCharacter === "<";
}

function registerConservativeCompletions(monaco: Monaco) {
  if (completionDisposables.length > 0) {
    return;
  }

  const cppKeywords = [
    "auto", "bool", "break", "case", "class", "const", "continue", "double", "else", "for", "if", "int", "long",
    "namespace", "private", "public", "return", "struct", "template", "typename", "using", "void", "while",
  ];
  const cppTypes = [
    "array", "bitset", "deque", "map", "multiset", "pair", "priority_queue", "queue", "set", "stack", "string",
    "unordered_map", "unordered_set", "vector",
  ];
  const cppFunctions = [
    "abs", "accumulate", "binary_search", "cin", "cout", "emplace_back", "find", "gcd", "iota", "lower_bound",
    "make_pair", "max", "min", "reverse", "sort", "sqrt", "swap", "upper_bound",
  ];

  const basicsByLanguage = {
    cpp: [
      ...cppKeywords.map((label) => [label, "C++ keyword", monaco.languages.CompletionItemKind.Keyword] as const),
      ...cppTypes.map((label) => [label, "C++ STL container/type", monaco.languages.CompletionItemKind.Class] as const),
      ...cppFunctions.map((label) => [label, "C++ standard library function", monaco.languages.CompletionItemKind.Function] as const),
      ["include", "C++ preprocessor include", monaco.languages.CompletionItemKind.Module] as const,
      ["std", "C++ standard namespace", monaco.languages.CompletionItemKind.Module] as const,
    ],
    c: ["int", "long", "double", "char", "struct", "typedef", "return", "for", "while", "if", "else", "scanf", "printf", "qsort", "memset"].map((label) => [label, "C keyword or standard library helper", monaco.languages.CompletionItemKind.Keyword] as const),
    python: ["import", "def", "class", "return", "for", "while", "if", "elif", "else", "deque", "defaultdict", "Counter", "heapq", "bisect_left"].map((label) => [label, "Python keyword or library symbol", monaco.languages.CompletionItemKind.Function] as const),
    java: ["public", "class", "static", "void", "int", "long", "String", "ArrayList", "HashMap", "PriorityQueue", "Arrays", "StringBuilder"].map((label) => [label, "Java keyword or library symbol", monaco.languages.CompletionItemKind.Class] as const),
    go: ["func", "package", "import", "var", "const", "for", "range", "fmt", "bufio", "sort"].map((label) => [label, "Go keyword or library symbol", monaco.languages.CompletionItemKind.Function] as const),
    rust: ["fn", "let", "mut", "for", "while", "if", "match", "Vec", "VecDeque", "BinaryHeap", "HashMap", "split_whitespace"].map((label) => [label, "Rust keyword or library helper", monaco.languages.CompletionItemKind.Class] as const),
    javascript: ["const", "let", "function", "return", "for", "while", "if", "else", "Number", "BigInt", "Map", "Set"].map((label) => [label, "JavaScript keyword or library symbol", monaco.languages.CompletionItemKind.Function] as const),
    kotlin: ["fun", "val", "var", "if", "else", "for", "while", "return", "Long", "Int", "List", "MutableList"].map((label) => [label, "Kotlin keyword or library symbol", monaco.languages.CompletionItemKind.Keyword] as const),
    ruby: ["def", "end", "if", "else", "elsif", "while", "do", "return", "Array", "Hash", "STDIN"].map((label) => [label, "Ruby keyword or library symbol", monaco.languages.CompletionItemKind.Keyword] as const),
    php: ["function", "return", "if", "else", "foreach", "while", "array", "trim", "explode", "STDIN"].map((label) => [label, "PHP keyword or library symbol", monaco.languages.CompletionItemKind.Keyword] as const),
  } satisfies Record<string, readonly (readonly [string, string, number])[]>;

  const completionLanguages = Object.keys(basicsByLanguage) as Array<keyof typeof basicsByLanguage>;
  completionDisposables = completionLanguages.map((language) =>
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: [".", ":", "<", "#"],
      provideCompletionItems(model: MonacoModelWithWords, position: MonacoPosition) {
        const range = completionRange(model, position);

        if (!shouldOfferConservativeCompletion(model, position, range)) {
          return { suggestions: [] };
        }

        return {
          suggestions: basicsByLanguage[language].map(([label, detail, kind], index) =>
            basicCompletion(label, detail, monaco, range, kind, `20-${index}-${label}`),
          ),
        };
      },
    }),
  );
}

const handleEditorMount: OnMount = (editor, monaco) => {
  monaco.editor.defineTheme("rin-code-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "1D4ED8", fontStyle: "bold" },
      { token: "number", foreground: "047857" },
      { token: "string", foreground: "B45309" },
      { token: "comment", foreground: "64748B", fontStyle: "italic" },
      { token: "type", foreground: "2563EB" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#0F172A",
      "editorLineNumber.foreground": "#94A3B8",
      "editorLineNumber.activeForeground": "#334155",
      "editorCursor.foreground": "#1D4ED8",
      "editor.selectionBackground": "#BFDBFE88",
      "editor.lineHighlightBackground": "#F8FAFC",
      "editorIndentGuide.background1": "#E2E8F0",
      "editorIndentGuide.activeBackground1": "#94A3B8",
      "editorSuggestWidget.background": "#FFFFFF",
      "editorSuggestWidget.border": "#CBD5E1",
      "editorSuggestWidget.selectedBackground": "#EFF6FF",
    },
  });

  registerConservativeCompletions(monaco);
  monaco.editor.setTheme("rin-code-light");
  // Do not focus Monaco on mount. Auto focus makes browsers scroll the page
  // down to the workspace as soon as the home page opens, which feels like an
  // unexpected page jump. The editor will focus naturally when the user clicks it.
};

export function SubmissionPanel({ initialProblemId = "P1001" }: Readonly<{ initialProblemId?: string }>) {
  const actorId = useSessionStore((state) => state.actorId);
  const { t } = useTranslation();
  const editorRef = useRef<MonacoEditor | null>(null);
  const [problemId, setProblemId] = useState(initialProblemId);
  const [languageId, setLanguageId] = useState(defaultLanguageId);
  const [sourceCode, setSourceCode] = useState("");
  const [events, setEvents] = useState<SubmissionEventResponse[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [copiedSource, setCopiedSource] = useState(false);
  const [fastIOFeedback, setFastIOFeedback] = useState<"idle" | "inserted" | "enabled">("idle");
  const [completionEnabled, setCompletionEnabled] = useState(false);
  const activeLanguage = getSupportedLanguage(languageId);

  const handleLanguageChange = (nextLanguageId: string) => {
    setLanguageId(nextLanguageId);
  };

  const submitMutation = useMutation({
    mutationFn: () => createSubmission({ problemId, languageId, sourceCode }, { actorId }),
    onMutate: () => {
      setEvents([]);
      setStreamState("idle");
    },
  });

  const submissionId = submitMutation.data?.submissionId;
  const latestEvent = events.at(-1);
  const visibleStatus = latestEvent?.status ?? submitMutation.data?.status ?? "ready";
  const finalEvent = events.find((event) => event.final);
  const usingLocalJudge = submissionId?.startsWith("local_") ?? false;

  useEffect(() => {
    conservativeCompletionEnabled = completionEnabled;
  }, [completionEnabled]);

  const toggleCompletion = () => {
    setCompletionEnabled((enabled) => {
      const nextEnabled = !enabled;
      conservativeCompletionEnabled = nextEnabled;

      if (nextEnabled) {
        window.requestAnimationFrame(() => {
          editorRef.current?.getAction("editor.action.triggerSuggest")?.run();
        });
      }

      return nextEnabled;
    });
  };

  const resetStarterCode = () => {
    setSourceCode(starterCodeForLanguage(languageId));
    setEvents([]);
    setStreamState("idle");
  };

  const copySourceCode = async () => {
    await navigator.clipboard.writeText(sourceCode);
    setCopiedSource(true);
    window.setTimeout(() => setCopiedSource(false), 1200);
  };

  const insertFastIO = () => {
    if (!languageId.startsWith("cpp")) {
      return;
    }

    if (sourceCode.includes("ios::sync_with_stdio(false)")) {
      setFastIOFeedback("enabled");
      window.setTimeout(() => setFastIOFeedback("idle"), 1200);
      return;
    }

    const fastIOLines = "  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n\n";
    const trimmedSource = sourceCode.trim();
    let nextSource: string;

    if (!trimmedSource) {
      nextSource = `#include <bits/stdc++.h>
using namespace std;

int main() {
${fastIOLines}  return 0;
}
`;
    } else {
      const mainPattern = /(int\s+main\s*\([^)]*\)\s*\{\s*)/;
      if (mainPattern.test(sourceCode)) {
        // Keep the helper near the start of main so beginners can see why it is there.
        nextSource = sourceCode.replace(mainPattern, `$1\n${fastIOLines}`);
      } else {
        nextSource = `${sourceCode.replace(/\s*$/, "")}

int main() {
${fastIOLines}  return 0;
}
`;
      }
    }

    setSourceCode(nextSource);
    setFastIOFeedback("inserted");
    window.setTimeout(() => setFastIOFeedback("idle"), 1200);
  };

  useEffect(() => {
    if (!submissionId) {
      return;
    }

    setEvents([]);
    setStreamState("connecting");

    if (submissionId.startsWith("local_")) {
      setStreamState("open");
      const localEvents = buildLocalJudgeEvents(submissionId, problemId, languageId, sourceCode);
      const timers = localEvents.map((event, index) =>
        window.setTimeout(() => {
          setEvents((currentEvents) => [...currentEvents, event]);
          rememberLocalSubmission({
            submissionId,
            actorId,
            problemId,
            languageId,
            status: event.status,
            score: event.status === "accepted" ? 100 : 0,
            timeMs: event.timeMs,
            memoryBytes: event.memoryBytes,
            createdAtUnix: submitMutation.data?.createdAtUnix ?? Math.floor(Date.now() / 1000),
          });
          if (event.final) {
            setStreamState("closed");
          }
        }, 450 * (index + 1)),
      );

      return () => {
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    // The gateway owns fan-out, so the browser only needs one lightweight socket
    // per active submission. The cleanup below prevents stale sockets after retry.
    const socket = createSubmissionEventSocket(submissionId);

    socket.addEventListener("open", () => {
      setStreamState("open");
    });

    socket.addEventListener("message", (message) => {
      try {
        const event = JSON.parse(message.data) as SubmissionEventResponse;
        setEvents((currentEvents) => [...currentEvents, event]);
        rememberLocalSubmission({
          submissionId,
          actorId,
          problemId,
          languageId,
          status: event.status,
          score: event.status === "accepted" ? 100 : 0,
          timeMs: event.timeMs,
          memoryBytes: event.memoryBytes,
          createdAtUnix: submitMutation.data?.createdAtUnix ?? Math.floor(Date.now() / 1000),
        });

        if (event.final) {
          socket.close();
        }
      } catch {
        setStreamState("error");
      }
    });

    socket.addEventListener("close", () => {
      setStreamState((current) => (current === "error" ? current : "closed"));
    });

    socket.addEventListener("error", () => {
      setStreamState("error");
    });

    return () => {
      socket.close();
    };
  }, [actorId, languageId, problemId, sourceCode, submissionId, submitMutation.data?.createdAtUnix]);

  return (
    <section className="rin-workbench-panel rounded-md p-5 text-base">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-600">
            <span className="rin-icon-tile">
              <Code2 className="h-4 w-4" />
            </span>
            {t("submission.name")}
          </div>
        </div>
        <StatusPill tone={visibleStatus === "accepted" ? "good" : visibleStatus === "queued" || visibleStatus === "running" ? "warn" : "neutral"}>
          {visibleStatus}
        </StatusPill>
      </div>

      <JudgeProgress status={visibleStatus} />

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)]">
        <label className="grid gap-1 text-base font-semibold">
          {t("submission.problemId")}
          <input
            className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={problemId}
            onChange={(event) => setProblemId(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-base font-semibold">
          {t("submission.languageId")}
          <select
            className="w-full min-w-0 max-w-full cursor-pointer truncate rounded-md border border-slate-300 bg-white px-4 py-3 text-lg outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            value={languageId}
            onChange={(event) => handleLanguageChange(event.target.value)}
          >
            {supportedLanguages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.shortLabel}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rin-code-editor mt-5 overflow-hidden rounded-md border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="text-sm font-bold text-slate-500">{activeLanguage.label}</div>
          <div className="flex flex-wrap gap-2">
            <button
              aria-pressed={completionEnabled}
              className={`rin-soft-button px-3 py-2 text-sm font-bold ${completionEnabled ? "border-blue-300 bg-blue-50 text-blue-800" : ""}`}
              title={completionEnabled ? "Disable code completion" : "Enable code completion"}
              type="button"
              onClick={toggleCompletion}
            >
              <Code2 className="h-4 w-4" />
              {completionEnabled ? "Completion On" : "Completion Off"}
            </button>
            <button className="rin-soft-button px-3 py-2 text-sm font-bold" type="button" onClick={copySourceCode}>
              {copiedSource ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
              {copiedSource ? "已复制" : "复制代码"}
            </button>
            {languageId.startsWith("cpp") ? (
              <button className="rin-soft-button px-3 py-2 text-sm font-bold" type="button" onClick={insertFastIO}>
                {fastIOFeedback === "idle" ? <Gauge className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {fastIOFeedback === "enabled" ? "已启用" : fastIOFeedback === "inserted" ? "已插入" : "Fast I/O"}
              </button>
            ) : null}
            <button className="rin-soft-button px-3 py-2 text-sm font-bold" type="button" onClick={resetStarterCode}>
              <RotateCcw className="h-4 w-4" />
              重置模板
            </button>
          </div>
        </div>
        <Editor
          height="clamp(560px, 62vh, 860px)"
          language={activeLanguage.monacoLanguage}
          path={`main.${activeLanguage.id}`}
          theme="rin-code-light"
          value={sourceCode}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            handleEditorMount(editor, monaco);
          }}
          onChange={(value) => setSourceCode(value ?? "")}
          options={{
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            bracketPairColorization: { enabled: true },
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            fixedOverflowWidgets: true,
            fontFamily:
              '"Cascadia Mono", "Maple Mono NF CN", "Maple Mono", "Sarasa Mono SC", "LXGW WenKai Mono", "JetBrains Mono", "Fira Code", Consolas, monospace',
            fontLigatures: true,
            fontSize: 18,
            fontWeight: "500",
            letterSpacing: 0.2,
            lineHeight: 30,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: { top: 14, bottom: 14 },
            parameterHints: { enabled: false },
            quickSuggestions: { other: completionEnabled, comments: false, strings: false },
            renderLineHighlight: "all",
            renderWhitespace: "selection",
            roundedSelection: true,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            scrollBeyondLastLine: false,
            snippetSuggestions: "none",
            smoothScrolling: true,
            suggest: {
              localityBonus: false,
              matchOnWordStartOnly: true,
              preview: false,
              selectionMode: "never",
              showSnippets: false,
              showWords: false,
            },
            suggestOnTriggerCharacters: completionEnabled,
            tabCompletion: "off",
            wordBasedSuggestions: "off",
            wordWrap: "on",
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-3 text-lg font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          type="button"
        >
          <Play className="h-5 w-5" />
          {submitMutation.isPending ? t("submission.submitting") : t("submission.submit")}
        </button>
        <span className="inline-flex items-center gap-2 text-base font-semibold text-slate-500">
          <Activity className="h-5 w-5" />
          {t("submission.stream")}: {streamState}
        </span>
      </div>

      {usingLocalJudge ? (
        <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-bold">{t("submission.localJudge")}</div>
          <div className="mt-1">{t("submission.localJudgeHelp")}</div>
        </div>
      ) : null}

      {submitMutation.data ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-base font-semibold text-amber-900">
          {t("submission.queued")}: {submitMutation.data.submissionId}
        </motion.div>
      ) : null}

      {finalEvent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-md border p-4 shadow-sm ${verdictTone(finalEvent.status)}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide opacity-75">{isFailedVerdict(finalEvent.status) ? "失败位置" : "评测结果"}</div>
              <div className="mt-1 text-lg font-black">
                {isFailedVerdict(finalEvent.status) ? `${formatCaseLabel(finalEvent.testCaseIndex)} 未通过` : `${formatCaseLabel(finalEvent.testCaseIndex)} 通过`}
              </div>
            </div>
            <div className="rounded-lg bg-white/70 px-3 py-2 text-sm font-bold">
              {finalEvent.status} · {finalEvent.timeMs} ms · {formatMemory(finalEvent.memoryBytes)}
            </div>
          </div>
          {finalEvent.message ? <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white/70 p-3 font-mono text-xs leading-5">{finalEvent.message}</pre> : null}
        </motion.div>
      ) : null}

      <div className="rin-problem-section mt-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">{t("submission.timeline")}</h3>
          <span className="text-sm font-medium text-slate-500">
            {events.length} {t("submission.events")}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {events.length === 0 ? (
            <p className="text-base text-slate-500">{t("submission.emptyTimeline")}</p>
          ) : (
            events.map((event, index) => (
              <div key={`${event.status}-${event.testCaseIndex}-${index}`} className={`grid gap-1 rounded-md border px-3 py-2 text-sm ${event.final ? verdictTone(event.status) : "border-slate-200 bg-slate-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    #{index + 1} {event.status}
                    {event.final && isFailedVerdict(event.status) ? ` / 停在 ${formatCaseLabel(event.testCaseIndex)}` : ""}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {formatCaseLabel(event.testCaseIndex)} / {event.timeMs} ms / {formatMemory(event.memoryBytes)}
                  </span>
                </div>
                <p className="text-slate-600">{event.message || (event.final ? t("submission.finalReceived") : t("submission.eventReceived"))}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {submitMutation.error ? <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{submitMutation.error.message}</div> : null}
    </section>
  );
}

function JudgeProgress({ status }: Readonly<{ status: string }>) {
  const idle = status === "ready" || status === "idle";
  const failed = isFailedVerdict(status);
  const accepted = status === "accepted";
  const failureStepByStatus: Record<string, number> = {
    compile_error: 1,
    runtime_error: 2,
    time_limit_exceeded: 2,
    memory_limit_exceeded: 2,
    wrong_answer: 2,
    system_error: 3,
  };
  const activeStep = idle ? -1 : status === "queued" ? 0 : status === "compiling" ? 1 : status === "running" ? 2 : failed ? (failureStepByStatus[status] ?? 3) : 3;
  const steps = [
    { label: "队列", detail: "Queue" },
    { label: "编译", detail: "Compile" },
    { label: "运行", detail: "Run tests" },
    { label: "结果", detail: "Verdict" },
  ];

  return (
    <div className="mt-3 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const done = !idle && (accepted || index < activeStep);
        const current = !idle && index === activeStep && !accepted && !failed;
        const error = failed && index === activeStep;
        return (
          <div
            key={step.label}
            className={`rounded-md border px-3 py-2 ${
              error ? "border-rose-200 bg-rose-50 text-rose-800" : done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : current ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-500"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-black">
              {error ? <XCircle className="h-4 w-4" /> : done ? <CheckCircle2 className="h-4 w-4" /> : current ? <Loader2 className="h-4 w-4 animate-spin" /> : <span className="h-4 w-4 rounded-full border border-current opacity-45" />}
              {step.label}
            </div>
            <div className="mt-1 text-xs font-semibold opacity-75">{step.detail}</div>
          </div>
        );
      })}
    </div>
  );
}
