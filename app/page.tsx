"use client";

import { useState } from "react";
import Welcome from "@/components/intro.tsx/Welcome";
import EmailIntelligence from "@/components/intro.tsx/EmailIntelligence";
import PriorityInbox from "@/components/intro.tsx/PriorityInbox";
import GetStarted from "@/components/intro.tsx/GetStarted";
import Inbox from "./HomePage.tsx/Inbox";
import { authClient } from "@/lib/auth-client";

type Step = 1 | 2 | 3 | 4 | "inbox";

export default function Page() {
  const [step, setStep] = useState<Step>(1);
  const [signOutError, setSignOutError] = useState("");
  const session = authClient.useSession();
  const currentStep: Step = session.data
    ? step === 4
      ? 4
      : "inbox"
    : step;

  if (session.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#030407] text-sm text-gray-400">
        Checking your session...
      </main>
    );
  }

  if (currentStep === 1) {
    return (
      <Welcome
        onNext={() => setStep(2)}
        onSkip={() => setStep(4)}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <EmailIntelligence
        onNext={() => setStep(3)}
        onBack={() => setStep(1)}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <PriorityInbox
        onNext={() => setStep(4)}
        onBack={() => setStep(2)}
      />
    );
  }

  if (currentStep === 4) {
    return (
      <GetStarted
        onBack={() => setStep(3)}
        onAuthSuccess={() => setStep("inbox")}
      />
    );
  }

  async function handleSignOut() {
    const { error } = await authClient.signOut();

    if (error) {
      setSignOutError(error.message ?? "Unable to sign out. Please try again.");
      return;
    }

    setSignOutError("");
    setStep(4);
  }

  if (!session.data) {
    return (
      <GetStarted
        onBack={() => setStep(3)}
        onAuthSuccess={() => setStep("inbox")}
      />
    );
  }

  return (
    <Inbox
      user={session.data.user}
      onSignOut={handleSignOut}
      signOutError={signOutError}
    />
  );
}