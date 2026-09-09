"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignInButtonProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

export function SignInButton({ icon, children }: SignInButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="outline"
      className="h-11 w-full justify-center gap-2.5 text-sm transition-all hover:-translate-y-px hover:border-blue-500/60 hover:shadow-glow"
      type="submit"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </Button>
  );
}
