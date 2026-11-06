
import "./globals.css";
import type { Metadata } from "next";

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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
