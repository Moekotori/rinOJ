"use client";

import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, Code2, Loader2, Play, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { createSubmission, createSubmissionEventSocket } from "@/lib/gateway";
import { defaultLanguageId, getSupportedLanguage, starterCodeForLanguage, supportedLanguages } from "@/lib/language-options";
import type { SubmissionEventResponse } from "@/lib/types";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";
import { StatusPill } from "./status-pill";

type StreamState = "idle" | "connecting" | "open" | "closed" | "error";
type Monaco = Parameters<OnMount>[1];
type MonacoPosition = { lineNumber: number; column: number };
type MonacoModelWithWords = {
  getWordUntilPosition: (position: MonacoPosition) => {
    startColumn: number;
    endColumn: number;
  };
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

let cppCompletionDisposable: { dispose: () => void } | null = null;

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

function basicCompletion(label: string, detail: string, monaco: Monaco, range: MonacoRange, kind = monaco.languages.CompletionItemKind.Keyword) {
  return {
    label,
    filterText: label,
    kind,
    detail,
    documentation: detail,
    insertText: label,
    range,
    sortText: label,
  };
}

function snippetCompletion(label: string, detail: string, insertText: string, monaco: Monaco, range: MonacoRange) {
  return {
    label,
    filterText: label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    detail,
    documentation: detail,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    range,
    sortText: `zz-${label}`,
  };
}

function registerCppCompletions(monaco: Monaco) {
  if (cppCompletionDisposable) {
    return;
  }

  const keywords = [
    "alignas",
    "auto",
    "bool",
    "break",
    "case",
    "catch",
    "char",
    "class",
    "const",
    "continue",
    "default",
    "delete",
    "do",
    "double",
    "else",
    "enum",
    "false",
    "float",
    "for",
    "if",
    "int",
    "long",
    "namespace",
    "new",
    "nullptr",
    "private",
    "protected",
    "public",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "template",
    "this",
    "throw",
    "true",
    "try",
    "typedef",
    "typename",
    "using",
    "void",
    "while",
  ];
  const stlTypes = [
    "array",
    "bitset",
    "deque",
    "greater",
    "less",
    "map",
    "multiset",
    "pair",
    "priority_queue",
    "queue",
    "set",
    "stack",
    "string",
    "unordered_map",
    "unordered_set",
    "vector",
  ];
  const functions = [
    "abs",
    "accumulate",
    "begin",
    "binary_search",
    "cin",
    "cout",
    "emplace",
    "emplace_back",
    "empty",
    "end",
    "erase",
    "find",
    "front",
    "gcd",
    "insert",
    "ios",
    "lower_bound",
    "make_pair",
    "max",
    "min",
    "pop",
    "pop_back",
    "push",
    "push_back",
    "reverse",
    "size",
    "sort",
    "sqrt",
    "swap",
    "top",
    "upper_bound",
  ];

  cppCompletionDisposable = monaco.languages.registerCompletionItemProvider("cpp", {
    triggerCharacters: [".", ":", "<", "#"],
    provideCompletionItems(model: MonacoModelWithWords, position: MonacoPosition) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: [
          ...keywords.map((item) => basicCompletion(item, "C++ keyword", monaco, range)),
          ...stlTypes.map((item) => basicCompletion(item, "C++ STL type", monaco, range, monaco.languages.CompletionItemKind.Class)),
          ...functions.map((item) => basicCompletion(item, "C++ standard/library symbol", monaco, range, monaco.languages.CompletionItemKind.Function)),
          snippetCompletion("main", "minimal main function", "int main() {\n  ${1}\n  return 0;\n}", monaco, range),
          snippetCompletion("fastio", "fast stream setup", "ios::sync_with_stdio(false);\ncin.tie(nullptr);", monaco, range),
        ],
      };
    },
  });
}

const handleEditorMount: OnMount = (editor, monaco) => {
  monaco.editor.defineTheme("rin-code-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "8B5CF6", fontStyle: "bold" },
      { token: "number", foreground: "0F766E" },
      { token: "string", foreground: "BE185D" },
      { token: "comment", foreground: "8A819A", fontStyle: "italic" },
      { token: "type", foreground: "2563EB" },
    ],
    colors: {
      "editor.background": "#FFFBFE",
      "editor.foreground": "#272033",
      "editorLineNumber.foreground": "#B9AFC9",
      "editorLineNumber.activeForeground": "#BE5E7B",
      "editorCursor.foreground": "#EC4899",
      "editor.selectionBackground": "#FFD3DC88",
      "editor.lineHighlightBackground": "#FFF1F566",
      "editorIndentGuide.background1": "#F0D7E5",
      "editorIndentGuide.activeBackground1": "#D8B4FE",
      "editorSuggestWidget.background": "#FFFDFB",
      "editorSuggestWidget.border": "#FFD3DC",
      "editorSuggestWidget.selectedBackground": "#FFE4EC",
    },
  });

  registerCppCompletions(monaco);
  monaco.editor.setTheme("rin-code-light");
  editor.focus();
};

