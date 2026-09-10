import { IndexingSection } from "@/components/indexing-section";
import { IndexHistory } from "@/components/index-history";
import { ChatSection } from "@/components/chat-section";

export const metadata = {
  title: "Studio — BaatCheetLLM",
};

export default function AppPage() {
  return (
    <main className="relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-6 px-4 py-8 sm:px-6 lg:grid-cols-5">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <IndexingSection />
        <IndexHistory />
      </div>
      <div className="lg:col-span-3">
        <ChatSection />
      </div>
    </main>
  );
}
