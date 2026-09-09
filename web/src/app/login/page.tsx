import Link from "next/link";
import { Database } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Sign in — BaatCheetLLM",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl dark:bg-blue-600/15" />
      </div>
      <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-700 via-sky-400 to-blue-700" />

      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
              <Database className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">BaatCheetLLM</span>
          </Link>
          <ModeToggle />
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10">
        <Card className="w-full max-w-sm overflow-hidden">
          <div aria-hidden className="h-1 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600" />
          <CardHeader className="items-center pb-2 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
              <Database className="size-7" />
            </span>
            <CardTitle className="text-2xl tracking-tight">Welcome to BaatCheetLLM</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {error && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <LoginForm />

            <p className="text-center text-[11px] text-muted-foreground">
              Passwords are hashed with bcrypt — we never store them in plain text.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
