import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CyberGlobe — Real-Time Global Cyber Attack Visualization",
  description:
    "Monitor simulated cyber attacks happening across the world on an interactive 3D globe in real time. Track threat intelligence, attack patterns, and global security metrics.",
  keywords: [
    "cybersecurity",
    "3d globe",
    "threat visualization",
    "real-time attacks",
    "security dashboard",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#030308] text-white font-sans overflow-hidden">
        {children}
      </body>
    </html>
  );
}
