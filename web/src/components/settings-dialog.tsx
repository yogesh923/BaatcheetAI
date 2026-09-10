"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Settings2, Eye, EyeOff, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import {
  CREDENTIAL_DEFAULTS,
  getApiKey,
  getChatModel,
  getEmbeddingModel,
  saveCredentials,
  clearApiKey,
} from "@/lib/credentials";
import { cn } from "@/lib/utils";

function ModelSelect({
  id,
  label,
  hint,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={options.includes(value) ? value : options[0]}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/**
 * Header gear button + BYOK settings dialog. The OpenAI key and model
 * choices live ONLY in this browser's localStorage — the key travels per
 * request and is never saved to the database.
 *
 * The modal is portaled to <body>: fixed positioning must escape
 * transformed/filtered ancestors (the sticky blurred header this button
 * lives in), which would otherwise become the positioning context and
 * break centering.
 */
export function SettingsDialog() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [key, setKey] = React.useState("");
  const [showKey, setShowKey] = React.useState(false);
  const [emb, setEmb] = React.useState(CREDENTIAL_DEFAULTS.embeddingModel);
  const [chat, setChat] = React.useState(CREDENTIAL_DEFAULTS.chatModel);
  const [embOptions, setEmbOptions] = React.useState<string[]>([CREDENTIAL_DEFAULTS.embeddingModel]);
  const [chatOptions, setChatOptions] = React.useState<string[]>([CREDENTIAL_DEFAULTS.chatModel]);
  const [notice, setNotice] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [loadingLists, setLoadingLists] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const load = React.useCallback(async () => {
    setKey(getApiKey());
    setEmb(getEmbeddingModel());
    setChat(getChatModel());
    setNotice("");
    setSaved(false);
    setLoadingLists(true);
    try {
      const res = await apiFetch("/api/models");
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        if (Array.isArray(data.embeddingModels) && data.embeddingModels.length > 0) {
          setEmbOptions(data.embeddingModels);
        }
        if (Array.isArray(data.chatModels) && data.chatModels.length > 0) {
          setChatOptions(data.chatModels);
        }
      }
    } catch {
      // Offline/unauthorized — keep the local defaults.
    } finally {
      setLoadingLists(false);
    }
  }, []);

  React.useEffect(() => {
    const onNeedKey = () => {
      setNotice("Add your OpenAI API key below to continue — you pay OpenAI directly, we never see your bill.");
      load().then(() => setOpen(true));
    };
    window.addEventListener("baatcheet:need-key", onNeedKey);
    return () => window.removeEventListener("baatcheet:need-key", onNeedKey);
  }, [load]);

  function openDialog() {
    load().then(() => setOpen(true));
  }

  function save() {
    if (!key.trim()) {
      setNotice("Paste your OpenAI API key first — it stays in this browser only.");
      return;
    }
    saveCredentials({ apiKey: key, embeddingModel: emb, chatModel: chat });
    setSaved(true);
    setNotice("");
    setTimeout(() => {
      setOpen(false);
      setSaved(false);
    }, 700);
  }

  function clear() {
    clearApiKey();
    setKey("");
    setSaved(false);
    setNotice("Key removed from this browser.");
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={openDialog}
        aria-label="OpenAI settings"
        title="Your OpenAI key & models"
      >
        <Settings2 className="size-4" />
      </Button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="OpenAI settings"
              onClick={(e) => e.stopPropagation()}
              className="animate-message-in max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl"
            >
              <h2 className="flex items-center gap-2 font-semibold">
                <Settings2 className="size-4 text-blue-600 dark:text-blue-400" />
                Your OpenAI setup
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Use your own key — you pay OpenAI directly. It stays in this
                browser and is never saved to our database.{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline hover:no-underline dark:text-blue-400"
                >
                  Get a key
                </a>
              </p>

              {notice && (
                <p className="mt-3 rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-sm">
                  {notice}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="oa-key" className="text-sm font-medium">
                    OpenAI API key
                  </label>
                  <div className="relative">
                    <Input
                      id="oa-key"
                      type={showKey ? "text" : "password"}
                      placeholder="sk-…"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                      className="pr-10 font-mono text-[13px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      aria-label={showKey ? "Hide key" : "Show key"}
                      className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {loadingLists ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Loading model lists…
                  </p>
                ) : (
                  <>
                    <ModelSelect
                      id="oa-emb"
                      label="Embedding model — indexing"
                      hint="Converts your uploads into vectors. Must match for later questions."
                      value={emb}
                      options={embOptions}
                      onChange={setEmb}
                    />
                    <ModelSelect
                      id="oa-chat"
                      label="Chat model — answering"
                      hint="Writes the final grounded answer."
                      value={chat}
                      options={chatOptions}
                      onChange={setChat}
                    />
                  </>
                )}

                {saved && (
                  <p
                    className={cn(
                      "flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    <CheckCircle2 className="size-4" /> Saved in this browser.
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={clear}
                    className="flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" /> Remove key
                  </button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={save}>Save</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
