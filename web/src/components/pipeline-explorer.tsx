"use client";

import * as React from "react";
import {
  UploadCloud,
  FileText,
  Scissors,
  Network,
  Database,
  MessageCircleQuestion,
  Radar,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------- vignettes ---------------------------------- */

function VignetteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-b from-blue-500/[0.07] to-transparent">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-400/20"
      />
      {children}
    </div>
  );
}

function UploadVignette() {
  return (
    <VignetteShell>
      <div className="relative flex flex-col items-center">
        <span className="animate-drop-loop flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
          <FileText className="size-6" />
        </span>
        <span className="mt-3 flex h-10 w-40 items-end justify-center rounded-b-xl border-2 border-t-0 border-dashed border-blue-500/60" />
      </div>
    </VignetteShell>
  );
}

function ExtractVignette() {
  return (
    <VignetteShell>
      <div className="w-44 rounded-xl border border-border bg-card p-3 shadow-sm">
        {[92, 100, 70].map((w, i) => (
          <div key={i} className="mb-2 h-2 overflow-hidden rounded-full bg-muted last:mb-0">
            <div
              className="animate-type-line h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400"
              style={{ width: `${w}%`, animationDelay: `${i * 0.35}s` }}
            />
          </div>
        ))}
        <p className="mt-2 text-center text-[11px] text-muted-foreground">text extracted</p>
      </div>
    </VignetteShell>
  );
}

function ChunkVignette() {
  return (
    <VignetteShell>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-start">
          <span className="animate-split-l block h-16 w-10 rounded-md bg-gradient-to-b from-blue-500 to-blue-700 shadow-glow" />
          <span className="block h-16 w-10 rounded-md border-2 border-dashed border-blue-500/50" />
          <span className="animate-split-r block h-16 w-10 rounded-md bg-gradient-to-b from-blue-500 to-blue-700 shadow-glow" />
        </div>
        <p className="text-[11px] text-muted-foreground">1000 chars · overlap 200</p>
      </div>
    </VignetteShell>
  );
}

function EmbedVignette() {
  return (
    <VignetteShell>
      <div className="flex flex-col items-center gap-2">
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="animate-dot-wave size-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-700"
              style={{ animationDelay: `${(i % 3) * 0.2 + Math.floor(i / 3) * 0.2}s` }}
            />
          ))}
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">[ 0.21, −0.87, … ]</p>
      </div>
    </VignetteShell>
  );
}

function StoreVignette() {
  return (
    <VignetteShell>
      <div className="relative flex flex-col items-center">
        <span className="relative flex size-20 items-end justify-center overflow-hidden rounded-b-full rounded-t-lg border-2 border-blue-500/60">
          <span className="animate-fill-up absolute inset-x-1 bottom-1 top-3 rounded-b-full rounded-t-md bg-gradient-to-t from-blue-600 to-sky-400/80" />
        </span>
        <span className="animate-ping-slow absolute -top-1 left-1/2 size-3 -translate-x-1/2 rounded-full bg-sky-400" />
        <p className="mt-2 text-[11px] text-muted-foreground">Qdrant · vector stored</p>
      </div>
    </VignetteShell>
  );
}

function AskVignette() {
  return (
    <VignetteShell>
      <div className="animate-pop-in flex size-20 items-center justify-center rounded-2xl border border-border bg-card text-3xl font-bold text-blue-600 shadow-glow dark:text-blue-400">
        ?
      </div>
    </VignetteShell>
  );
}

function RetrieveVignette() {
  return (
    <VignetteShell>
      <div className="relative flex flex-col items-center">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
          <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/20 [animation-delay:0.6s]" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
            <Radar className="size-6" />
          </span>
        </span>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">top-k cosine search</p>
      </div>
    </VignetteShell>
  );
}

function AnswerVignette() {
  return (
    <VignetteShell>
      <div className="flex flex-col items-center gap-2">
        <span className="animate-pop-in flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-sm shadow-sm">
          <BadgeCheck className="size-4 text-emerald-500" /> Grounded answer
        </span>
        <span className="flex gap-1.5">
          {["p.42", "10:23", "URL"].map((c, i) => (
            <span
              key={c}
              className="animate-pop-in rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] text-blue-600 dark:text-blue-400"
              style={{ animationDelay: `${0.4 + i * 0.25}s` }}
            >
              {c}
            </span>
          ))}
        </span>
      </div>
    </VignetteShell>
  );
}

/* ---------------------------------- explorer ---------------------------------- */

interface Stage {
  icon: React.ReactNode;
  title: string;
  tagline: string;
  desc: string;
  chips: string[];
  visual: React.ReactNode;
}

