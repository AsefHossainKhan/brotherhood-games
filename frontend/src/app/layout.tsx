import type { Metadata } from "next";
import { ErrorToast } from "@/components/common/ErrorToast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brotherhood Games",
  description: "Multiplayer card game hub for the brotherhood",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className="min-h-screen bg-gray-950 text-gray-100 antialiased"
        suppressHydrationWarning
      >
        {children}
        <ErrorToast />
      </body>
    </html>
  );
}
