"use client";

import * as React from "react";
import {
  FileText,
  AudioLines,
  Clapperboard,
  Globe,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_URL, apiFetch } from "@/lib/api";
import { getApiKey, getEmbeddingModel, requestApiKey } from "@/lib/credentials";
import { cn } from "@/lib/utils";

type SourceType = "pdf" | "audio" | "video" | "website";

interface JobLog {
  level: string;
  text: string;
  at: string;
}

interface JobProgress {
  phase: string;
  done: number | null;
  total: number | null;
}

const ACCEPT: Record<Exclude<SourceType, "website">, string> = {
  pdf: "application/pdf,.pdf",
  audio: "audio/*,.mp3,.wav,.m4a,.ogg",
  video: "video/*,.mp4,.mov,.mkv,.webm",
};

const HINT: Record<SourceType, string> = {
  pdf: "PDF documents are chunked into 1000-char passages and embedded.",
  audio: "Audio is split into 5-min parts, transcribed with Whisper, then indexed with timestamps.",
  video: "Audio is extracted with ffmpeg, transcribed with Whisper, then indexed with timestamps.",
  website: "The page is fetched, chunked into 1000-char passages and embedded.",
};

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued…",
  splitting: "Splitting audio…",
  extracting: "Extracting audio from video…",
  loading: "Loading PDF…",
  fetching: "Fetching page…",
  transcribing: "Transcribing…",
  chunking: "Chunking text…",
  embedding: "Embedding chunks…",
  done: "Done",
  error: "Failed",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function progressPercent(p: JobProgress): number | null {
  if (p.done == null || p.total == null || p.total <= 0) return null;
  return Math.min(100, Math.round((p.done / p.total) * 100));
}