export function SubmissionPanel({ initialProblemId = "prob_1" }: Readonly<{ initialProblemId?: string }>) {
  const actorId = useSessionStore((state) => state.actorId);
  const { t } = useTranslation();
  const [problemId, setProblemId] = useState(initialProblemId);
  const [languageId, setLanguageId] = useState(defaultLanguageId);
  const [sourceCode, setSourceCode] = useState(starterCodeForLanguage(defaultLanguageId));
  const [events, setEvents] = useState<SubmissionEventResponse[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const activeLanguage = getSupportedLanguage(languageId);

  const handleLanguageChange = (nextLanguageId: string) => {
    const currentStarter = starterCodeForLanguage(languageId);
    setLanguageId(nextLanguageId);
    setSourceCode((currentSource) =>
      currentSource.trim().length === 0 || currentSource === currentStarter ? starterCodeForLanguage(nextLanguageId) : currentSource,
    );
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
  }, [languageId, problemId, sourceCode, submissionId]);

  return (
    <section className="rin-workbench-panel rounded-xl p-6 text-base">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
            <Code2 className="h-5 w-5" />
            {t("submission.name")}
          </div>
          <h2 className="mt-2 text-3xl font-black text-slate-900">{t("submission.title")}</h2>
        </div>
        <StatusPill tone={visibleStatus === "accepted" ? "good" : visibleStatus === "queued" || visibleStatus === "running" ? "warn" : "neutral"}>
          {visibleStatus}
        </StatusPill>
      </div>

      <JudgeProgress status={visibleStatus} />

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="grid gap-1 text-base font-semibold">
          {t("submission.problemId")}
          <input
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg"
            value={problemId}
            onChange={(event) => setProblemId(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-base font-semibold">
          {t("submission.languageId")}
          <select className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg" value={languageId} onChange={(event) => handleLanguageChange(event.target.value)}>
            {supportedLanguages.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rin-code-editor mt-5 overflow-hidden rounded-xl border border-pink-100">
        <Editor
          height="clamp(560px, 62vh, 860px)"
          language={activeLanguage.monacoLanguage}
          path={`main.${activeLanguage.id}`}
          theme="rin-code-light"
          value={sourceCode}
          onMount={handleEditorMount}
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
            fontSize: 22,
            fontWeight: "500",
            letterSpacing: 0.2,
            lineHeight: 36,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: { top: 14, bottom: 14 },
            parameterHints: { enabled: true, cycle: true },
            quickSuggestions: { other: true, comments: false, strings: false },
            renderLineHighlight: "all",
            renderWhitespace: "selection",
            roundedSelection: true,
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            scrollBeyondLastLine: false,
            snippetSuggestions: "bottom",
            smoothScrolling: true,
            suggest: {
              localityBonus: true,
              matchOnWordStartOnly: false,
              preview: true,
              selectionMode: "always",
              showSnippets: false,
            },
            suggestOnTriggerCharacters: true,
            tabCompletion: "on",
            wordBasedSuggestions: "allDocuments",
            wordWrap: "on",
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-lg font-bold text-white disabled:opacity-50"
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
        <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">
          <div className="font-bold">{t("submission.localJudge")}</div>
          <div className="mt-1">{t("submission.localJudgeHelp")}</div>
        </div>
      ) : null}

      {submitMutation.data ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-base font-semibold text-amber-900">
          {t("submission.queued")}: {submitMutation.data.submissionId}
        </motion.div>
      ) : null}

      {finalEvent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 rounded-xl border p-4 shadow-sm ${verdictTone(finalEvent.status)}`}
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

      <div className="mt-4 rounded-xl border border-slate-200 bg-white/76 p-4">
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
              <div key={`${event.status}-${event.testCaseIndex}-${index}`} className={`grid gap-1 rounded-xl border px-3 py-2 text-sm ${event.final ? verdictTone(event.status) : "border-slate-100 bg-slate-50"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">
                    #{index + 1} {event.status}
                    {event.final && isFailedVerdict(event.status) ? ` · 挂在 ${formatCaseLabel(event.testCaseIndex)}` : ""}
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

      {submitMutation.error ? <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">{submitMutation.error.message}</div> : null}
    </section>
  );
}

function JudgeProgress({ status }: Readonly<{ status: string }>) {
  const failed = isFailedVerdict(status);
  const accepted = status === "accepted";
  const activeStep = status === "queued" || status === "ready" ? 0 : status === "compiling" ? 1 : status === "running" ? 2 : 3;
  const steps = [
    { label: "入队", detail: "Queue" },
    { label: "编译", detail: "Compile" },
    { label: "运行", detail: "Run tests" },
    { label: "结果", detail: "Verdict" },
  ];

  return (
    <div className="mt-5 grid gap-2 rounded-xl border border-slate-200 bg-white/72 p-3 sm:grid-cols-4">
      {steps.map((step, index) => {
        const done = index < activeStep || accepted;
        const current = index === activeStep && !accepted && !failed;
        const error = failed && index === 3;
        return (
          <div
            key={step.label}
            className={`rounded-lg border px-3 py-2 ${
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
