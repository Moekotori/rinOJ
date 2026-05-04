"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ClipboardList, FileArchive, FileCheck2, FileSearch, Info, Loader2, Send, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createProblemIntakeUpload, studentDraftSubmission, teacherQuickUpload, validateProblemImport } from "@/lib/gateway";
import { InlineIntakeForm } from "@/components/inline-intake-form";
import type { ImportWizardResponse, ProblemDraftResponse, ProblemUploadResponse } from "@/lib/types";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";
import { StatusPill } from "./status-pill";

const packageExample = "(no example — upload your own ZIP)";

const acceptedExtensions = [".zip", ".yaml", ".yml", ".md"];

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isSupportedFilename(filename: string) {
  const lower = filename.toLowerCase();
  return acceptedExtensions.some((extension) => lower.endsWith(extension));
}

type PipelinePhase = "idle" | "upload" | "validate" | "draft";
type IntakeTab = "zip" | "form";

export function ProblemIntakePanel() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const { actorId, intakeRole, setIntakeRole } = useSessionStore();
  const { locale, t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("");
  const [activeTab, setActiveTab] = useState<IntakeTab>("zip");
  const [flatTitle, setFlatTitle] = useState("");
  const [flatTimeLimit, setFlatTimeLimit] = useState(1000);
  const [flatMemoryLimit, setFlatMemoryLimit] = useState(256);
  const [flatJudgeType, setFlatJudgeType] = useState<"traditional" | "special_judge" | "interactive">("traditional");
  const [classId, setClassId] = useState("");
  const [note, setNote] = useState("");
  const [upload, setUpload] = useState<ProblemUploadResponse | null>(null);
  const [wizard, setWizard] = useState<ImportWizardResponse | null>(null);
  const [draft, setDraft] = useState<ProblemDraftResponse | null>(null);

  const [showStepButtons, setShowStepButtons] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const fileSize = selectedFile?.size ?? 1_048_576;
  const objectKey = upload?.objectKey ?? "";
  const flowLabel = useMemo(() => (intakeRole === "teacher" ? t("intake.teacher") : t("intake.student")), [intakeRole, t]);
  const fileLooksSupported = isSupportedFilename(filename);
  const showFlatMetadata = Boolean(selectedFile && filename.toLowerCase().endsWith(".zip") && !filename.toLowerCase().includes("problem.json"));
  const flatMetadataReady = !showFlatMetadata || Boolean(flatTitle.trim());
  const canPreview = Boolean(upload);
  const canCreateDraft = Boolean(wizard);

  const pipelineBusy = pipelinePhase !== "idle";

  const phaseLabel =
    pipelinePhase === "upload"
      ? t("intake.phaseUpload")
      : pipelinePhase === "validate"
        ? t("intake.phaseValidate")
        : pipelinePhase === "draft"
          ? t("intake.phaseDraft")
          : "";

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const preparedUpload = await createProblemIntakeUpload(
        {
          filename,
          contentType: selectedFile?.type || "application/zip",
          sizeBytes: fileSize,
          partCount: 1,
        },
        { actorId },
      );

      if (selectedFile) {
        const [part] = preparedUpload.parts;
        if (!part?.uploadUrl) {
          throw new Error("对象存储没有返回上传地址，请检查 problem-service / MinIO 配置。");
        }
        const response = await fetch(part.uploadUrl, {
          method: "PUT",
          headers: part.headers,
          body: selectedFile,
        });
        if (!response.ok) {
          throw new Error(`文件上传失败：对象存储返回 ${response.status}`);
        }
      }

      return preparedUpload;
    },
    onSuccess: (result) => {
      setUpload(result);
      setWizard(null);
      setDraft(null);
    },
  });

  const validateMutation = useMutation({
    mutationFn: () =>
      validateProblemImport(
        {
          uploadObjectKey: objectKey,
          sourceFilename: filename,
          flatMetadata: showFlatMetadata
            ? {
                title: flatTitle,
                timeLimit: flatTimeLimit,
                memoryLimit: flatMemoryLimit,
                judgeType: flatJudgeType,
              }
            : undefined,
        },
        { actorId },
      ),
    onSuccess: setWizard,
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      if (intakeRole === "teacher") {
        return teacherQuickUpload({ classId, uploadObjectKey: objectKey, requestAdminReview: true }, { actorId });
      }
      return studentDraftSubmission({ classId, uploadObjectKey: objectKey, noteToReviewer: note }, { actorId });
    },
    onSuccess: setDraft,
  });

  const runOneClickPipeline = async () => {
    if (!filename.trim() || pipelineBusy) {
      return;
    }
    setPipelineError(null);
    setWizard(null);
    setDraft(null);
    try {
      setPipelinePhase("upload");
      const preparedUpload = await createProblemIntakeUpload(
        {
          filename,
          contentType: selectedFile?.type || "application/zip",
          sizeBytes: fileSize,
          partCount: 1,
        },
        { actorId },
      );

      if (selectedFile) {
        const [part] = preparedUpload.parts;
        if (!part?.uploadUrl) {
          throw new Error("对象存储没有返回上传地址，请检查 problem-service / MinIO 配置。");
        }
        const response = await fetch(part.uploadUrl, {
          method: "PUT",
          headers: part.headers,
          body: selectedFile,
        });
        if (!response.ok) {
          throw new Error(`文件上传失败：对象存储返回 ${response.status}`);
        }
      }

      setUpload(preparedUpload);

      setPipelinePhase("validate");
      const wiz = await validateProblemImport(
        {
          uploadObjectKey: preparedUpload.objectKey,
          sourceFilename: filename,
          flatMetadata: showFlatMetadata
            ? {
                title: flatTitle,
                timeLimit: flatTimeLimit,
                memoryLimit: flatMemoryLimit,
                judgeType: flatJudgeType,
              }
            : undefined,
        },
        { actorId },
      );
      setWizard(wiz);

      setPipelinePhase("draft");
      const dr =
        intakeRole === "teacher"
          ? await teacherQuickUpload({ classId, uploadObjectKey: preparedUpload.objectKey, requestAdminReview: true }, { actorId })
          : await studentDraftSubmission({ classId, uploadObjectKey: preparedUpload.objectKey, noteToReviewer: note }, { actorId });
      setDraft(dr);
      setPipelinePhase("idle");
    } catch (err) {
      setPipelinePhase("idle");
      setPipelineError(err instanceof Error ? err.message : String(err));
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="rin-workbench-panel overflow-hidden rounded-2xl border border-pink-100/65 bg-gradient-to-b from-white/[0.98] to-pink-50/25 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <div className="mx-auto max-w-md text-center">
          <span className="rin-icon-tile rin-icon-tile--amber mx-auto flex h-14 w-14 rounded-2xl [&>svg]:h-7 [&>svg]:w-7">
            <FileArchive className="text-pink-700" aria-hidden />
          </span>
          <p className="mt-4 text-[15px] font-semibold leading-relaxed text-slate-700">{t("intake.loginRequired")}</p>
          <Link
            className="mt-5 inline-flex rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-md transition hover:from-pink-600 hover:to-pink-700"
            href={`/login?next=${encodeURIComponent("/")}`}
          >
            {locale === "zh-CN" ? "去登录" : "Sign in"}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rin-workbench-panel overflow-hidden rounded-2xl">
      <div className="border-b border-pink-100 bg-[linear-gradient(135deg,rgba(255,211,220,0.55),rgba(168,216,234,0.28))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-pink-800">
              <span className="rin-icon-tile rin-icon-tile--amber">
                <FileArchive className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("intake.name")}
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{t("intake.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-700 sm:text-base">{t("intake.simpleLead")}</p>
          </div>
          <StatusPill tone="good">{flowLabel}</StatusPill>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("intake.roleTeacherShort")}</span>
          <div className="inline-flex rounded-xl border border-white/80 bg-white/70 p-1 shadow-sm ring-1 ring-slate-200/50">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                intakeRole === "teacher" ? "bg-gradient-to-b from-pink-500 to-pink-600 text-white shadow-sm" : "text-slate-600 hover:text-pink-700"
              }`}
              onClick={() => setIntakeRole("teacher")}
            >
              {t("intake.roleTeacherShort")}
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                intakeRole === "student" ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-sm" : "text-slate-600 hover:text-sky-700"
              }`}
              onClick={() => setIntakeRole("student")}
            >
              {t("intake.roleStudentShort")}
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-pink-100/70 bg-white/75 px-5 pt-5">
        <div className="inline-flex rounded-2xl border border-white/80 bg-white/80 p-1 shadow-sm ring-1 ring-slate-200/60">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === "zip" ? "bg-gradient-to-b from-pink-500 to-pink-600 text-white shadow-sm" : "text-slate-600 hover:text-pink-700"}`}
            type="button"
            onClick={() => setActiveTab("zip")}
          >
            {t("intake.tabZip")}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === "form" ? "bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-sm" : "text-slate-600 hover:text-sky-700"}`}
            type="button"
            onClick={() => setActiveTab("form")}
          >
            {t("intake.tabForm")}
          </button>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4">
          {activeTab === "form" ? (
            <InlineIntakeForm actorId={actorId} classId={classId} noteToReviewer={note} onDraftCreated={setDraft} />
          ) : (
            <>
          <label
            className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-5 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition hover:-translate-y-0.5 ${
              selectedFile
                ? "border-emerald-300/90 bg-gradient-to-b from-emerald-50/95 to-white ring-2 ring-emerald-100/70"
                : "border-pink-200/90 bg-gradient-to-b from-white to-slate-50/70 hover:border-pink-300 hover:bg-pink-50/65 hover:ring-2 hover:ring-pink-100/60"
            }`}
          >
            <input
              accept=".zip,.yaml,.yml,.md"
              className="sr-only"
              type="file"
              disabled={pipelineBusy}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file) {
                  setFilename(file.name);
                  setUpload(null);
                  setWizard(null);
                  setDraft(null);
                  setPipelineError(null);
                }
              }}
            />
            <span className="rin-icon-tile rin-icon-tile--pink h-12 w-12 rounded-2xl [&>svg]:h-7 [&>svg]:w-7">
              <UploadCloud className="text-pink-600" aria-hidden />
            </span>
            <div className="mt-3 text-lg font-black text-slate-950 sm:text-xl">{selectedFile ? selectedFile.name : t("intake.dropTitle")}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">
              {selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || "unknown"}` : t("intake.dropSubtitle")}
            </div>
          </label>

          {!fileLooksSupported ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">文件名看起来不是 ZIP/YAML/Markdown。仍可继续，但预览解析可能失败。</div>
          ) : null}

          {showFlatMetadata ? (
            <details open className="rin-problem-section group rounded-xl p-0 open:shadow-[0_8px_24px_rgba(58,45,88,0.06)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-black text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
                <span>{t("intake.flatMode")}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
              </summary>
              <div className="grid gap-4 border-t border-slate-100/90 px-4 pb-4 pt-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                  {t("intake.flatTitle")}
                  <input
                    className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                    value={flatTitle}
                    disabled={pipelineBusy}
                    onChange={(event) => setFlatTitle(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  {t("intake.flatTimeLimit")}
                  <input
                    className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                    min={1}
                    type="number"
                    value={flatTimeLimit}
                    disabled={pipelineBusy}
                    onChange={(event) => setFlatTimeLimit(Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  {t("intake.flatMemoryLimit")}
                  <input
                    className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                    min={1}
                    type="number"
                    value={flatMemoryLimit}
                    disabled={pipelineBusy}
                    onChange={(event) => setFlatMemoryLimit(Number(event.target.value))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                  {t("intake.formJudgeType")}
                  <select
                    className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90"
                    value={flatJudgeType}
                    disabled={pipelineBusy}
                    onChange={(event) => setFlatJudgeType(event.target.value as "traditional" | "special_judge" | "interactive")}
                  >
                    <option value="traditional">传统题</option>
                    <option value="special_judge">Special Judge</option>
                    <option value="interactive">交互题</option>
                  </select>
                </label>
              </div>
            </details>
          ) : null}

          <details className="rin-problem-section group rounded-xl p-0 open:shadow-[0_8px_24px_rgba(58,45,88,0.06)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-black text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
              <span>{t("intake.advancedToggle")}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-4 border-t border-slate-100/90 px-4 pb-4 pt-2">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                {t("intake.filename")}
                <input
                  className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-100/90"
                  value={filename}
                  disabled={pipelineBusy}
                  onChange={(event) => setFilename(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                {t("intake.class")}
                <input
                  className="rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_2px_10px_rgba(58,45,88,0.04)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90"
                  value={classId}
                  disabled={pipelineBusy}
                  onChange={(event) => setClassId(event.target.value)}
                />
              </label>
              {intakeRole === "student" ? (
                <label className="grid gap-2 text-sm font-black text-slate-700">
                  {t("intake.note")}
                  <textarea
                    className="min-h-24 rounded-xl border border-slate-200/95 bg-gradient-to-b from-white to-slate-50/90 px-4 py-3 text-base leading-7 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,1)] outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100/90"
                    value={note}
                    disabled={pipelineBusy}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
              ) : null}
            </div>
          </details>

          <div className="grid gap-3">
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-5 py-4 text-lg font-black text-white shadow-[0_8px_28px_rgba(15,10,30,0.25)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:via-pink-700 hover:to-pink-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              type="button"
              disabled={pipelineBusy || !filename.trim() || !flatMetadataReady}
              onClick={() => void runOneClickPipeline()}
            >
              {pipelineBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <UploadCloud className="h-5 w-5" aria-hidden />}
              {pipelineBusy ? t("intake.oneClickBusy") : t("intake.oneClick")}
            </button>

            {pipelineBusy && phaseLabel ? (
              <p className="text-center text-sm font-bold text-pink-700">{phaseLabel}</p>
            ) : null}

            <button
              type="button"
              className="text-center text-sm font-bold text-sky-700 underline decoration-sky-200 underline-offset-2 transition hover:text-pink-600"
              onClick={() => setShowStepButtons((v) => !v)}
            >
              {showStepButtons ? t("intake.hideSteps") : t("intake.showSteps")}
            </button>
          </div>

          {showStepButtons ? (
            <div className="rin-problem-section grid gap-3 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t("intake.stepDebug")}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-3 py-3 text-sm font-black text-white shadow-[0_6px_22px_rgba(15,10,30,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:via-pink-700 hover:to-pink-800 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  disabled={uploadMutation.isPending || pipelineBusy || !filename.trim()}
                  onClick={() => uploadMutation.mutate()}
                  type="button"
                >
                  <UploadCloud className="h-4 w-4" aria-hidden />
                  {uploadMutation.isPending ? t("intake.preparing") : "1. 准备上传"}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sky-500 to-sky-600 px-3 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(14,165,233,0.22)] transition hover:-translate-y-0.5 hover:from-sky-400 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  disabled={validateMutation.isPending || pipelineBusy || !canPreview || !flatMetadataReady}
                  onClick={() => validateMutation.mutate()}
                  type="button"
                >
                  <FileSearch className="h-4 w-4" aria-hidden />
                  {validateMutation.isPending ? t("intake.previewing") : "2. 预览解析"}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-pink-500 to-pink-600 px-3 py-3 text-sm font-black text-white shadow-[0_6px_20px_rgba(236,72,153,0.22)] transition hover:-translate-y-0.5 hover:from-pink-600 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                  disabled={draftMutation.isPending || pipelineBusy || !canCreateDraft}
                  onClick={() => draftMutation.mutate()}
                  type="button"
                >
                  <Send className="h-4 w-4" aria-hidden />
                  {draftMutation.isPending ? t("intake.creatingDraft") : "3. 创建草稿"}
                </button>
              </div>
            </div>
          ) : null}
            </>
          )}
        </div>

        <aside className="grid content-start gap-3">
          <details className="rin-problem-section rounded-xl p-0">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-black text-sky-900 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="rin-icon-tile rin-icon-tile--sky shrink-0">
                <Info className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("intake.foldPackageTitle")}
            </summary>
            <div className="border-t border-slate-100/80 px-4 pb-4 pt-2">
              <pre className="rin-sample-pre overflow-x-auto rounded-xl p-3 text-xs leading-5 text-slate-100">{packageExample}</pre>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{t("intake.foldPackageHint")}</p>
            </div>
          </details>

          <div className="rin-problem-section rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-black text-pink-800">
              <span className="rin-icon-tile rin-icon-tile--pink">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("intake.checksTitle")}
            </div>
            <ul className="mt-3 grid gap-1.5 text-xs font-semibold leading-relaxed text-slate-600">
              <li>{t("intake.check1")}</li>
              <li>{t("intake.check2")}</li>
              <li>{t("intake.check3")}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/70 px-3 py-3 text-xs font-semibold leading-relaxed text-slate-600">{t("intake.rolesHint")}</div>
        </aside>
      </div>

      <AnimatePresence>
        {(upload || wizard || draft || pipelineError || uploadMutation.error || validateMutation.error || draftMutation.error) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-t border-pink-100 bg-white/72 p-5">
            <div className="grid gap-3">
              {pipelineError ? (
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-800">{pipelineError}</div>
              ) : null}
              {upload ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-black text-sky-900">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("intake.uploadReady")}
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-sky-800">{upload.objectKey}</div>
                  <p className="mt-2 font-semibold text-sky-700">{showStepButtons ? t("intake.uploadHintSplit") : t("intake.uploadHintAuto")}</p>
                  {selectedFile ? <p className="mt-1 font-semibold text-sky-700">文件已上传：{selectedFile.name}</p> : <p className="mt-1 font-semibold text-sky-700">当前是演示对象；选择文件后会实际上传到对象存储。</p>}
                </div>
              ) : null}

              {wizard ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-violet-950">
                      <FileCheck2 className="h-4 w-4" />
                      {wizard.detectedTitle}
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700">{wizard.detectedType}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {wizard.validations.map((validation) => (
                      <div key={validation.code} className="rounded-lg bg-white/78 px-3 py-2 font-semibold text-violet-900">
                        {validation.severity}: {validation.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {draft ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm">
                  <div className="font-black text-emerald-900">{t("intake.draftCreated")}</div>
                  <div className="mt-1 font-mono text-xs text-emerald-800">
                    {draft.draftId} / {draft.visibility}
                  </div>
                </div>
              ) : null}

              {[uploadMutation.error, validateMutation.error, draftMutation.error].filter(Boolean).map((error, index) => (
                <div key={index} className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold text-rose-800">
                  {(error as Error).message}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
