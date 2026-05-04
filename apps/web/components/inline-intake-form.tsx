"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { createInlineDraft, createProblemIntakeUpload } from "@/lib/gateway";
import type { InlineDraftRequest, ProblemDraftResponse } from "@/lib/types";
import { useTranslation } from "@/lib/use-translation";

type JudgeType = InlineDraftRequest["judgeType"];
type Locale = InlineDraftRequest["locale"];

type SampleState = {
  input: string;
  output: string;
};

type TestCaseState = {
  mode: "text" | "upload";
  inputText: string;
  outputText: string;
  inputFile: File | null;
  outputFile: File | null;
  inputObjectKey: string;
  outputObjectKey: string;
};

type InlineIntakeFormProps = {
  actorId: string;
  classId: string;
  noteToReviewer: string;
  onDraftCreated: (draft: ProblemDraftResponse) => void;
};

const inputClass =
  "rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90";

const textareaClass =
  "min-h-28 rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90";

function emptyTestCase(): TestCaseState {
  return {
    mode: "text",
    inputText: "",
    outputText: "",
    inputFile: null,
    outputFile: null,
    inputObjectKey: "",
    outputObjectKey: "",
  };
}

async function uploadInlineTestFile(file: File, actorId: string) {
  const upload = await createProblemIntakeUpload(
    {
      filename: file.name,
      contentType: "application/octet-stream",
      sizeBytes: file.size,
      partCount: 1,
    },
    { actorId },
  );
  const [part] = upload.parts;
  if (!part?.uploadUrl) {
    throw new Error("对象存储没有返回上传地址。");
  }
  const response = await fetch(part.uploadUrl, {
    method: "PUT",
    headers: part.headers,
    body: file,
  });
  if (!response.ok) {
    throw new Error(`测试数据上传失败：对象存储返回 ${response.status}`);
  }
  return upload.objectKey;
}

