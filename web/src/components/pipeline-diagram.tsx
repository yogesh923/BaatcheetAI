// Animated RAG-pipeline diagram (pure SVG + CSS, no JS).
// Row 1: indexing — Upload → Extract → Chunk → Embed → Vector DB.
// Row 2: querying — Ask → Retrieve → Answer.
// Rendered dimmed behind the login card as ambient background art.

const TITLE_CLASS = "fill-foreground text-[22px] font-semibold";
const SUB_CLASS = "fill-muted-foreground text-[15px]";

function Node({
  x,
  y,
  title,
  sub,
  delay,
  children,
}: {
  x: number;
  y: number;
  title: string;
  sub: string;
  delay: string;
  children: React.ReactNode;
}) {
  return (
    <g className="node-pulse" style={{ animationDelay: delay }}>
      <rect
        x={x}
        y={y}
        width={190}
        height={110}
        rx={16}
        className="fill-card stroke-blue-500/40"
        strokeWidth={1.5}
      />
      <g
        transform={`translate(${x + 24},${y + 20})`}
        className="stroke-blue-500 dark:stroke-blue-400"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
      <text x={x + 24} y={y + 66} className={TITLE_CLASS}>
        {title}
      </text>
      <text x={x + 24} y={y + 90} className={SUB_CLASS}>
        {sub}
      </text>
    </g>
  );
}

function Packet({ href, dur, begin }: { href: string; dur: string; begin: string }) {
  return (
    <circle r={5} className="fill-blue-500 dark:fill-blue-400" opacity={0.9}>
      <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
        <mpath href={href} />
      </animateMotion>
    </circle>
  );
}

export function PipelineDiagram() {
  return (
    <svg
      viewBox="0 0 1200 600"
      className="h-auto w-full"
      role="img"
      aria-label="How BaatCheetLLM works: upload sources, extract text, split into chunks, embed vectors, store in a vector database, then ask questions to retrieve grounded answers."
    >
      <defs>
        {/* Row-1 connectors */}
        <path id="yt-c1" d="M 222 125 H 256" />
        <path id="yt-c2" d="M 450 125 H 484" />
        <path id="yt-c3" d="M 678 125 H 712" />
        <path id="yt-c4" d="M 906 125 H 940" />
        {/* Return: vector DB down to the query row */}
        <path id="yt-c5" d="M 1037 182 C 1037 290 245 250 245 378" />
        {/* Row-2 connectors */}
        <path id="yt-c6" d="M 340 435 H 503" />
        <path id="yt-c7" d="M 695 435 H 858" />
        <marker
          id="yt-arrow"
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={7}
          markerHeight={7}
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9" fill="none" className="stroke-blue-500 dark:stroke-blue-400" strokeWidth={2} />
        </marker>
      </defs>

      {/* Row captions */}
      <text x={30} y={42} className="fill-muted-foreground text-[15px] font-medium tracking-[0.2em] uppercase">
        1 · Index once
      </text>
      <text x={150} y={352} className="fill-muted-foreground text-[15px] font-medium tracking-[0.2em] uppercase">
        2 · Ask anything
      </text>

      {/* Visible flow lines */}
      {["#yt-c1", "#yt-c2", "#yt-c3", "#yt-c4", "#yt-c5", "#yt-c6", "#yt-c7"].map((h) => (
        <use
          key={h}
          href={h}
          fill="none"
          markerEnd="url(#yt-arrow)"
          className="flow-line stroke-blue-500/70 dark:stroke-blue-400/70"
          strokeWidth={2.5}
        />
      ))}

      {/* Traveling data packets */}
      <Packet href="#yt-c1" dur="1.6s" begin="0s" />
      <Packet href="#yt-c2" dur="1.6s" begin="-0.5s" />
      <Packet href="#yt-c3" dur="1.6s" begin="-1s" />
      <Packet href="#yt-c4" dur="1.6s" begin="-0.2s" />
      <Packet href="#yt-c5" dur="3.2s" begin="0s" />
      <Packet href="#yt-c5" dur="3.2s" begin="-1.6s" />
      <Packet href="#yt-c6" dur="2s" begin="-0.4s" />
      <Packet href="#yt-c7" dur="2s" begin="-1.2s" />

      {/* Row 1 — indexing */}
      <Node x={30} y={70} title="Upload" sub="PDF · audio · video · URL" delay="0s">
        <path d="M 4 26 h 24" />
        <path d="M 16 2 v 16 M 10 12 l 6 -6 6 6" />
        <path d="M 4 26 v -6 h 24 v 6" />
      </Node>
      <Node x={258} y={70} title="Extract" sub="Whisper · PDF text" delay="-0.6s">
        <rect x={2} y={2} width={22} height={28} rx={3} />
        <path d="M 7 9 h 12 M 7 15 h 12 M 7 21 h 8" />
      </Node>
      <Node x={486} y={70} title="Chunk" sub="1000 chars · overlap" delay="-1.2s">
        <rect x={2} y={6} width={10} height={20} rx={2} />
        <rect x={14} y={6} width={10} height={20} rx={2} />
        <path d="M 28 6 h 4 M 28 13 h 4 M 28 20 h 4" />
      </Node>
      <Node x={714} y={70} title="Embed" sub="OpenAI vectors" delay="-1.8s">
        <circle cx={6} cy={7} r={3} />
        <circle cx={6} cy={23} r={3} />
        <circle cx={22} cy={15} r={3} />
        <path d="M 9 8 l 10 5 M 9 22 l 10 -5" />
      </Node>
      <Node x={942} y={70} title="Vector DB" sub="Qdrant store" delay="-2.4s">
        <ellipse cx={14} cy={7} rx={11} ry={4.5} />
        <path d="M 3 7 v 16 c 0 2.5 5 4.5 11 4.5 s 11 -2 11 -4.5 v -16" />
        <path d="M 3 15 c 0 2.5 5 4.5 11 4.5 s 11 -2 11 -4.5" />
      </Node>

      {/* Row 2 — querying */}
      <Node x={150} y={380} title="Ask" sub="your question" delay="-0.3s">
        <rect x={2} y={4} width={24} height={17} rx={5} />
        <path d="M 9 21 l -1 -5 5 1" />
        <text x={14} y={18} textAnchor="middle" fontSize={13} fontWeight={700} fill="currentColor" stroke="none">?</text>
      </Node>
      <Node x={505} y={380} title="Retrieve" sub="top-k search" delay="-0.9s">
        <circle cx={12} cy={12} r={8} />
        <path d="M 18 18 l 8 8" />
      </Node>
      <Node x={860} y={380} title="Answer" sub="cited reply" delay="-1.5s">
        <rect x={2} y={4} width={24} height={17} rx={5} />
        <path d="M 19 21 l 1 -5 -5 1" />
        <path d="M 8 12 l 3 3 6 -7" />
      </Node>
    </svg>
  );
}