export function IndexingSection() {
  const [tab, setTab] = React.useState<SourceType>("pdf");
  const [file, setFile] = React.useState<File | null>(null);
  const [url, setUrl] = React.useState("");
  const [sourceName, setSourceName] = React.useState("Aaj Tak");
  const [active, setActive] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [progress, setProgress] = React.useState<JobProgress>({ phase: "queued", done: null, total: null });
  const [logs, setLogs] = React.useState<JobLog[]>([]);
  const [showLogs, setShowLogs] = React.useState(true);
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const esRef = React.useRef<EventSource | null>(null);
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const logBoxRef = React.useRef<HTMLDivElement>(null);

  const isWebsite = tab === "website";
  const canSubmit =
    !active && (isWebsite ? url.trim().length > 0 : file !== null);

  const closeStream = React.useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  React.useEffect(() => closeStream, [closeStream]);

  React.useEffect(() => {
    logBoxRef.current?.scrollTo({ top: logBoxRef.current.scrollHeight });
  }, [logs]);

  function reset() {
    closeStream();
    setActive(false);
    setFailed(false);
    setMessage("");
    setLogs([]);
    setProgress({ phase: "queued", done: null, total: null });
  }

  function finishOk(job: {
    result?: { chunks?: number; segments?: number; documents?: number };
  }) {
    setActive(false);
    setFailed(false);
    const r = job.result ?? {};
    setMessage(
      `Indexed successfully — ${r.chunks ?? "?"} chunks` +
        (r.segments != null ? ` from ${r.segments} transcript segments` : "") +
        " added to the collection."
    );
    window.dispatchEvent(new CustomEvent("rag:history-updated"));
  }

  function finishErr(error?: string) {
    setActive(false);
    setFailed(true);
    setMessage(error || "Indexing failed.");
  }

  function pollJob(jobId: string) {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/jobs?id=${jobId}`);
        const data = await res.json().catch(() => ({}));
        if (!data.ok || !data.job) return;
        setProgress(data.job.progress);
        setLogs(data.job.logs ?? []);
        if (data.job.status === "done") {
          closeStream();
          finishOk(data.job);
        } else if (data.job.status === "error") {
          closeStream();
          finishErr(data.job.error);
        }
      } catch {
        // Keep polling; SSE or a later tick may recover.
      }
    }, 1500);
  }

  function subscribe(jobId: string) {
    const es = new EventSource(`${API_URL}/api/jobs/stream?id=${jobId}`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.addEventListener("state", (e) => {
      const job = JSON.parse((e as MessageEvent).data);
      setProgress(job.progress);
      setLogs(job.logs ?? []);
      if (job.status === "done") {
        closeStream();
        finishOk(job);
      } else if (job.status === "error") {
        closeStream();
        finishErr(job.error);
      }
    });
    es.addEventListener("log", (e) => {
      const log = JSON.parse((e as MessageEvent).data) as JobLog;
      setLogs((prev) => [...prev.slice(-499), log]);
    });
    es.addEventListener("progress", (e) => {
      setProgress(JSON.parse((e as MessageEvent).data));
    });
    es.addEventListener("done", (e) => {
      const job = JSON.parse((e as MessageEvent).data);
      setProgress(job.progress ?? { phase: "done", done: 1, total: 1 });
      closeStream();
      finishOk(job);
    });
    es.addEventListener("error", (e) => {
      // SSE `error` event doubles as transport failure AND our terminal
      // error event — distinguish by payload.
      const raw = (e as MessageEvent).data;
      if (raw) {
        const job = JSON.parse(raw);
        closeStream();
        finishErr(job.error);
      } else if (es.readyState === EventSource.CLOSED) {
        // Transport dropped before terminal state: fall back to polling.
        pollJob(jobId);
      }
    });
  }

  async function handleIndex() {
    if (!canSubmit) return;
    if (!getApiKey()) {
      setFailed(true);
      setMessage("Add your OpenAI API key in Settings (gear icon, top right) to start indexing.");
      requestApiKey();
      return;
    }
    reset();
    setActive(true);
    setMessage("Starting indexing job…");
    try {
      const form = new FormData();
      form.set("type", tab);
      form.set("embeddingModel", getEmbeddingModel());
      if (tab === "website") {
        form.set("url", url.trim());
        form.set("sourceName", sourceName.trim() || "Website");
      } else if (file) {
        form.set("file", file, file.name);
      }
      const res = await apiFetch("/api/jobs", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.jobId) {
        throw new Error(data.error ?? `Failed to start job (${res.status})`);
      }
      setMessage("");
      subscribe(data.jobId);
    } catch (err) {
      setActive(false);
      setFailed(true);
      setMessage(err instanceof Error ? err.message : "Failed to start job.");
    }
  }

  function pickFile(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setFailed(false);
    setMessage("");
  }

  const percent = progressPercent(progress);
  const phaseLabel = PHASE_LABEL[progress.phase] ?? progress.phase;

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Index a source</CardTitle>
          <Badge variant="secondary">Qdrant</Badge>
        </div>
        <CardDescription>
          Add PDFs, audio, video or web pages to the knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as SourceType);
            reset();
            setFile(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="pdf"><FileText />PDF</TabsTrigger>
            <TabsTrigger value="audio"><AudioLines />Audio</TabsTrigger>
            <TabsTrigger value="video"><Clapperboard />Video</TabsTrigger>
            <TabsTrigger value="website"><Globe />Web</TabsTrigger>
          </TabsList>

          {(["pdf", "audio", "video"] as const).map((t) => (
            <TabsContent key={t} value={t} className="gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={cn(
                  "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 px-4 py-6 text-center transition-colors hover:bg-muted/70",
                  dragOver && "border-primary bg-muted"
                )}
              >
                <UploadCloud className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {file ? file.name : "Drop a file here or click to browse"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {HINT[t]}
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT[t]}
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
              {file && (
                <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
                  <span className="truncate font-medium">{file.name}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{formatBytes(file.size)}</Badge>
                    <button
                      type="button"
                      aria-label="Remove file"
                      onClick={() => setFile(null)}
                      className="cursor-pointer rounded p-1 hover:bg-accent"
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="website" className="gap-3">
            <div className="flex flex-col gap-2">
              <label htmlFor="index-url" className="text-sm font-medium">Page URL</label>
              <Input
                id="index-url"
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="index-source" className="text-sm font-medium">Source name</label>
              <Input
                id="index-source"
                placeholder="Aaj Tak"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{HINT.website}</p>
          </TabsContent>
        </Tabs>

        {(active || logs.length > 0 || (!failed && message)) && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                {active && <Loader2 className="size-4 animate-spin" />}
                {!active && !failed && message && <CheckCircle2 className="size-4 text-green-600" />}
                {failed && <AlertCircle className="size-4 text-destructive" />}
                {active ? phaseLabel : failed ? "Indexing failed" : phaseLabel === "Done" ? "Indexing complete" : "Indexing"}
              </span>
              {percent != null ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {progress.done}/{progress.total} · {percent}%
                </span>
              ) : active ? (
                <span className="text-xs text-muted-foreground">
                  {progress.done != null && progress.total != null
                    ? `${progress.done}/${progress.total}`
                    : "working…"}
                </span>
              ) : null}
            </div>
            {percent != null ? (
              <Progress value={percent} />
            ) : (
              active && (
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="animate-indeterminate absolute h-full w-2/5 rounded-full bg-primary" />
                </div>
              )
            )}
            {logs.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLogs((s) => !s)}
                  className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <Terminal className="size-3" />
                  {showLogs ? "Hide logs" : `Show logs (${logs.length})`}
                </button>
                {showLogs && (
                  <div
                    ref={logBoxRef}
                    className="mt-2 max-h-48 overflow-y-auto rounded-md bg-black p-2 font-mono text-[11px] leading-relaxed text-zinc-200"
                  >
                    {logs.map((l, i) => (
                      <div key={i} className="whitespace-pre-wrap break-words">
                        <span className="text-zinc-500">
                          {new Date(l.at).toLocaleTimeString()}
                        </span>{" "}
                        <span
                          className={cn(
                            l.level === "error" && "text-red-400",
                            l.level === "warn" && "text-yellow-400"
                          )}
                        >
                          {l.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {message && !active && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
              failed
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-green-600/30 bg-green-600/5"
            )}
          >
            {failed ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
            )}
            <span>{message}</span>
          </div>
        )}

        <Button onClick={handleIndex} disabled={!canSubmit}>
          {active && <Loader2 className="animate-spin" />}
          {active ? "Indexing…" : `Index ${isWebsite ? "URL" : "file"}`}
        </Button>
      </CardContent>
    </Card>
  );
}