export function InlineIntakeForm({ actorId, classId, noteToReviewer, onDraftCreated }: InlineIntakeFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [judgeType, setJudgeType] = useState<JudgeType>("traditional");
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [statement, setStatement] = useState("");
  const [samples, setSamples] = useState<SampleState[]>([{ input: "", output: "" }]);
  const [testCases, setTestCases] = useState<TestCaseState[]>([emptyTestCase()]);

  const mutation = useMutation({
    mutationFn: async () => {
      const materializedTestCases = [];
      for (const testCase of testCases) {
        if (testCase.mode === "upload") {
          const inputObjectKey = testCase.inputObjectKey || (testCase.inputFile ? await uploadInlineTestFile(testCase.inputFile, actorId) : "");
          const outputObjectKey = testCase.outputObjectKey || (testCase.outputFile ? await uploadInlineTestFile(testCase.outputFile, actorId) : "");
          materializedTestCases.push({ inputObjectKey, outputObjectKey });
        } else {
          materializedTestCases.push({
            inputText: testCase.inputText,
            outputText: testCase.outputText,
          });
        }
      }

      return createInlineDraft(
        {
          title,
          timeLimit,
          memoryLimit,
          judgeType,
          locale,
          statement,
          samples: samples.filter((sample) => sample.input.trim() || sample.output.trim()),
          testCases: materializedTestCases,
          classId,
          noteToReviewer,
        },
        { actorId },
      );
    },
    onSuccess: onDraftCreated,
  });

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
          {t("intake.formTitle")} *
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          {t("intake.formTimeLimit")}
          <input className={inputClass} min={1} type="number" value={timeLimit} onChange={(event) => setTimeLimit(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          {t("intake.formMemoryLimit")}
          <input className={inputClass} min={1} type="number" value={memoryLimit} onChange={(event) => setMemoryLimit(Number(event.target.value))} />
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          {t("intake.formJudgeType")}
          <select className={inputClass} value={judgeType} onChange={(event) => setJudgeType(event.target.value as JudgeType)}>
            <option value="traditional">传统题</option>
            <option value="special_judge">Special Judge</option>
            <option value="interactive">交互题</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-slate-700">
          语言
          <select className={inputClass} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
            <option value="zh-CN">zh-CN</option>
            <option value="en-US">en-US</option>
            <option value="ja-JP">ja-JP</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-black text-slate-700">
        {t("intake.formStatement")}
        <textarea className={`${textareaClass} min-h-56 font-mono`} value={statement} onChange={(event) => setStatement(event.target.value)} />
      </label>

      <div className="rin-problem-section grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-800">{t("intake.formSamples")}</h3>
          <button className="inline-flex items-center gap-1 rounded-xl bg-sky-50 px-3 py-2 text-xs font-black text-sky-700" type="button" onClick={() => setSamples((items) => [...items, { input: "", output: "" }])}>
            <Plus className="h-3.5 w-3.5" />
            {t("intake.formAddSample")}
          </button>
        </div>
        {samples.map((sample, index) => (
          <div className="grid gap-3 rounded-xl border border-slate-100 bg-white/70 p-3 md:grid-cols-[1fr_1fr_auto]" key={index}>
            <textarea className={textareaClass} placeholder="input" value={sample.input} onChange={(event) => setSamples((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, input: event.target.value } : item)))} />
            <textarea className={textareaClass} placeholder="output" value={sample.output} onChange={(event) => setSamples((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, output: event.target.value } : item)))} />
            <button aria-label="删除样例" className="inline-flex items-center justify-center rounded-xl text-rose-600 disabled:opacity-40" type="button" disabled={samples.length === 1} onClick={() => setSamples((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="rin-problem-section grid gap-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-black text-slate-800">{t("intake.formTestCases")}</h3>
          <button className="inline-flex items-center gap-1 rounded-xl bg-pink-50 px-3 py-2 text-xs font-black text-pink-700" type="button" onClick={() => setTestCases((items) => [...items, emptyTestCase()])}>
            <Plus className="h-3.5 w-3.5" />
            {t("intake.formAddTestCase")}
          </button>
        </div>
        {testCases.map((testCase, index) => (
          <div className="grid gap-3 rounded-xl border border-slate-100 bg-white/70 p-3" key={index}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-black">
                <button className={`rounded-lg px-3 py-1.5 ${testCase.mode === "text" ? "bg-slate-900 text-white" : "text-slate-600"}`} type="button" onClick={() => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, mode: "text" } : item)))}>
                  {t("intake.formPasteText")}
                </button>
                <button className={`rounded-lg px-3 py-1.5 ${testCase.mode === "upload" ? "bg-slate-900 text-white" : "text-slate-600"}`} type="button" onClick={() => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, mode: "upload" } : item)))}>
                  {t("intake.formUploadFile")}
                </button>
              </div>
              <button className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-black text-rose-600 disabled:opacity-40" type="button" disabled={testCases.length === 1} onClick={() => setTestCases((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            </div>
            {testCase.mode === "upload" ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input aria-label="选择输入文件" className={inputClass} type="file" accept=".in,.txt" onChange={(event) => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, inputFile: event.target.files?.[0] ?? null, inputObjectKey: "" } : item)))} />
                <input aria-label="选择输出文件" className={inputClass} type="file" accept=".out,.ans,.txt" onChange={(event) => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, outputFile: event.target.files?.[0] ?? null, outputObjectKey: "" } : item)))} />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <textarea className={textareaClass} placeholder="input" value={testCase.inputText} onChange={(event) => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, inputText: event.target.value } : item)))} />
                <textarea className={textareaClass} placeholder="output" value={testCase.outputText} onChange={(event) => setTestCases((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, outputText: event.target.value } : item)))} />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 py-4 text-lg font-black text-white shadow-[0_8px_28px_rgba(15,10,30,0.25)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:via-pink-700 hover:to-pink-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        disabled={mutation.isPending || !title.trim() || !statement.trim()}
        type="button"
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Save className="h-5 w-5" aria-hidden />}
        {mutation.isPending ? t("intake.creatingDraft") : t("intake.formSaveDraft")}
      </button>

      {mutation.error ? <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-800">{(mutation.error as Error).message}</div> : null}
      <div className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
        <UploadCloud className="h-3.5 w-3.5" />
        {t("intake.formSubmitReview")} 会在草稿审核流程里继续处理。
      </div>
    </div>
  );
}
