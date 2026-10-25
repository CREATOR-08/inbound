"use client";

import { useState } from "react";
import Welcome from "@/components/intro.tsx/Welcome";
import EmailIntelligence from "@/components/intro.tsx/EmailIntelligence";
import PriorityInbox from "@/components/intro.tsx/PriorityInbox";
import GetStarted from "@/components/intro.tsx/GetStarted";
import Inbox from "./HomePage.tsx/Inbox";
import { authClient } from "@/lib/auth-client";

type OnboardingStep = 1 | 2 | 3 | 4;

export default function Page() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [signOutError, setSignOutError] = useState("");
  const session = authClient.useSession();

  // 1. Session check in progress
  if (session.isPending) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#030407] text-sm text-gray-400">
        Checking your session...
      </main>
    );
  }

  // 2. Sign-out handler
  async function handleSignOut() {
    const { error } = await authClient.signOut();

    if (error) {
      setSignOutError(error.message ?? "Unable to sign out. Please try again.");
      return;
    }

    setSignOutError("");
    setStep(4); // Direct them straight to login step if they sign out
  }

  // 3. User is Authenticated -> Render Inbox directly
  if (session.data?.user) {
    return (
      <Inbox
        user={session.data.user}
        onSignOut={handleSignOut}
        signOutError={signOutError}
      />
    );
  }

  // 4. User is Not Authenticated -> Show Onboarding Steps
  if (step === 1) {
    return (
      <Welcome
        onNext={() => setStep(2)}
        onSkip={() => setStep(4)}
      />
    );
  }

  if (step === 2) {
    return (
      <EmailIntelligence
        onNext={() => setStep(3)}
        onBack={() => setStep(1)}
      />
    );
  }

  if (step === 3) {
    return (
      <PriorityInbox
        onNext={() => setStep(4)}
        onBack={() => setStep(2)}
      />
    );
  }

  return (
    <GetStarted
      onBack={() => setStep(3)}
      onAuthSuccess={() => {}}
    />
  );
}