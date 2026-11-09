
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inbound AI",
  description: "A clearer inbox, powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col bg-[#030407] text-slate-100 antialiased">
        <div className="flex min-h-screen flex-col">{children}</div>

        <footer className="border-t border-white/10 bg-[#050816]/95">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p className="text-slate-400">© {new Date().getFullYear()} Inbound AI</p>

            <nav
              aria-label="Legal links"
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
            >
              <Link
                href="/privacy"
                className="transition hover:text-violet-300 focus:outline-none focus-visible:text-violet-300"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="transition hover:text-violet-300 focus:outline-none focus-visible:text-violet-300"
              >
                Terms of Service
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
