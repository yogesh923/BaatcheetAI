"use client";

import * as React from "react";
import { Loader2, CheckCircle2, Link2, Unlink } from "lucide-react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import { API_URL, apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Me {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  phone: string | null;
  gender: string | null;
  providers: string[];
  hasPassword: boolean;
}

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
] as const;

export function ProfileForm() {
  const [me, setMe] = React.useState<Me | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [unlinking, setUnlinking] = React.useState<string | null>(null);
  const [pendingUnlink, setPendingUnlink] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.user) {
        setMe(data.user);
        setName(data.user.name ?? "");
        setPhone(data.user.phone ?? "");
        setGender(data.user.gender ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
    // OAuth link results arrive as query params on return (?linked= / ?error=).
    const q = new URLSearchParams(window.location.search);
    const linked = q.get("linked");
    const err = q.get("error");
    if (linked) setNotice(`${linked === "google" ? "Google" : "GitHub"} account linked.`);
    else if (err) setError(err);
    if (linked || err) {
      window.history.replaceState(null, "", window.location.pathname);
      refresh();
    }
  }, [refresh]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, gender }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not save profile.");
      }
      setMe(data.user);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function unlink(provider: string) {
    setUnlinking(provider);
    try {
      const res = await apiFetch(`/api/auth/${provider}/unlink`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not unlink account.");
      }
      setPendingUnlink(null);
      setNotice(
        `${provider === "google" ? "Google" : "GitHub"} account removed.`
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlink account.");
      setPendingUnlink(null);
    } finally {
      setUnlinking(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading profile…
        </CardContent>
      </Card>
    );
  }

  if (!me) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Could not load your profile. Try signing in again.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Signed in as {me.email}. Changes save to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              {me.image ? (
                <img
                  src={me.image}
                  alt="Avatar"
                  className="size-14 rounded-full border border-border object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xl font-semibold text-white">
                  {(me.name ?? me.email).trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="text-sm">
                <p className="font-medium">{me.name ?? "No name set"}</p>
                <p className="text-muted-foreground">{me.email}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-phone" className="text-sm font-medium">
                  Phone <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="profile-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-gender" className="text-sm font-medium">
                  Gender
                </label>
                <select
                  id="profile-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-sm">
                {notice}
              </p>
            )}
            {saved && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" /> Profile saved.
              </p>
            )}

            <div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>
            Sign in with email + password
            {me.hasPassword ? (
              <>
                {" "}(set <Badge variant="secondary" className="ml-1">password on</Badge>)
              </>
            ) : (
              <> (no password set)</>
            )}{" "}
            or any linked provider below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {PROVIDERS.map((p) => {
            const linked = me.providers.includes(p.id);
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Link2 className="size-4 text-muted-foreground" />
                  {p.label}
                  {linked ? (
                    <Badge variant="secondary">connected</Badge>
                  ) : (
                    <Badge variant="outline">not connected</Badge>
                  )}
                </span>
                {linked ? (
                  <button
                    type="button"
                    onClick={() => setPendingUnlink(p.id)}
                    disabled={unlinking === p.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                      "text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
                    )}
                  >
                    {unlinking === p.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Unlink className="size-3.5" />
                    )}
                    Remove
                  </button>
                ) : (
                  <a
                    href={`${API_URL}/api/auth/${p.id}/link`}
                    className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                  >
                    Connect
                  </a>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            Removing your only sign-in method is blocked — set a password first.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pendingUnlink !== null}
        title={`Remove ${pendingUnlink === "google" ? "Google" : "GitHub"}?`}
        description="You will no longer be able to sign in with this account. Your data stays intact."
        confirmLabel="Remove"
        pending={unlinking !== null}
        onCancel={() => setPendingUnlink(null)}
        onConfirm={() => pendingUnlink && unlink(pendingUnlink)}
      />
    </div>
  );
}
