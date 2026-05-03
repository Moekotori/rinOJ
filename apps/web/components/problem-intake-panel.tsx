"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardList, FileArchive, FileCheck2, FileSearch, GraduationCap, Info, Send, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { createProblemIntakeUpload, studentDraftSubmission, teacherQuickUpload, validateProblemImport } from "@/lib/gateway";
import type { ImportWizardResponse, ProblemDraftResponse, ProblemUploadResponse } from "@/lib/types";
import { useSessionStore } from "@/lib/use-session-store";
import { useTranslation } from "@/lib/use-translation";
import { StatusPill } from "./status-pill";

const packageExample = `problem.zip
├─ statement.md
├─ samples/
│  ├─ 1.in
│  └─ 1.out
└─ tests/
   ├─ 01.in
   └─ 01.out`;

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

export function ProblemIntakePanel() {
  const { actorId, role, setRole } = useSessionStore();
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filename, setFilename] = useState("A+B.zip");
  const [classId, setClassId] = useState("class_1");
  const [note, setNote] = useState("题面和样例已经整理好，请老师帮忙审核。");
  const [upload, setUpload] = useState<ProblemUploadResponse | null>(null);
  const [wizard, setWizard] = useState<ImportWizardResponse | null>(null);
  const [draft, setDraft] = useState<ProblemDraftResponse | null>(null);

  const fileSize = selectedFile?.size ?? 1_048_576;
  const objectKey = upload?.objectKey ?? "";
  const flowLabel = useMemo(() => (role === "teacher" ? t("intake.teacher") : t("intake.student")), [role, t]);
  const fileLooksSupported = isSupportedFilename(filename);
  const canPreview = Boolean(upload);
  const canCreateDraft = Boolean(wizard);

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

      // In local demos we still allow a metadata-only object, but a real
      // selected file is uploaded directly to MinIO through the presigned URL.
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
    mutationFn: () => validateProblemImport({ uploadObjectKey: objectKey, sourceFilename: filename }, { actorId }),
    onSuccess: setWizard,
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      if (role === "teacher") {
        return teacherQuickUpload({ classId, uploadObjectKey: objectKey, requestAdminReview: true }, { actorId });
      }
      return studentDraftSubmission({ classId, uploadObjectKey: objectKey, noteToReviewer: note }, { actorId });
    },
    onSuccess: setDraft,
  });

  return (
    <section className="rin-workbench-panel overflow-hidden rounded-2xl">
      <div className="border-b border-pink-100 bg-[linear-gradient(135deg,rgba(255,211,220,0.58),rgba(168,216,234,0.32))] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-pink-700">
              <FileArchive className="h-4 w-4" />
              {t("intake.name")}
            </div>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{t("intake.title")}</h2>
            <p className="mt-2 max-w-2xl text-base font-semibold leading-7 text-slate-700">
              选择题包后按顺序走：准备上传、预览解析、创建草稿。老师可以直接生成待审核题目，学生可以先把题目想法投给老师。
            </p>
          </div>
          <StatusPill tone="good">{flowLabel}</StatusPill>
        </div>

        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {[
            ["1", "选择文件", selectedFile ? "done" : "active"],
            ["2", "准备上传", upload ? "done" : "next"],
            ["3", "预览解析", wizard ? "done" : "next"],
            ["4", "创建草稿", draft ? "done" : "next"],
          ].map(([index, label, state]) => (
            <div key={index} className={`rounded-xl border px-3 py-2 text-sm font-black ${state === "done" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state === "active" ? "border-pink-200 bg-white text-pink-700" : "border-white/70 bg-white/62 text-slate-500"}`}>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">{index}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${role === "teacher" ? "border-pink-300 bg-pink-50 shadow-sm" : "border-slate-200 bg-white/78"}`}
              onClick={() => setRole("teacher")}
              type="button"
            >
              <GraduationCap className="h-6 w-6 text-pink-500" />
              <div className="mt-3 text-lg font-black text-slate-950">{t("intake.teacher")}</div>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{t("intake.teacherHelp")}</p>
            </button>
            <button
              className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${role === "student" ? "border-sky-300 bg-sky-50 shadow-sm" : "border-slate-200 bg-white/78"}`}
              onClick={() => setRole("student")}
              type="button"
            >
              <Send className="h-6 w-6 text-sky-500" />
              <div className="mt-3 text-lg font-black text-slate-950">{t("intake.student")}</div>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{t("intake.studentHelp")}</p>
            </button>
          </div>

          <label className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition hover:-translate-y-0.5 ${selectedFile ? "border-emerald-200 bg-emerald-50/70" : "border-pink-200 bg-white/78 hover:border-pink-300 hover:bg-pink-50/70"}`}>
            <input
              accept=".zip,.yaml,.yml,.md"
              className="sr-only"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file) {
                  setFilename(file.name);
                  setUpload(null);
                  setWizard(null);
                  setDraft(null);
                }
              }}
            />
            <UploadCloud className="h-10 w-10 text-pink-500" />
            <div className="mt-3 text-xl font-black text-slate-950">{selectedFile ? selectedFile.name : "点击选择题包文件"}</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">{selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || "unknown type"}` : "支持 ZIP、YAML、Markdown。推荐 ZIP：题面、样例、测试点放一起。"}</div>
          </label>

          {!fileLooksSupported ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">文件名看起来不是 ZIP/YAML/Markdown。仍可继续，但预览解析可能失败。</div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              {t("intake.filename")}
              <input className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100" value={filename} onChange={(event) => setFilename(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-black text-slate-700">
              {t("intake.class")}
              <input className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" value={classId} onChange={(event) => setClassId(event.target.value)} />
            </label>
          </div>

          {role === "student" ? (
            <label className="grid gap-2 text-sm font-black text-slate-700">
              {t("intake.note")}
              <textarea className="min-h-28 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base leading-7 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-3">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
              disabled={uploadMutation.isPending || !filename.trim()}
              onClick={() => uploadMutation.mutate()}
              type="button"
            >
              <UploadCloud className="h-5 w-5" />
              {uploadMutation.isPending ? t("intake.preparing") : "1. 准备上传"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
              disabled={validateMutation.isPending || !canPreview}
              onClick={() => validateMutation.mutate()}
              type="button"
            >
              <FileSearch className="h-5 w-5" />
              {validateMutation.isPending ? t("intake.previewing") : "2. 预览解析"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-pink-500 px-4 py-3 text-base font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
              disabled={draftMutation.isPending || !canCreateDraft}
              onClick={() => draftMutation.mutate()}
              type="button"
            >
              <Send className="h-5 w-5" />
              {draftMutation.isPending ? t("intake.creatingDraft") : "3. 创建草稿"}
            </button>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/82 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-sky-800">
              <Info className="h-4 w-4" />
              推荐题包结构
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs leading-5 text-slate-100">{packageExample}</pre>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white/82 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-pink-700">
              <ClipboardList className="h-4 w-4" />
              导入会检查
            </div>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-slate-600">
              <li>题面是否存在，Markdown 是否能解析</li>
              <li>样例输入输出是否成对出现</li>
              <li>测试点文件是否完整</li>
              <li>创建后默认进入审核草稿，不会直接污染公开题库</li>
            </ul>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {(upload || wizard || draft || uploadMutation.error || validateMutation.error || draftMutation.error) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="border-t border-pink-100 bg-white/72 p-5">
            <div className="grid gap-3">
              {upload ? (
                <div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm">
                  <div className="flex items-center gap-2 font-black text-sky-900">
                    <CheckCircle2 className="h-4 w-4" />
                    {t("intake.uploadReady")}
                  </div>
                  <div className="mt-2 break-all font-mono text-xs text-sky-800">{upload.objectKey}</div>
              <p className="mt-2 font-semibold text-sky-700">下一步点击“预览解析”，系统会读取题包并展示检测结果。</p>
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
