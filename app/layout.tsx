import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RootProviders from "@/components/providers/RootProviders";
import { Toaster } from "@/components/ui/sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { NavbarWrapper } from "@/components/navbar/NavbarWrapper";
import { BoardHeaderWrapper } from "@/components/layout/BoardHeaderWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zendllo - Organize Your Work Like Never Before",
  description:
    "A powerful, intuitive productivity tool that helps you manage projects, track tasks, and collaborate with your team seamlessly. Built with modern technology for instant loading and smooth interactions.",
  keywords: [
    "productivity",
    "project management",
    "task tracking",
    "collaboration",
    "kanban",
    "boards",
  ],
  authors: [{ name: "Zendllo Team" }],
  openGraph: {
    title: "Zendllo - Organize Your Work Like Never Before",
    description:
      "A powerful, intuitive productivity tool that helps you manage projects, track tasks, and collaborate with your team seamlessly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      afterSignOutUrl="/sign-in"
      appearance={{
        elements: {
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-sm !shadow-none",
        },
      }}
    >
      <html
        lang="en"
        className="dark"
        style={{
          colorScheme: "dark",
        }}
      >
        <body
          className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <Toaster richColors position="bottom-right" />
          <RootProviders>
            <NavbarWrapper />
            <BoardHeaderWrapper />
            {children}
          </RootProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
