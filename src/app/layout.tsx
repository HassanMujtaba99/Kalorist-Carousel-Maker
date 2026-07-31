import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { StackProvider, StackTheme } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kalorist Carousel Maker",
  description:
    "Build nutrition-education Instagram carousels with USDA-grounded calorie data and Gemini image generation.",
};

const kaloristTheme = {
  light: {
    background: "#faf6ec",
    foreground: "#14141a",
    card: "#ffffff",
    cardForeground: "#14141a",
    popover: "#ffffff",
    popoverForeground: "#14141a",
    primary: "#7c5cfc",
    primaryForeground: "#ffffff",
    secondary: "#c9f34c",
    secondaryForeground: "#14141a",
    muted: "#f0ece0",
    mutedForeground: "#6b6b6b",
    accent: "#c9f34c",
    accentForeground: "#14141a",
    destructive: "#dc2626",
    destructiveForeground: "#ffffff",
    border: "#14141a",
    input: "#ffffff",
    ring: "#7c5cfc",
  },
  radius: "1rem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <StackProvider app={stackServerApp}>
          <StackTheme theme={kaloristTheme}>{children}</StackTheme>
        </StackProvider>
      </body>
    </html>
  );
}
