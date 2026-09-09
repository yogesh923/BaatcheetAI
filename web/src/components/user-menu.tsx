"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function UserMenu({ name, email, image }: UserMenuProps) {
  const router = useRouter();
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="flex items-center gap-2">
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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => signOut()}
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
