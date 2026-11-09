import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Inbound AI",
  description: "Terms of Service for Inbound AI.",
};

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "description", title: "2. Description of Inbound AI" },
  { id: "eligibility", title: "3. User Eligibility" },
  { id: "account-registration", title: "4. Account Registration and Security" },
  { id: "google-authorization", title: "5. Google Account Authorization" },
  { id: "gmail-access", title: "6. Gmail Access and Permissions" },
  { id: "ai-generated-content", title: "7. AI-Generated Content Disclaimer" },
  { id: "user-responsibilities", title: "8. User Responsibilities" },
  { id: "acceptable-use", title: "9. Acceptable Use Policy" },
  { id: "email-sending", title: "10. Email Drafting and Sending Responsibilities" },
  { id: "third-party-services", title: "11. Third-Party Services" },
  { id: "intellectual-property", title: "12. Intellectual Property" },
  { id: "service-availability", title: "13. Service Availability" },
  { id: "liability", title: "14. Limitation of Liability" },
  { id: "termination", title: "15. Termination and Account Deletion" },
  { id: "changes", title: "16. Changes to Terms" },
  { id: "contact", title: "17. Contact Information" },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center text-sm text-violet-300 transition hover:text-violet-200"
          >
            ← Back to Inbound AI
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Terms of Service
          </h1>
        </div>
        <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-violet-200">
          Effective: November 10, 2026
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-[#0b0d14] p-4 shadow-lg shadow-violet-950/10">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Contents
            </p>
            <nav aria-label="Terms of Service sections" className="space-y-2 text-sm">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-slate-300 transition hover:text-violet-300 focus:outline-none focus-visible:text-violet-300"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="prose prose-invert max-w-3xl text-slate-200">
          <section id="acceptance" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By signing in, using Inbound AI, or otherwise interacting with the service, you agree
              to these Terms of Service and any policies referenced herein, including our Privacy Policy.
            </p>
            <p>
              If you do not agree with these terms, you should not access or use the application.
            </p>
          </section>

          <section id="description" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">2. Description of Inbound AI</h2>
            <p>
              Inbound AI is a web application designed to help users understand, organize, and act on
              their email inbox using AI-assisted summarization, search, drafting support, and Gmail-connected workflows.
            </p>
            <p>
              The platform integrates with Google APIs for email and calendar features and can provide
              AI-generated suggestions based on user email context and explicit user actions.
            </p>
          </section>

          <section id="eligibility" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">3. User Eligibility</h2>
            <p>
              You must be at least 13 years of age, or the minimum age required by the applicable law in your jurisdiction,
              to use the service.
            </p>
            <p>
              You are responsible for ensuring that your use of the service complies with all applicable laws and regulations.
            </p>
          </section>

          <section id="account-registration" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">4. Account Registration and Security</h2>
            <p>
              You are responsible for protecting your account credentials and the security of your Google
              account authorization. Do not share your sign-in information or allow others to access the service
              under your account.
            </p>
            <p>
              If you are using Google OAuth, the Google account and authorization settings control access to
              some service capabilities. You must maintain the security of your Google account and any device used to access the app.
            </p>
          </section>

          <section id="google-authorization" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">5. Google Account Authorization</h2>
            <p>
              Inbound AI may request access to your Google account to enable Gmail, calendar, and AI-enhanced email workflows.
              This access is granted by you through Google OAuth and may be revoked in your Google account settings.
            </p>
            <p>
              By granting access, you authorize the app to access the Gmail and calendar permissions required for the features you use,
              including message retrieval, synchronization, drafting, sending, calendar event management, and workflow automation.
            </p>
          </section>

          <section id="gmail-access" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">6. Gmail Access and Permissions</h2>
            <p>
              The app may access your Gmail account to read, organize, search, and process email data for features such as inbox
              organization, summaries, reply drafts, and AI assistance. This includes read-only access to message content and metadata,
              plus Gmail modification permissions needed to update labels, sync state, and message handling.
            </p>
            <p>
              The app may also use Gmail send permissions when you explicitly authorize an email action. Email sending is subject to
              your review and approval before the message is delivered.
            </p>
            <p>
              You remain responsible for the content of any email sent through the platform, including the accuracy, legality,
              and appropriateness of the outbound message.
            </p>
          </section>

          <section id="ai-generated-content" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">7. AI-Generated Content Disclaimer</h2>
            <p>
              Inbound AI may generate summaries, suggestions, draft replies, and other content using AI systems, including Google Gemini-based processing.
              AI-generated content may contain errors, omissions, misleading information, or formatting issues.
            </p>
            <p>
              You are responsible for reviewing and validating any AI-generated output before relying on it for business, legal,
              customer, or communication decisions.
            </p>
          </section>

          <section id="user-responsibilities" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">8. User Responsibilities</h2>
            <p>You agree to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the service only for lawful purposes.</li>
              <li>Not interfere with or disrupt the platform or related systems.</li>
              <li>Review and authorize sensitive email actions before they are performed.</li>
              <li>Respect the rights of others and avoid sending abusive, fraudulent, or unlawful messages.</li>
              <li>Review and verify AI-generated drafts and suggestions before sending, publishing, or acting on them.</li>
            </ul>
          </section>

          <section id="acceptable-use" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">9. Acceptable Use Policy</h2>
            <p>
              You may not use the service to distribute spam, malware, phishing content, deceptive communications, or other harmful content.
              You may not attempt to reverse engineer the service, bypass security controls, or misuse the Gmail, Google, or AI integrations.
            </p>
            <p>
              We reserve the right to suspend or restrict service access if a user violates applicable laws, platform policies,
              or security requirements.
            </p>
          </section>

          <section id="email-sending" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">10. Email Drafting and Sending Responsibilities</h2>
            <p>
              The platform may generate message drafts or summarize email content to help the user prepare communication. Draft creation and
              email sending are workflow features available only when you explicitly authorize the operation through your Google-connected account.
            </p>
            <p>
              You are solely responsible for ensuring that any sent message is accurate, lawful, appropriate, and consistent with your obligations
              to recipients, customers, partners, or third parties.
            </p>
          </section>

          <section id="third-party-services" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">11. Third-Party Services</h2>
            <p>
              Inbound AI relies on third-party services including Google APIs, AI model providers, hosting infrastructure, and backend infrastructure components.
              Their availability, performance, and terms are governed by those providers.
            </p>
            <p>
              We do not guarantee uninterrupted service or perfect AI accuracy. Service availability may vary based on provider uptime, network conditions,
              or maintenance events.
            </p>
          </section>

          <section id="intellectual-property" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">12. Intellectual Property</h2>
            <p>
              The application, branding, interface design, and product materials remain the property of the Inbound AI service and its applicable owners,
              unless otherwise stated.
            </p>
            <p>
              User content remains owned by the user, but the user grants the service the necessary rights to process the content to provide the requested
              features, including email analysis, search, drafting, and AI assistance.
            </p>
          </section>

          <section id="service-availability" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">13. Service Availability</h2>
            <p>
              The service is provided on an as-is basis and may be interrupted, delayed, unavailable, or limited due to maintenance, outages,
              provider issues, or other operational circumstances.
            </p>
            <p>
              We do not guarantee uninterrupted access, immediate processing, or perfect correctness of AI-generated results.
            </p>
          </section>

          <section id="liability" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">14. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Inbound AI is not liable for indirect, incidental, consequential, or special damages
              arising from the use of the service, including reliance on AI-generated suggestions or communication workflows.
            </p>
            <p>
              You use the service at your own risk, and you are responsible for reviewing output, data, and messages before sending or relying on them.
            </p>
          </section>

          <section id="termination" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">15. Termination and Account Deletion</h2>
            <p>
              We may suspend or terminate access to the service if a user violates these terms, applicable laws, or the security policies of the platform.
            </p>
            <p>
              The availability of account deletion or self-service account removal may vary by implementation and should be confirmed in the application,
              account settings, or support process.
            </p>
          </section>

          <section id="changes" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">16. Changes to Terms</h2>
            <p>
              We may revise these Terms of Service from time to time. Continued use of the service after changes are posted constitutes acceptance of the revised terms.
            </p>
          </section>

          <section id="contact" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">17. Contact Information</h2>
            <p>
              If you have questions about these Terms of Service or the use of the platform, contact us at
              <a href="mailto:himanshubhagat080104@gmail.com" className="text-violet-300 underline underline-offset-4"> himanshubhagat080104@gmail.com</a> or call +91 8109091279.
            </p>
            <p>
              We may update or clarify contact information as the service evolves, but this point of contact is the current support address for legal and product inquiries.
            </p>
          </section>
        </article>

      </div>
    </main>
  );
}