const INDEX_STAGES: Stage[] = [
  {
    icon: <UploadCloud className="size-4" />,
    title: "Upload anything",
    tagline: "Step 1 · Ingest",
    desc: "Drop in PDFs, audio, video, a YouTube link or a web URL. Files are staged securely and every job streams live progress and logs.",
    chips: ["PDF", "MP3 / WAV", "MP4", "YouTube", "Web URL"],
    visual: <UploadVignette />,
  },
  {
    icon: <FileText className="size-4" />,
    title: "Extract the words",
    tagline: "Step 2 · Parse",
    desc: "PDF text is pulled page by page; audio and video are transcribed with Whisper — with word-level timestamps preserved for citations.",
    chips: ["pdf-parse", "Whisper", "timestamps kept"],
    visual: <ExtractVignette />,
  },
  {
    icon: <Scissors className="size-4" />,
    title: "Split into chunks",
    tagline: "Step 3 · Chunk",
    desc: "Text is sliced into 1000-character passages with 200 characters of overlap, so no answer ever loses its context at a boundary.",
    chips: ["1000 chars", "overlap 200", "timestamp-aware"],
    visual: <ChunkVignette />,
  },
  {
    icon: <Network className="size-4" />,
    title: "Embed meaning",
    tagline: "Step 4 · Vectorize",
    desc: "Each chunk is converted into a dense vector with OpenAI embeddings — numbers that capture what the text actually means.",
    chips: ["text-embedding-3-small", "batched ×50"],
    visual: <EmbedVignette />,
  },
  {
    icon: <Database className="size-4" />,
    title: "Store for search",
    tagline: "Step 5 · Index",
    desc: "Vectors land in Qdrant with rich metadata — source, page, URL, timestamps — ready for millisecond similarity search.",
    chips: ["Qdrant", "page + time metadata"],
    visual: <StoreVignette />,
  },
];

const ANSWER_STAGES: Stage[] = [
  {
    icon: <MessageCircleQuestion className="size-4" />,
    title: "Ask in plain words",
    tagline: "Step 1 · Query",
    desc: "Type a question like you'd ask a friend. Your words are embedded with the same model, so meaning matches meaning.",
    chips: ["natural language", "same embedding space"],
    visual: <AskVignette />,
  },
  {
    icon: <Radar className="size-4" />,
    title: "Retrieve the best chunks",
    tagline: "Step 2 · Search",
    desc: "Qdrant finds the most similar passages across every source you indexed — PDFs, transcripts, articles — in milliseconds.",
    chips: ["cosine similarity", "top-k", "multi-source"],
    visual: <RetrieveVignette />,
  },
  {
    icon: <BadgeCheck className="size-4" />,
    title: "Answer with citations",
    tagline: "Step 3 · Respond",
    desc: "The model answers using only the retrieved passages and cites each claim — page numbers, URLs and timestamps included.",
    chips: ["source-grounded", "no hallucinations"],
    visual: <AnswerVignette />,
  },
];

const STEP_SECONDS = 4;

export function PipelineExplorer() {
  const [mode, setMode] = React.useState<"index" | "answer">("index");
  const [index, setIndex] = React.useState(0);
  const paused = React.useRef(false);

  const stages = mode === "index" ? INDEX_STAGES : ANSWER_STAGES;
  const stage = stages[Math.min(index, stages.length - 1)];

  React.useEffect(() => {
    const t = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % stages.length);
    }, STEP_SECONDS * 1000);
    return () => clearInterval(t);
  }, [stages.length, mode]);

  function switchMode(m: "index" | "answer") {
    setMode(m);
    setIndex(0);
  }

  return (
    <div
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-1 border-b border-border bg-muted/40 p-2">
        {(["index", "answer"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={cn(
              "flex-1 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {m === "index" ? "Indexing pipeline" : "Answering pipeline"}
          </button>
        ))}
      </div>

      <div key={`${mode}-${index}`} className="h-1 bg-muted">
        <div
          className="explorer-progress h-full bg-gradient-to-r from-blue-600 to-sky-400"
          style={{ animationDuration: `${STEP_SECONDS}s` }}
        />
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
        <div key={`v-${mode}-${index}`}>{stage.visual}</div>
        <div className="flex flex-col justify-center gap-3">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            {stage.tagline}
          </p>
          <h3 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {stage.icon}
            </span>
            {stage.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{stage.desc}</p>
          <div className="flex flex-wrap gap-1.5">
            {stage.chips.map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-border bg-muted/40 p-3">
        {stages.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium whitespace-nowrap transition-colors",
              i === index
                ? "bg-background text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums",
                i === index ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
              )}
            >
              {i + 1}
            </span>
            <span className="hidden truncate sm:inline">{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
