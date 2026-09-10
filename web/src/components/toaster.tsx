"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import type { ToastEvent, ToastKind } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DISMISS_MS = 4500;

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />,
  error: <AlertCircle className="size-4 shrink-0 text-destructive" />,
  info: <Info className="size-4 shrink-0 text-blue-500" />,
};

/** Fixed bottom-right stack. Mount once (app layout covers /app/*). */
export function Toaster() {
  const [items, setItems] = React.useState<ToastEvent[]>([]);

  React.useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastEvent>).detail;
      if (!detail) return;
      setItems((prev) => [...prev.slice(-3), detail]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== detail.id));
      }, DISMISS_MS);
    };
    window.addEventListener("baatcheet:toast", onToast);
    return () => window.removeEventListener("baatcheet:toast", onToast);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-[min(92vw,360px)] flex-col gap-2"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-message-in pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-xl"
        >
          {ICON[t.kind]}
          <span className="min-w-0 flex-1 break-words">{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className={cn(
              "cursor-pointer rounded p-0.5 text-muted-foreground",
              "hover:bg-accent hover:text-foreground"
            )}
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
