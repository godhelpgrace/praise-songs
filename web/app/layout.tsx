import type { Metadata } from "next";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { PresentationProvider } from "@/context/PresentationContext";
import { AuthProvider } from "@/context/AuthContext";
import PresentationPanel from "@/components/PresentationPanel";

export const metadata: Metadata = {
  title: "赞美吧 - 分享好听的基督教赞美诗歌",
  description: "赞美吧是一个提供在线听歌的非盈利性音乐平台。",
};

import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background text-foreground selection:bg-primary/30" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PlayerProvider>
              <PresentationProvider>
                {children}
                <PresentationPanel />
              </PresentationProvider>
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
