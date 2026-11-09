import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Inbound AI",
  description: "Privacy Policy for Inbound AI.",
};

const sections = [
  { id: "introduction", title: "1. Introduction" },
  { id: "information-we-collect", title: "2. Information We Collect" },
  { id: "google-user-data", title: "3. Google User Data and Gmail API Usage" },
  { id: "how-we-use-information", title: "4. How We Use Information" },
  { id: "ai-processing", title: "5. AI Processing and Third-Party Services" },
  { id: "storage-security", title: "6. Data Storage and Security" },
  { id: "data-retention", title: "7. Data Retention" },
  { id: "data-sharing", title: "8. Data Sharing" },
  { id: "user-rights", title: "9. User Rights and Data Deletion" },
  { id: "google-policy", title: "10. Google API Services User Data Policy" },
  { id: "children", title: "11. Children's Privacy" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact Information" },
];

export default function PrivacyPage() {
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
            Privacy Policy
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
            <nav aria-label="Privacy Policy sections" className="space-y-2 text-sm">
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
          <section id="introduction" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
            <p>
              Inbound AI is an AI-powered email workspace that helps users understand,
              organize, and act on their inbox using Google Gmail access, contextual
              email analysis, and AI-assisted drafting workflows.
            </p>
            <p>
              This Privacy Policy explains what information we collect, how it is used,
              how it is stored, and the choices available to users of the service.
            </p>
            <p>
              This policy applies to the Inbound AI application, its associated
              interfaces, backend services, Gmail synchronization workflows, and the
              features made available through the application.
            </p>
            <p>
              Effective date: <strong>November 10, 2026</strong>.<br />
              Last updated: <strong>November 10, 2026</strong>.
            </p>
          </section>

          <section id="information-we-collect" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
            <p>
              We collect the information needed to authenticate users, synchronize email data,
              and provide AI-assisted inbox functionality.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Account information:</strong> user identifiers, email address, authentication records, and account settings associated with the app.</li>
              <li><strong>Google account information:</strong> Google profile identity, Gmail authorization state, and OAuth tokens required to access Gmail and calendar APIs.</li>
              <li><strong>Gmail messages and metadata:</strong> sender, recipient, subject, thread identifiers, message timestamps, message bodies, HTML content, read/archive state, labels, and related metadata.</li>
              <li><strong>Calendar information:</strong> only when the user explicitly authorizes Google Calendar access for event drafting or calendar-related features.</li>
              <li><strong>User-generated content and AI interactions:</strong> email content, assistant prompts, selected email context, drafts, replies, summaries, and data used to power the AI assistant experience.</li>
              <li><strong>Technical information and logs:</strong> application logs, diagnostics, token expiry timestamps, request metadata, and error information needed to maintain reliability and security.</li>
            </ul>
          </section>

          <section id="google-user-data" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">3. Google User Data and Gmail API Usage</h2>
            <p>
              Inbound AI requests access to Google account data to enable inbox access,
              synchronization, calendar workflows, and AI-assisted email functionality.
              The current frontend OAuth configuration requests the following scopes:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>openid</strong> — verifies the user identity during sign-in and allows the app to confirm the authenticated Google account.</li>
              <li><strong>email</strong> — allows the app to access the user&apos;s primary email address for account linking and communication.</li>
              <li><strong>profile</strong> — allows the app to access basic profile information such as the account&apos;s name for personalization and account management.</li>
              <li><strong>https://www.googleapis.com/auth/gmail.readonly</strong> — allows reading Gmail message content, metadata, labels, and thread information so the app can retrieve, summarize, classify, and display the user&apos;s inbox.</li>
              <li><strong>https://www.googleapis.com/auth/gmail.modify</strong> — allows reading and updating Gmail state such as labels, read/unread status, archive state, and message synchronization operations needed for inbox management.</li>
              <li><strong>https://www.googleapis.com/auth/gmail.send</strong> — allows the app to send email using the user&apos;s Gmail account when the user explicitly authorizes an outbound message.</li>
              <li><strong>https://www.googleapis.com/auth/calendar.events</strong> — allows the app to create or update calendar events when the user chooses a scheduling workflow.</li>
            </ul>
            <p>
              These permissions are used to retrieve and process Gmail data, synchronize email
              content and metadata, update user-visible workflow state, and support calendar event
              creation when enabled by the user. The app does not request a Gmail compose scope
              beyond the current user-authorized Gmail send workflow.
            </p>
            <p>
              Email content and metadata are synchronized from Gmail to the backend, stored in the
              application database, and used by the assistant to answer questions, summarize messages,
              and generate reply drafts.
            </p>
            <p>
              When users authorize Gmail sending, the app can send a message through the user&apos;s
              authorized account. The user remains responsible for reviewing and authorizing any email
              before it is sent.
            </p>
            <p>
              Users can revoke access in their Google Account permissions settings at any time. The
              backend also stores token expiry data and refresh-token state as needed to maintain access
              for connected Gmail and calendar workflows.
            </p>
          </section>

          <section id="how-we-use-information" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">4. How We Use Information</h2>
            <p>
              We use the information we collect to operate the product and support the user
              experience. This includes:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Inbox organization and message retrieval.</li>
              <li>Email search and context lookup across stored messages.</li>
              <li>AI-powered summarization, classification, and contextual understanding through Gemini-based processing.</li>
              <li>Assistant-driven drafting and reply generation based on current email context.</li>
              <li>Calendar proposal generation and event-related workflows when authorized.</li>
              <li>Application reliability, debugging, service security, and operational monitoring.</li>
            </ul>
          </section>

          <section id="ai-processing" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">5. AI Processing and Third-Party Services</h2>
            <p>
              Inbound AI uses backend services and external providers to support email,
              authentication, and AI functionality. The implementation uses, at minimum:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Google APIs:</strong> Google OAuth, Gmail API, and Google Calendar APIs for authentication, email access, and calendar-related features.</li>
              <li><strong>Google Gemini:</strong> the backend uses Google Generative AI models to assist with email analysis, reply drafting, and task-oriented assistant workflows.</li>
              <li><strong>PostgreSQL:</strong> application data, user records, email records, and synchronization state are stored in the backend database.</li>
              <li><strong>Redis:</strong> used for queued background jobs and asynchronous job processing.</li>
              <li><strong>Hosting and infrastructure providers:</strong> the frontend and backend may rely on hosting infrastructure that processes operational metadata necessary to provide the service.</li>
            </ul>
            <p>
              Information transmitted to these third-party services may include the user&apos;s email content,
              message metadata, current context, and prompts required for AI processing. This includes
              user-controlled email context passed to the AI system for summarization, classification,
              drafting, and reply support.
            </p>
          </section>

          <section id="storage-security" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">6. Data Storage and Security</h2>
            <p>
              The backend stores user account records, Gmail access tokens, refresh tokens, token
              expiry timestamps, message metadata, email bodies, and assistant-related data in the
              application database. These records are linked to the relevant user account in the
              database schema.
            </p>
            <p>
              The app stores access and refresh tokens to keep Gmail synchronization and calendar
              operations working while the user remains signed in. Access to these systems is governed
              by the Google OAuth authorization flow and backend token handling configured for the app.
            </p>
            <p>
              We maintain operational safeguards, access controls, and monitoring practices in line
              with normal service operations; however, this policy does not promise a specific security
              certification or an encryption guarantee beyond the applicable transport and platform security
              controls used by the application and its hosted services.
            </p>
          </section>

          <section id="data-retention" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">7. Data Retention</h2>
            <p>
              The app does not identify a dedicated, user-facing retention schedule for all stored email
              data, access tokens, and related records. Data is retained while it remains necessary for the
              user&apos;s active account, feature functionality, synchronization operations, and system reliability.
            </p>
            <p>
              Gmail sync behavior and token refresh logic may continue to process data as long as the user
              remains connected and the system is operating normally. We do not promise a specific retention
              period or automated deletion guarantee beyond the operational requirements of the app.
            </p>
          </section>

          <section id="data-sharing" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">8. Data Sharing</h2>
            <p>
              Inbound AI does not sell user personal data. We share data only with the third parties
              necessary to operate the service and deliver the functionality requested by the user,
              including Google APIs and the backend AI and hosting infrastructure.
            </p>
            <p>
              This includes processing of Gmail data, calendar access, and AI prompts to support inbox
              understanding and drafting workflows. We do not identify additional broad public sharing
              practices in the codebase inspected.
            </p>
          </section>

          <section id="user-rights" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">9. User Rights and Data Deletion</h2>
            <p>
              Users may access and correct account information through the app and their Google account
              settings. Users may also revoke Google account permissions in the Google Account permissions panel.
            </p>
            <p>
              The current application code does not include a documented self-service account-deletion or
              data-erasure workflow that we can verify from the frontend and backend code inspected. If such a
              workflow is added in the future, it should be described in the product and this policy.
            </p>
            <p>
              To request information about your data, request deletion, or ask a question about your account,
              contact <a href="mailto:himanshubhagat080104@gmail.com" className="text-violet-300 underline underline-offset-4">himanshubhagat080104@gmail.com</a> or call +91 8109091279.
            </p>
          </section>

          <section id="google-policy" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">10. Google API Services User Data Policy</h2>
            <p>
              Inbound AI&apos;s use and transfer of information received from Google APIs will adhere to the
              Google API Services User Data Policy, including the Limited Use requirements.
            </p>
            <p>
              For the official policy, see:
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-violet-300 underline underline-offset-4"
              >
                https://developers.google.com/terms/api-services-user-data-policy
              </a>
            </p>
          </section>

          <section id="children" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">11. Children&apos;s Privacy</h2>
            <p>
              Inbound AI is not directed to children under the age of 13, and we do not knowingly collect
              personal information from children under that age without appropriate parental consent or as
              required by law.
            </p>
          </section>

          <section id="changes" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time to reflect changes in the service, legal
              requirements, or product functionality. Material changes will be communicated as appropriate
              through the application and the updated policy date.
            </p>
          </section>

          <section id="contact" className="scroll-mt-24 space-y-4 pb-8">
            <h2 className="text-2xl font-semibold text-white">13. Contact Information</h2>
            <p>
              If you have questions about this Privacy Policy, your data, or the use of Google account
              permissions, contact us at <a href="mailto:himanshubhagat080104@gmail.com" className="text-violet-300 underline underline-offset-4">himanshubhagat080104@gmail.com</a> or call +91 8109091279.
            </p>
          </section>
        </article>

      </div>
    </main>
  );
}
