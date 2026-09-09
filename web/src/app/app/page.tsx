import { Database, MessageSquareText, FolderUp } from "lucide-react";
import { IndexingSection } from "@/components/indexing-section";
import { IndexHistory } from "@/components/index-history";
import { ChatSection } from "@/components/chat-section";
import { ModeToggle } from "@/components/mode-toggle";
import { SettingsDialog } from "@/components/settings-dialog";
import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/session";

export const metadata = {
  title: "Studio — BaatCheetLLM",
};

export default async function AppPage() {
  const user = await getSessionUser();
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      {/* Ambient neon-blue background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute -right-32 top-1/3 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-400/10" />
      </div>
      {/* Neon accent line */}
      <div aria-hidden className="h-0.5 bg-gradient-to-r from-blue-700 via-sky-400 to-blue-700" />
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
              <Database className="size-5" />
            </span>
            <div>
              <h1 className="text-lg leading-tight font-semibold tracking-tight">
                BaatCheetLLM
              </h1>
              <p className="text-xs text-muted-foreground">
                Index documents, then chat with them
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <Badge variant="secondary">
                <FolderUp /> multi-source
              </Badge>
              <Badge variant="secondary">
                <MessageSquareText /> grounded chat
              </Badge>
            </div>
            <ModeToggle />
            <SettingsDialog />
            <UserMenu
              name={user?.name}
              email={user?.email}
              image={user?.image}
            />
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <IndexingSection />
          <IndexHistory />
        </div>
        <div className="lg:col-span-3">
          <ChatSection />
        </div>
      </main>

      <footer className="relative border-t border-border">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
          Powered by OpenAI embeddings + Whisper, Qdrant vector search and
          Next.js.
        </p>
      </footer>
    </div>
  );
}
