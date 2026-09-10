import Link from "next/link";
import {
  Database,
  ArrowRight,
  FileText,
  AudioLines,
  Clapperboard,
  Globe,
  Quote,
  ListChecks,
  History,
  MoonStar,
  Lock,
  Zap,
} from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PipelineDiagram } from "@/components/pipeline-diagram";
import { PipelineExplorer } from "@/components/pipeline-explorer";
import { Reveal } from "@/components/reveal";

export const metadata = {
  title: "BaatCheetLLM — Chat with your documents",
  description:
    "Index PDFs, audio, video and web pages, then get grounded answers with citations.",
};

const SOURCES = [
  {
    icon: <FileText className="size-5" />,
    name: "PDFs",
    desc: "Books, papers and manuals — chunked page by page.",
  },
  {
    icon: <AudioLines className="size-5" />,
    name: "Audio",
    desc: "Podcasts and recordings transcribed with Whisper.",
  },
  {
    icon: <Clapperboard className="size-5" />,
    name: "Video",
    desc: "Audio extracted with ffmpeg, then transcribed.",
  },
  {
    icon: <Globe className="size-5" />,
    name: "Web pages",
    desc: "Articles fetched live and added to the collection.",
  },
];

const FEATURES = [
  {
    icon: <Quote className="size-5" />,
    title: "Cited answers",
    desc: "Every claim points to its source — page numbers, URLs and timestamps.",
  },
  {
    icon: <ListChecks className="size-5" />,
    title: "Live job tracking",
    desc: "Watch indexing progress with streaming logs, phase by phase.",
  },
  {
    icon: <History className="size-5" />,
    title: "Source history",
    desc: "Everything you indexed, listed with chunk counts and timing.",
  },
  {
    icon: <Zap className="size-5" />,
    title: "Millisecond search",
    desc: "Qdrant vector search across all your sources at once.",
  },
  {
    icon: <MoonStar className="size-5" />,
    title: "Dark & light",
    desc: "A neon-blue theme that looks sharp in both modes.",
  },
  {
    icon: <Lock className="size-5" />,
    title: "Private by default",
    desc: "Google / GitHub login guards your entire collection.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const ctaHref = user ? "/app" : "/login";
  const ctaLabel = user ? "Open BaatCheetLLM" : "Sign in to start";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background font-sans text-foreground">
      <div aria-hidden className="h-0.5 bg-gradient-to-r from-blue-700 via-sky-400 to-blue-700" />

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-glow">
              <Database className="size-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">BaatCheetLLM</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#sources" className="transition-colors hover:text-foreground">Sources</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <Button asChild>
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-drift absolute -top-24 left-1/4 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/20" />
          <div
            aria-hidden
            className="animate-drift absolute top-20 right-1/5 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl [animation-delay:-6s] dark:bg-sky-400/15"
          />
        </div>
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-4 pt-16 pb-10 text-center sm:px-6 md:pt-24">
          <Reveal>
            <Badge variant="secondary" className="mb-5">
              <Zap className="size-3" /> Multi-source RAG · grounded answers
            </Badge>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="max-w-3xl font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Talk to your{" "}
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 bg-clip-text text-transparent">
                documents
              </span>
              .
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Index PDFs, audio, video and web pages — then ask
              questions and get answers backed by exact citations.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="dark:shadow-glow">
                <Link href={ctaHref}>
                  {ctaLabel} <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#how">See how it works</a>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={400} className="mt-12 w-full">
            <div className="relative rounded-2xl border border-border bg-card/80 p-4 shadow-xl backdrop-blur sm:p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-r from-blue-600/20 via-sky-400/20 to-blue-600/20 blur-xl"
              />
              <PipelineDiagram />
              <span className="animate-float-y absolute top-6 left-6 hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm md:flex">
                <FileText className="size-3.5 text-blue-600 dark:text-blue-400" /> PDF · 447 pages indexed
              </span>
              <span className="animate-float-y absolute top-1/3 right-6 hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm [animation-delay:-1.6s] md:flex">
                <AudioLines className="size-3.5 text-blue-600 dark:text-blue-400" /> Whisper · timestamps kept
              </span>
              <span className="animate-float-y absolute bottom-6 left-10 hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm [animation-delay:-3s] md:flex">
                <Database className="size-3.5 text-blue-600 dark:text-blue-400" /> Qdrant · vectors stored
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Sources */}
      <section id="sources" className="relative mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Sources
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">Works with what you have</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Five ingest paths, one searchable collection with live progress and logs.
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s, i) => (
            <Reveal key={s.name} delay={i * 80}>
              <Card className="h-full transition-all hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-glow">
                <CardHeader className="gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {s.icon}
                  </span>
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <CardDescription className="text-xs">{s.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative scroll-mt-20 border-y border-border bg-muted/30 py-14">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
              How it works
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">
              From files to answers in eight steps
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Watch each stage animate — switch pipelines, click any step, hover to pause.
            </p>
          </Reveal>
          <Reveal delay={150} className="mt-8">
            <PipelineExplorer />
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <Reveal className="text-center">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Features
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">Built for real research</h2>
        </Reveal>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 80}>
              <Card className="h-full transition-all hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-glow">
                <CardHeader className="gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {f.icon}
                  </span>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription className="text-sm">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 px-6 py-12 text-center text-white shadow-glow sm:px-12">
            <div
              aria-hidden
              className="animate-drift pointer-events-none absolute -top-20 left-1/4 h-56 w-56 rounded-full bg-sky-400/30 blur-3xl"
            />
            <h2 className="relative font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Ready to baat-cheet with your data?
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-blue-100">
              Sign in, index your first source, and get a cited answer in minutes.
            </p>
            <Button size="lg" variant="secondary" asChild className="relative mt-6">
              <Link href={ctaHref}>
                {ctaLabel} <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-white">
              <Database className="size-3.5" />
            </span>
            <strong className="text-foreground">BaatCheetLLM</strong> — chat with your documents.
          </span>
          <span>OpenAI · Whisper · Qdrant · Next.js</span>
        </div>
      </footer>
    </div>
  );
}
