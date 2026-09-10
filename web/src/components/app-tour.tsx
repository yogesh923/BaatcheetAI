"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  target: string | null;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    target: null,
    title: "Welcome to BaatCheetLLM",
    text: "A 30-second tour: your key, your sources, grounded answers. Use the arrows or press Escape to exit anytime.",
  },
  {
    target: "settings",
    title: "1 · Your OpenAI key",
    text: "Open Settings (gear icon), paste your own OpenAI key and pick embedding + chat models. It stays in this browser — never in our database.",
  },
  {
    target: "indexing",
    title: "2 · Index a source",
    text: "PDFs, audio, video or web pages. Watch live progress with streaming logs while chunks get embedded into Qdrant.",
  },
  {
    target: "chat",
    title: "3 · Ask anything",
    text: "Answers come only from your sources, each claim backed by a citation — page numbers, URLs and timestamps.",
  },
  {
    target: "history",
    title: "4 · Manage sources",
    text: "Everything you indexed, in one list. Removing a source deletes its vectors too, so it stops appearing in answers.",
  },
];

const FLAG = "baatcheet:tour-done";
const PAD = 8;

export function TourButton() {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Take the app tour"
      title="Take the app tour"
      onClick={() => window.dispatchEvent(new CustomEvent("baatcheet:tour-start"))}
    >
      <CircleHelp className="size-4" />
    </Button>
  );
}

export function AppTour() {
  const [step, setStep] = React.useState<number | null>(null);
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  const measure = React.useCallback((id: string | null) => {
    if (typeof document === "undefined" || !id) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${id}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      setRect(el.getBoundingClientRect());
    }, 450);
  }, []);

  const go = React.useCallback(
    (i: number | null) => {
      setStep(i);
      if (i != null) measure(STEPS[i].target);
      else setRect(null);
    },
    [measure]
  );

  const close = React.useCallback((done = true) => {
    if (done) {
      try {
        localStorage.setItem(FLAG, "1");
      } catch {
        // no-op
      }
    }
    setStep(null);
    setRect(null);
  }, []);

  React.useEffect(() => {
    const start = () => go(0);
    window.addEventListener("baatcheet:tour-start", start);
    let seen = false;
    try {
      seen = localStorage.getItem(FLAG) === "1";
    } catch {
      // no-op
    }
    const t = window.setTimeout(() => {
      if (!seen) go(0);
    }, 800);
    return () => {
      window.removeEventListener("baatcheet:tour-start", start);
      window.clearTimeout(t);
    };
  }, [go ]);

  React.useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, close]);

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const tipW = Math.min(340, vw - 32);
  let tipTop = vh / 2 - 110;
  let tipLeft = Math.max(16, (vw - tipW) / 2);
  if (rect) {
    const below = rect.bottom + PAD + 190 < vh;
    tipTop = below ? rect.bottom + PAD : Math.max(16, rect.top - PAD - 190);
    tipLeft = Math.max(16, Math.min(rect.left, vw - tipW - 16));
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={s.title}>
      {rect ? (
        <>
          <div className="absolute bg-black/60" style={{ left: 0, top: 0, width: "100%", height: Math.max(0, rect.top - PAD) }} />
          <div className="absolute bg-black/60" style={{ left: 0, top: rect.bottom + PAD, width: "100%", height: Math.max(0, vh - rect.bottom - PAD) }} />
          <div className="absolute bg-black/60" style={{ left: 0, top: Math.max(0, rect.top - PAD), width: Math.max(0, rect.left - PAD), height: rect.height + PAD * 2 }} />
          <div className="absolute bg-black/60" style={{ left: rect.right + PAD, top: Math.max(0, rect.top - PAD), width: Math.max(0, vw - rect.right - PAD), height: rect.height + PAD * 2 }} />
          <div
            className="absolute rounded-xl border-2 border-blue-500 shadow-glow"
            style={{
              left: rect.left - PAD,
              top: rect.top - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" onClick={() => close()} />
      )}

      <div
        className="animate-message-in fixed rounded-xl border border-border bg-card p-4 shadow-xl"
        style={{ top: tipTop, left: tipLeft, width: tipW }}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold">{s.title}</h2>
          <button
            type="button"
            onClick={() => close()}
            aria-label="End tour"
            className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i === step ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </span>
          <span className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => go(step - 1)}>
                <ArrowLeft className="size-3.5" /> Back
              </Button>
            )}
            {!last ? (
              <Button size="sm" onClick={() => go(step + 1)}>
                Next <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => close()}>
                Finish
              </Button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
