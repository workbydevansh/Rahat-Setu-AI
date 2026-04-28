import { AppPolicyFooter } from "@/components/AppPolicyFooter";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "RahatSetu AI",
    template: "%s | RahatSetu AI",
  },
  description:
    "Hackathon MVP for disaster relief coordination across NGOs, volunteers, donors, and crisis-specific resource matching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <ToastProvider>
          <div className="relative flex min-h-screen flex-col overflow-x-clip">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d4ed8,#079669,#d99720,#e5484d)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),transparent)]" />
            <Navbar />
            <main className="relative z-10 flex-1 animate-page-in">{children}</main>
            <AppPolicyFooter />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
