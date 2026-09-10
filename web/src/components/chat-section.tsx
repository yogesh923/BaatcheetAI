"use client";

import * as React from "react";
import {
  SendHorizonal,
  Loader2,
  Bot,
  BookOpenText,
  Sparkles,
  FileText,
  AudioLines,
  Copy,
  Check,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";
import { getApiKey, getChatModel, getEmbeddingModel, requestApiKey } from "@/lib/credentials";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string;
  at: number;
}

const SUGGESTIONS = [
  {
    icon: <Sparkles className="size-4" />,
    title: "Overview",
    text: "What is this collection about?",
  },
  {
    icon: <FileText className="size-4" />,
    title: "Summarize",
    text: "Summarize the key points from the PDF.",
  },
  {
    icon: <AudioLines className="size-4" />,
    title: "Audio insights",
    text: "What did the audio say about AI terms?",
  },
];

function timeOfDay(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1.5 px-1 py-2" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-typing-dot size-2 rounded-full bg-primary"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

export function ChatSection() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState<number | null>(null);
  const [stuckToBottom, setStuckToBottom] = React.useState(true);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setStuckToBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  }

  React.useEffect(() => {
    if (stuckToBottom) scrollToBottom();
  }, [messages, loading, stuckToBottom, scrollToBottom]);

  async function copy(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard unavailable — no-op.
      return;
    }
    setCopied(index);
    setTimeout(() => setCopied((c) => (c === index ? null : c)), 1500);
  }

  function clear() {
    setMessages([]);
    setError("");
    setCopied(null);
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    if (!getApiKey()) {
      setError("Add your OpenAI API key in Settings (gear icon, top right) to start chatting.");
      requestApiKey();
      return;
    }
    setError("");
    setInput("");
    setStuckToBottom(true);
    setMessages((m) => [...m, { role: "user", content: question, at: Date.now() }]);
    setLoading(true);
    try {
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          chatModel: getChatModel(),
          embeddingModel: getEmbeddingModel(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Chat failed (${res.status})`);
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources, at: Date.now() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-fit min-h-[560px] flex-col overflow-hidden" data-tour="chat">
      <CardHeader className="border-b border-border bg-gradient-to-r from-blue-600/[0.06] via-transparent to-sky-400/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
              <Bot className="size-5" />
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card",
                  loading ? "bg-amber-400" : "bg-emerald-500"
                )}
                title={loading ? "Working…" : "Ready"}
              />
            </span>
            <div>
              <CardTitle className="text-base">Chat with your sources</CardTitle>
              <CardDescription className="text-xs">
                {loading ? "Retrieving sources and answering…" : "Grounded answers with citations"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {messages.length}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={clear}
              disabled={messages.length === 0 && !error}
              aria-label="Clear chat"
              title="Clear chat"
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-1 flex-col gap-3 pt-4">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex max-h-[440px] min-h-72 flex-1 flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
                <Sparkles className="size-7" />
              </span>
              <div>
                <p className="font-semibold">Ask your sources anything</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Index a source on the left, then get answers backed by citations.
                </p>
              </div>
              <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => send(s.text)}
                    className="group flex cursor-pointer flex-col items-start gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue-500/50 hover:shadow-glow"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {s.icon}
                    </span>
                    <span className="text-xs font-semibold">{s.title}</span>
                    <span className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {s.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="animate-message-in flex justify-end">
                <div className="max-w-[85%]">
                  <div className="rounded-2xl rounded-br-md bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-2.5 text-sm whitespace-pre-wrap text-white shadow-glow">
                    {m.content}
                  </div>
                  <p className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
                    {timeOfDay(m.at)}
                  </p>
                </div>
              </div>
            ) : (
              <div key={i} className="animate-message-in flex gap-2.5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
                  <Bot className="size-4" />
                </span>
                <div className="max-w-[88%] flex-1">
                  <div className="group relative rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm whitespace-pre-wrap shadow-sm">
                    {m.content}
                    <button
                      type="button"
                      onClick={() => copy(m.content, i)}
                      aria-label="Copy answer"
                      title="Copy answer"
                      className="absolute top-2 right-2 cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent hover:text-foreground focus:opacity-100"
                    >
                      {copied === i ? (
                        <Check className="size-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {timeOfDay(m.at)}
                    </p>
                    {m.sources && (
                      <details className="group/sources text-[11px]">
                        <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400 [&::-webkit-details-marker]:hidden">
                          <BookOpenText className="size-3" /> View retrieved sources
                        </summary>
                        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-2.5 text-[11px] whitespace-pre-wrap text-foreground">
                          {m.sources}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="animate-message-in flex gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
                <Bot className="size-4" />
              </span>
              <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 shadow-sm">
                <TypingDots />
              </div>
            </div>
          )}
        </div>

        {!stuckToBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to latest"
            className="absolute right-8 bottom-24 cursor-pointer rounded-full border border-border bg-card p-2 shadow-lg transition-transform hover:scale-105"
          >
            <ArrowDown className="size-4" />
          </button>
        )}

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 pl-4 transition-shadow focus-within:border-blue-500/60 focus-within:shadow-glow">
            <Textarea
              placeholder="Ask about your sources…"
              value={input}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="min-h-0 resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon"
              aria-label="Send message"
              onClick={() => send()}
              disabled={loading || input.trim().length === 0}
              className="size-10 shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700"
            >
              {loading ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
            </Button>
          </div>
          <p className="px-1 text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
