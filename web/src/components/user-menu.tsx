"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { apiFetch } from "@/lib/api";
import { toast } from "@/lib/toast";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const router = useRouter();
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();
  const [confirming, setConfirming] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  async function signOut() {
    setLeaving(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      toast.success("Signed out. See you soon!");
      router.push("/login");
      router.refresh();
    } finally {
      setLeaving(false);
      setConfirming(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/app/profile"
        title="Manage profile"
        className="flex items-center gap-2 rounded-full pr-1 transition-colors hover:bg-accent"
      >
        {image ? (
          // Plain <img> avoids next/image remote-pattern config for OAuth avatars.
          <img
            src={image}
            alt={name ?? "User avatar"}
            className="size-9 rounded-full border border-border object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white">
            {initial}
          </span>
        )}
        <span className="hidden max-w-32 truncate text-sm font-medium md:block" title={email ?? name ?? ""}>
          {name ?? email}
        </span>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setConfirming(true)}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-4" />
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Sign out?"
        description="You'll need to sign in again to use BaatCheetLLM."
        confirmLabel="Sign out"
        pending={leaving}
        onCancel={() => setConfirming(false)}
        onConfirm={() => signOut()}
      />
    </div>
  );
}
