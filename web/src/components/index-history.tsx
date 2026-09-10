"use client";

import * as React from "react";
import {
  FileText,
  AudioLines,
  Clapperboard,
  Globe,
  Trash2,
  Loader2,
  History,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch } from "@/lib/api";

interface HistoryEntry {
  id: string;
  type: string;
  label: string;
  detail?: string;
  chunks?: number;
  segments?: number;
  documents?: number;
  durationMs: number;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  pdf: <FileText className="size-4" />,
  audio: <AudioLines className="size-4" />,
  video: <Clapperboard className="size-4" />,
  website: <Globe className="size-4" />,
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function IndexHistory() {
  const [entries, setEntries] = React.useState<HistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<HistoryEntry | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/history");
      const data = await res.json().catch(() => ({}));
      if (data.ok) setEntries(data.entries ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("rag:history-updated", onUpdate);
    return () => window.removeEventListener("rag:history-updated", onUpdate);
  }, [refresh]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await apiFetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
      setPendingDelete(null);
    }
  }

  return (
    <Card className="h-fit" data-tour="history">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="size-4" /> Indexed sources
          </CardTitle>
          {entries.length > 0 && (
            <Badge variant="secondary">{entries.length}</Badge>
          )}
        </div>
        <CardDescription>
          Everything added to the collection from this app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading history…
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing indexed yet. Add a PDF, audio, video or web page above.
          </p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  {TYPE_ICON[e.type] ?? <FileText className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" title={e.detail ?? e.label}>
                    {e.label}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span className="capitalize">{e.type}</span>
                    {e.chunks != null && <span>· {e.chunks} chunks</span>}
                    {e.segments != null && <span>· {e.segments} segments</span>}
                    <span>· {formatDuration(e.durationMs)}</span>
                    <span>· {timeAgo(e.createdAt)}</span>
                  </span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${e.label} from history`}
                  onClick={() => setPendingDelete(e)}
                  disabled={deleting === e.id}
                  className="cursor-pointer rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
                >
                  {deleting === e.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this source?"
        description={
          pendingDelete
            ? `“${pendingDelete.label}” will be removed from history and its vectors permanently deleted from the collection, so it stops appearing in answers. This cannot be undone.`
            : ""
        }
        confirmLabel="Remove"
        pending={deleting !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && remove(pendingDelete.id)}
      />
    </Card>
  );
}
