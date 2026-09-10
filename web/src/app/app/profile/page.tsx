import { ProfileForm } from "@/components/profile-form";

export const metadata = {
  title: "Profile — BaatCheetLLM",
};

export default function ProfilePage() {
  return (
    <main className="relative mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <ProfileForm />
    </main>
  );
}
