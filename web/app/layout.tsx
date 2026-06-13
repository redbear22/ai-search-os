import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { getSession } from "@/lib/session";
import { MainShell } from "@/components/layout/main-shell";
import { Toaster } from "sonner";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { OnboardingTour } from "@/components/OnboardingTour";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "AI Search OS",
    template: "%s | AI Search OS",
  },
  description:
    "Enterprise AI visibility platform. Audit, detect gaps, and fix your AI search presence.",
  keywords: [
    "AI search",
    "SEO",
    "brand visibility",
    "AI audit",
    "gap detection",
    "citation engine",
  ],
  authors: [{ name: "AI Search OS" }],
  openGraph: {
    title: "AI Search OS",
    description: "Take control of how AI sees your brand",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={cn("dark", inter.variable, spaceGrotesk.variable, jetbrainsMono.variable)}
      suppressHydrationWarning
    >
      <body className={cn(inter.className, "bg-background text-foreground")}>
        <Providers session={session}>
          <ErrorBoundary>
            <MainShell>{children}</MainShell>
          </ErrorBoundary>
          <Toaster
            position="top-right"
            richColors
            closeButton
            expand={false}
            duration={4000}
            toastOptions={{
              style: {
                background: "var(--background)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              },
              className: "rounded-lg shadow-lg",
            }}
          />
          <LoadingOverlay />
          <OnboardingTour />
        </Providers>
        {process.env.NODE_ENV === "production" ? (
          <GoogleAnalytics gaId="G-FQF0KK04JJ" />
        ) : null}
      </body>
    </html>
  );
}